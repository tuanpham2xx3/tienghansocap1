const fs = require("fs");
const https = require("https");
const path = require("path");

const ROOT_DIR = path.resolve(__dirname, "../../..");
const DEFAULT_INPUT = path.join(ROOT_DIR, "data/tuvungsocap_1-8.json");
const DEFAULT_OUTPUT = path.join(ROOT_DIR, "src/data/korean/generated/vocabulary-krdict-enriched.json");
const DEFAULT_REPORT = path.join(ROOT_DIR, "src/data/korean/generated/vocabulary-krdict-enrichment-report.json");
const DEFAULT_CACHE = path.join(ROOT_DIR, "src/data/korean/generated/vocabulary-krdict-cache.json");

const KRDICT_SEARCH_URL = "https://krdict.korean.go.kr/api/search";
const KRDICT_VIEW_URL = "https://krdict.korean.go.kr/api/view";

const POS_HINTS = {
  n: ["명사", "의존 명사"],
  v: ["동사"],
  adj: ["형용사"],
  adv: ["부사"],
  pron: ["대명사"],
  num: ["수사", "의존 명사"],
  conj: ["접속 부사", "부사"],
  excl: ["감탄사"],
  phrase: [],
};

const IMAGE_MEDIA_TYPES = new Set(["사진", "삽화", "그림"]);

function parseArgs(argv) {
  const args = {
    input: DEFAULT_INPUT,
    output: DEFAULT_OUTPUT,
    report: DEFAULT_REPORT,
    cache: DEFAULT_CACHE,
    limit: 0,
    offset: 0,
    delayMs: 250,
    retries: 2,
  };

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === "--input") args.input = path.resolve(next), index += 1;
    else if (arg === "--output") args.output = path.resolve(next), index += 1;
    else if (arg === "--report") args.report = path.resolve(next), index += 1;
    else if (arg === "--cache") args.cache = path.resolve(next), index += 1;
    else if (arg === "--limit") args.limit = Number(next) || 0, index += 1;
    else if (arg === "--offset") args.offset = Number(next) || 0, index += 1;
    else if (arg === "--delay-ms") args.delayMs = Number(next) || 0, index += 1;
    else if (arg === "--retries") args.retries = Number(next) || 0, index += 1;
    else if (arg === "--help") {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return args;
}

function printHelp() {
  console.log(`Usage:
  KRDICT_API_KEY=... node src/features/vocabulary/enrich-vocabulary-with-krdict.js [options]

Options:
  --input <path>       Source vocabulary JSON. Default: data/tuvungsocap_1-8.json
  --output <path>      Enriched output JSON. Default: src/data/korean/generated/vocabulary-krdict-enriched.json
  --report <path>      Report output JSON. Default: src/data/korean/generated/vocabulary-krdict-enrichment-report.json
  --cache <path>       KRDICT response cache JSON.
  --limit <number>     Process only N items for smoke tests.
  --offset <number>    Skip first N flattened vocabulary items.
  --delay-ms <number>  Delay between uncached API calls. Default: 250
  --retries <number>   Retry network errors. Default: 2`);
}

function readJson(filePath, fallback = null) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, payload) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function decodeXml(value) {
  return String(value ?? "")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .trim();
}

function textOf(xml, tag) {
  const match = String(xml ?? "").match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match ? decodeXml(match[1]) : "";
}

function blocksOf(xml, tag) {
  return [...String(xml ?? "").matchAll(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "gi"))]
    .map(match => match[1]);
}

function normalizeForMatch(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9가-힣]+/g, " ")
    .trim();
}

function meaningTokens(value) {
  const stop = new Set(["la", "cua", "ve", "mot", "cac", "va", "hoac", "trong", "cho", "toi", "ban"]);
  return normalizeForMatch(value)
    .split(/\s+/)
    .filter(token => token.length > 1 && !stop.has(token));
}

function primaryMeaning(value) {
  return String(value ?? "").split("/")[0].replace(/\([^)]*\)/g, "").trim();
}

function cleanKoreanQuery(value) {
  return String(value ?? "")
    .replace(/\([^)]*\)/g, "")
    .replace(/[.?!。！？]\s*$/g, "")
    .trim();
}

function queryCandidates(word) {
  const clean = cleanKoreanQuery(word);
  const noObjectParticle = clean.replace(/(을|를)\s+하다$/, "하다");
  return [...new Set([word, clean, noObjectParticle].map(item => String(item).trim()).filter(Boolean))];
}

function flattenSource(source) {
  const items = [];
  for (const [rawLessonName, entries] of Object.entries(source.data ?? {})) {
    const parsed = rawLessonName.match(/Bài\s+(\d+)/i);
    if (!parsed) continue;
    const lesson = Number(parsed[1]);
    if (lesson < 1 || lesson > 8) continue;
    const koreanTitle = rawLessonName.match(/\((.+)\)/)?.[1] ?? "";
    entries.forEach((entry, index) => {
      items.push({
        id: `VOC_L${String(lesson).padStart(2, "0")}_${String(index + 1).padStart(3, "0")}`,
        lesson,
        lessonTitle: `Bài ${String(lesson).padStart(2, "0")}${koreanTitle ? ` - ${koreanTitle}` : ""}`,
        source: entry,
        korean: entry.w,
        meaningVi: entry.m,
        partOfSpeech: entry.t,
      });
    });
  }
  return items;
}

function cacheKey(endpoint, params) {
  const safeParams = { ...params };
  delete safeParams.key;
  return `${endpoint}:${new URLSearchParams(safeParams).toString()}`;
}

function requestText(url, params, timeoutMs = 20000) {
  const requestUrl = `${url}?${new URLSearchParams(params).toString()}`;
  return new Promise((resolve, reject) => {
    const request = https.get(
      requestUrl,
      {
        headers: {
          "Accept": "application/xml,text/xml,*/*",
          "User-Agent": "tienghan-ck-vocab-enricher/1.0",
        },
        timeout: timeoutMs,
      },
      response => {
        const chunks = [];
        response.on("data", chunk => chunks.push(chunk));
        response.on("end", () => {
          const body = Buffer.concat(chunks).toString("utf8");
          if (response.statusCode < 200 || response.statusCode >= 300) {
            const error = new Error(`KRDICT HTTP ${response.statusCode}`);
            error.body = body;
            reject(error);
            return;
          }
          resolve(body);
        });
      },
    );
    request.on("timeout", () => {
      request.destroy(new Error("KRDICT request timeout"));
    });
    request.on("error", reject);
  });
}

async function cachedRequest(cache, endpointName, url, params, options) {
  const key = cacheKey(endpointName, params);
  if (cache[key]) return { text: cache[key].text, cached: true };

  let lastError;
  for (let attempt = 0; attempt <= options.retries; attempt += 1) {
    try {
      const text = await requestText(url, params);
      cache[key] = { text, retrievedAt: new Date().toISOString() };
      if (options.delayMs) await sleep(options.delayMs);
      return { text, cached: false };
    } catch (error) {
      lastError = error;
      if (attempt < options.retries) await sleep(500 * (attempt + 1));
    }
  }

  throw lastError;
}

function parseKrdictError(xml) {
  if (!/<error[\s>]/i.test(xml)) return null;
  return {
    code: textOf(xml, "error_code"),
    message: textOf(xml, "message"),
  };
}

function parseTranslations(senseBlock) {
  return blocksOf(senseBlock, "translation").map(block => ({
    transLang: textOf(block, "trans_lang"),
    transWord: textOf(block, "trans_word"),
    transDfn: textOf(block, "trans_dfn"),
  }));
}

function parseSearchItems(xml) {
  const apiError = parseKrdictError(xml);
  if (apiError) {
    const error = new Error(`${apiError.code} ${apiError.message}`.trim());
    error.apiError = apiError;
    throw error;
  }

  return blocksOf(xml, "item").map(block => {
    const senses = blocksOf(block, "sense").map(sense => ({
      senseOrder: Number(textOf(sense, "sense_order")) || null,
      definition: textOf(sense, "definition"),
      translations: parseTranslations(sense),
    }));
    return {
      targetCode: textOf(block, "target_code"),
      word: textOf(block, "word"),
      supNo: textOf(block, "sup_no"),
      pronunciation: textOf(block, "pronunciation"),
      wordGrade: textOf(block, "word_grade"),
      pos: textOf(block, "pos"),
      link: textOf(block, "link"),
      senses,
    };
  });
}

function parseViewItem(xml) {
  const apiError = parseKrdictError(xml);
  if (apiError) {
    const error = new Error(`${apiError.code} ${apiError.message}`.trim());
    error.apiError = apiError;
    throw error;
  }

  const item = blocksOf(xml, "item")[0] ?? "";
  const wordInfo = blocksOf(item, "word_info")[0] ?? item;
  const pronunciations = blocksOf(wordInfo, "pronunciation_info")
    .map(block => textOf(block, "pronunciation"))
    .filter(Boolean);
  const senses = blocksOf(wordInfo, "sense_info").map((sense, index) => ({
    senseOrder: index + 1,
    definition: textOf(sense, "definition"),
    translations: parseTranslations(sense),
    examples: blocksOf(sense, "example_info").map(block => ({
      type: textOf(block, "type"),
      ko: textOf(block, "example"),
      vi: "",
      koSource: "krdict",
      viSource: "missing",
    })).filter(example => example.ko),
  }));
  const examples = blocksOf(wordInfo, "example_info").map(block => ({
    type: textOf(block, "type"),
    ko: textOf(block, "example"),
    vi: "",
    koSource: "krdict",
    viSource: "missing",
  })).filter(example => example.ko);
  const media = blocksOf(wordInfo, "multimedia_info").map(block => ({
    label: textOf(block, "label"),
    type: textOf(block, "type"),
    url: textOf(block, "link"),
    source: "krdict",
  })).filter(item => item.url);
  const image = media.find(item => IMAGE_MEDIA_TYPES.has(item.type)) ?? null;

  return {
    targetCode: textOf(item, "target_code"),
    word: textOf(wordInfo, "word"),
    supNo: textOf(wordInfo, "sup_no"),
    wordUnit: textOf(wordInfo, "word_unit"),
    pos: textOf(wordInfo, "pos"),
    wordType: textOf(wordInfo, "word_type"),
    wordGrade: textOf(wordInfo, "word_grade"),
    pronunciations,
    senses,
    examples: examples.slice(0, 2),
    media,
    image,
  };
}

function scoreCandidate(candidate, item, query) {
  let score = 0;
  if (candidate.word === item.korean) score += 100;
  if (candidate.word === query) score += 80;
  if (cleanKoreanQuery(candidate.word) === cleanKoreanQuery(item.korean)) score += 60;
  if (POS_HINTS[item.partOfSpeech]?.includes(candidate.pos)) score += 20;

  const tokens = meaningTokens(item.meaningVi);
  const primaryTokens = meaningTokens(primaryMeaning(item.meaningVi));
  const searchable = normalizeForMatch([
    candidate.word,
    candidate.pos,
    ...candidate.senses.flatMap(sense => [
      sense.definition,
      ...sense.translations.flatMap(translation => [translation.transWord, translation.transDfn]),
    ]),
  ].join(" "));
  const primarySearch = normalizeForMatch([
    ...candidate.senses.flatMap(sense => sense.translations.flatMap(translation => [translation.transWord, translation.transDfn])),
  ].join(" "));
  const normalizedPrimary = normalizeForMatch(primaryMeaning(item.meaningVi));
  const translatedWords = candidate.senses.flatMap(sense => sense.translations.map(translation => normalizeForMatch(translation.transWord)));
  if (normalizedPrimary && translatedWords.some(word => word === normalizedPrimary || word.includes(normalizedPrimary) || normalizedPrimary.includes(word))) {
    score += 80;
  }
  for (const token of primaryTokens) {
    if (primarySearch.includes(token)) score += 25;
  }
  for (const token of tokens) {
    if (searchable.includes(token)) score += 3;
  }
  return score;
}

function selectBestCandidate(candidates, item, query) {
  const exactish = candidates.filter(candidate => (
    candidate.word === item.korean ||
    candidate.word === query ||
    cleanKoreanQuery(candidate.word) === cleanKoreanQuery(item.korean)
  ));
  const pool = exactish.length ? exactish : candidates;
  const ranked = pool
    .map(candidate => ({ ...candidate, matchScore: scoreCandidate(candidate, item, query) }))
    .sort((a, b) => b.matchScore - a.matchScore);
  const best = ranked[0] ?? null;
  const second = ranked[1] ?? null;
  const needsReview = Boolean(best && second && best.matchScore - second.matchScore < 10);
  return { best, ranked, needsReview };
}

function mergeKrdictData(item, searchCandidate, viewData, notes, needsReview) {
  const selectedSense = viewData.senses[0] ?? searchCandidate.senses[0] ?? null;
  const viTranslation = selectedSense?.translations?.find(translation => (
    translation.transLang === "베트남어" || translation.transLang === "베트남어(7)"
  )) ?? selectedSense?.translations?.[0] ?? null;
  const examples = (viewData.examples.length ? viewData.examples : selectedSense?.examples ?? []).slice(0, 2);
  if (!examples.length) notes.push("KRDICT không trả câu ví dụ phù hợp");
  if (!viewData.image) notes.push("KRDICT không cung cấp ảnh phù hợp");
  if (!viTranslation?.transDfn && !viTranslation?.transWord) {
    needsReview = true;
    notes.push("KRDICT không trả nghĩa tiếng Việt; cần agent dịch/review nếu dùng làm nghĩa chính");
  }
  if (examples.some(example => !example.vi)) {
    needsReview = true;
    notes.push("Câu ví dụ KRDICT chưa có bản dịch Việt; cần agent dịch trước khi dùng cho flashcard");
  }

  return {
    id: item.id,
    lesson: item.lesson,
    lessonTitle: item.lessonTitle,
    korean: item.korean,
    meaningVi: item.meaningVi,
    partOfSpeech: item.partOfSpeech,
    source: item.source,
    krdict: {
      word: viewData.word || searchCandidate.word,
      targetCode: viewData.targetCode || searchCandidate.targetCode,
      pos: viewData.pos || searchCandidate.pos,
      wordGrade: viewData.wordGrade || searchCandidate.wordGrade,
      pronunciation: viewData.pronunciations[0] || searchCandidate.pronunciation || "",
      definitionKo: selectedSense?.definition ?? "",
      translationVi: {
        word: viTranslation?.transWord ?? "",
        definition: viTranslation?.transDfn ?? "",
        source: viTranslation ? "krdict_vi" : "missing",
      },
      examples,
      image: viewData.image,
      media: viewData.media,
      link: searchCandidate.link || "",
    },
    dictionarySource: {
      provider: "krdict",
      targetCode: viewData.targetCode || searchCandidate.targetCode,
      matchedSenseOrder: selectedSense?.senseOrder ?? null,
      meaningSource: viTranslation ? "krdict_vi" : "missing",
      retrievedAt: new Date().toISOString(),
    },
    enrichment: {
      status: "enriched",
      needsReview,
      notes,
    },
  };
}

async function enrichItem(item, cache, key, options) {
  const notes = [];
  const candidatesByQuery = [];

  for (const query of queryCandidates(item.korean)) {
    const searchParams = {
      key,
      q: query,
      part: "word",
      method: "exact",
      translated: "y",
      trans_lang: "7",
      num: "10",
    };
    const { text } = await cachedRequest(cache, "search", KRDICT_SEARCH_URL, searchParams, options);
    const candidates = parseSearchItems(text);
    candidatesByQuery.push({ query, candidates });
    if (candidates.length) {
      const { best, ranked, needsReview } = selectBestCandidate(candidates, item, query);
      if (!best?.targetCode) continue;
      const viewParams = {
        key,
        method: "target_code",
        q: best.targetCode,
        translated: "y",
        trans_lang: "7",
      };
      const viewResponse = await cachedRequest(cache, "view", KRDICT_VIEW_URL, viewParams, options);
      const viewData = parseViewItem(viewResponse.text);
      if (needsReview) notes.push("Nhiều candidate gần điểm nhau; cần review sense");
      return mergeKrdictData(item, best, viewData, notes, needsReview);
    }
  }

  return {
    id: item.id,
    lesson: item.lesson,
    lessonTitle: item.lessonTitle,
    korean: item.korean,
    meaningVi: item.meaningVi,
    partOfSpeech: item.partOfSpeech,
    source: item.source,
    krdict: null,
    dictionarySource: {
      provider: "krdict",
      targetCode: "",
      matchedSenseOrder: null,
      meaningSource: "missing",
      retrievedAt: new Date().toISOString(),
    },
    enrichment: {
      status: "not_found",
      needsReview: true,
      notes: [
        "KRDICT search không trả candidate exact phù hợp",
        ...candidatesByQuery.map(result => `query="${result.query}" candidates=${result.candidates.length}`),
      ],
    },
  };
}

function createReport(inputFile, outputFile, items, failedItems) {
  const summary = {
    total: items.length + failedItems.length,
    enriched: items.filter(item => item.enrichment.status === "enriched").length,
    notFound: items.filter(item => item.enrichment.status === "not_found").length,
    withImage: items.filter(item => item.krdict?.image).length,
    withoutImage: items.filter(item => item.krdict && !item.krdict.image).length,
    withExamples: items.filter(item => item.krdict?.examples?.length).length,
    missingVietnameseExampleTranslation: items.filter(item => item.krdict?.examples?.some(example => !example.vi)).length,
    needsReview: items.filter(item => item.enrichment.needsReview).length,
    failed: failedItems.length,
  };
  return {
    inputFile,
    outputFile,
    generatedAt: new Date().toISOString(),
    summary,
    reviewItems: items
      .filter(item => item.enrichment.needsReview)
      .map(item => ({
        id: item.id,
        word: item.korean,
        meaningVi: item.meaningVi,
        status: item.enrichment.status,
        notes: item.enrichment.notes,
      })),
    failedItems,
  };
}

async function main() {
  const args = parseArgs(process.argv);
  const key = process.env.KRDICT_API_KEY;
  if (!key) {
    throw new Error("KRDICT_API_KEY is required. Set it in the shell environment; do not hardcode it in source.");
  }

  const source = readJson(args.input);
  const allItems = flattenSource(source);
  const selectedItems = allItems.slice(args.offset, args.limit ? args.offset + args.limit : undefined);
  const cache = readJson(args.cache, {});
  const enrichedItems = [];
  const failedItems = [];

  for (let index = 0; index < selectedItems.length; index += 1) {
    const item = selectedItems[index];
    process.stdout.write(`[${index + 1}/${selectedItems.length}] ${item.id} ${item.korean} ... `);
    try {
      const enriched = await enrichItem(item, cache, key, args);
      enrichedItems.push(enriched);
      console.log(enriched.enrichment.status + (enriched.enrichment.needsReview ? " review" : ""));
    } catch (error) {
      failedItems.push({
        id: item.id,
        word: item.korean,
        meaningVi: item.meaningVi,
        error: error.message,
        apiError: error.apiError ?? null,
      });
      console.log(`failed: ${error.message}`);
    }
    writeJson(args.cache, cache);
  }

  const output = {
    version: 1,
    sourceRef: path.relative(ROOT_DIR, args.input).replace(/\\/g, "/"),
    provider: "krdict",
    generatedAt: new Date().toISOString(),
    itemRange: {
      offset: args.offset,
      limit: args.limit || null,
      processed: selectedItems.length,
      totalSourceItems: allItems.length,
    },
    items: enrichedItems,
  };
  const report = createReport(args.input, args.output, enrichedItems, failedItems);

  writeJson(args.output, output);
  writeJson(args.report, report);
  writeJson(args.cache, cache);

  console.log(`Wrote ${args.output}`);
  console.log(`Wrote ${args.report}`);
  console.log(JSON.stringify(report.summary, null, 2));
  if (failedItems.length) process.exitCode = 1;
}

if (require.main === module) {
  main().catch(error => {
    console.error(error.message);
    process.exit(1);
  });
}

module.exports = {
  cleanKoreanQuery,
  flattenSource,
  parseSearchItems,
  parseViewItem,
  queryCandidates,
  scoreCandidate,
  selectBestCandidate,
};
