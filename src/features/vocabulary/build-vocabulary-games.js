const fs = require("fs");
const path = require("path");

const ROOT_DIR = path.resolve(__dirname, "../../..");
const SOURCE_PATH = path.join(ROOT_DIR, "data/tuvungsocap_1-8.json");
const OUTPUT_PATH = path.join(ROOT_DIR, "src/data/korean/generated/vocabulary-games.json");
const UNSPLASH_CACHE_PATH = path.join(ROOT_DIR, "src/data/korean/generated/vocabulary-unsplash-cache.json");
const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY ?? "";
const UNSPLASH_MAX_REQUESTS = Number(process.env.UNSPLASH_MAX_REQUESTS ?? 45);

const IMAGE_KEYWORDS = [
  ["trường", "school campus"],
  ["lớp", "classroom"],
  ["phòng học", "classroom"],
  ["thư viện", "library"],
  ["sách", "book"],
  ["bút", "pen"],
  ["bảng", "classroom board"],
  ["bàn", "table"],
  ["ghế", "chair"],
  ["cửa", "door"],
  ["cửa sổ", "window"],
  ["điện thoại", "phone"],
  ["tivi", "television"],
  ["máy ảnh", "camera"],
  ["radio", "radio"],
  ["máy tính", "computer"],
  ["nhà hàng", "restaurant"],
  ["quán ăn", "restaurant"],
  ["quán cà phê", "coffee shop"],
  ["cà phê", "coffee"],
  ["trà", "tea"],
  ["sữa", "milk"],
  ["nước", "water"],
  ["nước ép", "juice"],
  ["cola", "cola drink"],
  ["bánh", "cake"],
  ["bánh mì", "bread"],
  ["kem", "ice cream"],
  ["táo", "apple fruit"],
  ["dâu", "strawberry"],
  ["nho", "grapes"],
  ["xoài", "mango"],
  ["dưa hấu", "watermelon"],
  ["quýt", "tangerine"],
  ["lê", "pear fruit"],
  ["ớt", "chili pepper"],
  ["muối", "salt"],
  ["kim chi", "kimchi"],
  ["mì", "ramen noodles"],
  ["cơm", "rice bowl"],
  ["canh", "soup bowl"],
  ["thịt", "grilled meat"],
  ["cá", "fish"],
  ["rau", "vegetables"],
  ["món ăn", "korean food"],
  ["thức ăn", "korean food"],
  ["động vật", "animals"],
  ["con chó", "dog"],
  ["con mèo", "cat"],
  ["chim", "bird"],
  ["cây", "tree"],
  ["núi", "mountain"],
  ["biển", "sea beach"],
  ["công viên", "park"],
  ["sân vận động", "stadium"],
  ["bệnh viện", "hospital"],
  ["ngân hàng", "bank building"],
  ["bưu điện", "post office"],
  ["hiệu sách", "bookstore"],
  ["hiệu thuốc", "pharmacy"],
  ["cửa hàng", "store"],
  ["siêu thị", "supermarket"],
  ["chợ", "market"],
  ["quần", "pants"],
  ["váy", "skirt"],
  ["áo", "shirt"],
  ["giày", "shoes"],
  ["mũ", "hat"],
  ["túi", "bag"],
  ["đồng hồ", "clock"],
  ["ô tô", "car"],
  ["xe hơi", "car"],
  ["tàu", "boat"],
  ["sân bay", "airport"],
  ["hoa", "flower"],
  ["gia đình", "family"],
  ["mẹ", "mother"],
  ["cha", "father"],
  ["anh", "family"],
  ["chị", "family"],
  ["em", "family"],
];

const ABSTRACT_TERMS = [
  "gì",
  "đâu",
  "ai",
  "này",
  "đó",
  "kia",
  "vâng",
  "không",
  "rất",
  "nhiều",
  "ít",
  "luôn",
  "thường",
  "một chút",
  "nhanh",
  "sau",
  "trước",
  "và",
  "rồi",
  "mã",
  "quốc tịch",
  "tên",
  "email",
  "ví dụ",
  "nghề",
  "ngữ pháp",
  "đại từ",
  "tính từ",
  "giờ",
  "phút",
  "giây",
];

const NON_VISUAL_MEANINGS = [
  "đất nước",
  "quốc gia",
  "quốc tịch",
  "ngành học",
  "khoa",
  "ngữ văn",
];

function slugify(value) {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function normalizeMeaning(value) {
  return String(value ?? "")
    .split("/")
    .map(part => part.trim())
    .filter(Boolean)
    .join(" / ");
}

function normalizeSearchText(value) {
  return String(value ?? "")
    .toLowerCase();
}

function containsTerm(text, term) {
  const normalizedText = normalizeSearchText(text);
  const normalizedTerm = normalizeSearchText(term).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^\\p{L}\\p{N}])${normalizedTerm}([^\\p{L}\\p{N}]|$)`, "iu").test(normalizedText);
}

function parseLessonName(name) {
  const match = name.match(/Bài\s+(\d+)/i);
  if (!match) return null;
  const lesson = Number(match[1]);
  const koreanTitle = name.match(/\((.+)\)/)?.[1] ?? "";
  return {
    lesson,
    lessonTitle: `Bài ${String(lesson).padStart(2, "0")}${koreanTitle ? ` - ${koreanTitle}` : ""}`,
  };
}

function isPhrase(item) {
  return item.t === "phrase" || /[ .?()]/.test(item.w) || item.w.length > 8;
}

function getImageQuery(item) {
  const meaning = normalizeMeaning(item.m).toLowerCase();
  if (NON_VISUAL_MEANINGS.some(term => containsTerm(meaning, term))) return "";
  if (/^nước\s+/i.test(meaning) && !containsTerm(meaning, "nước ép") && !containsTerm(meaning, "nước ngọt") && !containsTerm(meaning, "nước giải khát")) {
    return "country flag";
  }
  const found = IMAGE_KEYWORDS.find(([vi]) => containsTerm(meaning, vi));
  if (found) return found[1];
  return "";
}

function isImageable(item, imageQuery) {
  if (item.t !== "n" && item.t !== "num") return false;
  if (!imageQuery) return false;
  if (isPhrase(item)) return false;
  const meaning = normalizeMeaning(item.m).toLowerCase();
  return !ABSTRACT_TERMS.some(term => containsTerm(meaning, term));
}

function fallbackImageUrlFor(query, id) {
  if (!query) return "";
  const lock = Number(id.replace(/\D/g, "")) || 1;
  return `https://loremflickr.com/640/480/${encodeURIComponent(query.replace(/\s+/g, ","))}?lock=${lock}`;
}

function emptyImageFields() {
  return {
    imageUrl: "",
    imageThumbUrl: "",
    imageSource: "",
    imageAuthorName: "",
    imageAuthorUrl: "",
    imagePageUrl: "",
    unsplashDownloadLocation: "",
  };
}

function fallbackImageFields(query, id) {
  const imageUrl = fallbackImageUrlFor(query, id);
  return {
    imageUrl,
    imageThumbUrl: imageUrl,
    imageSource: imageUrl ? "loremflickr" : "",
    imageAuthorName: "",
    imageAuthorUrl: "",
    imagePageUrl: "",
    unsplashDownloadLocation: "",
  };
}

function readUnsplashCache() {
  if (!fs.existsSync(UNSPLASH_CACHE_PATH)) return {};
  return JSON.parse(fs.readFileSync(UNSPLASH_CACHE_PATH, "utf8"));
}

function writeUnsplashCache(cache) {
  fs.mkdirSync(path.dirname(UNSPLASH_CACHE_PATH), { recursive: true });
  fs.writeFileSync(UNSPLASH_CACHE_PATH, `${JSON.stringify(cache, null, 2)}\n`, "utf8");
}

function unsplashQueryFor(item) {
  if (item.imageQuery === "country flag") {
    return `${item.meaningVi.replace(/^Nước\s+/i, "").split("/")[0].trim()} flag`;
  }
  return item.imageQuery;
}

function unsplashFieldsFromPhoto(photo) {
  return {
    imageUrl: photo.urls?.regular ?? photo.urls?.small ?? "",
    imageThumbUrl: photo.urls?.small ?? photo.urls?.thumb ?? photo.urls?.regular ?? "",
    imageSource: "unsplash",
    imageAuthorName: photo.user?.name ?? "",
    imageAuthorUrl: photo.user?.links?.html ?? "",
    imagePageUrl: photo.links?.html ?? "",
    unsplashDownloadLocation: photo.links?.download_location ?? "",
  };
}

async function searchUnsplashPhoto(query, accessKey) {
  const params = new URLSearchParams({
    query,
    per_page: "1",
    orientation: "landscape",
    content_filter: "high",
  });
  const response = await fetch(`https://api.unsplash.com/search/photos?${params}`, {
    headers: {
      Authorization: `Client-ID ${accessKey}`,
      "Accept-Version": "v1",
    },
  });

  if (!response.ok) {
    const error = new Error(`Unsplash ${response.status} for query "${query}"`);
    error.status = response.status;
    throw error;
  }

  const payload = await response.json();
  return payload.results?.[0] ?? null;
}

async function enrichWithUnsplashImages(data, accessKey = UNSPLASH_ACCESS_KEY) {
  if (!accessKey) return data;

  const cache = readUnsplashCache();
  let cacheChanged = false;
  let enrichedCount = 0;
  let requestCount = 0;

  for (const item of data.items) {
    if (!item.isImageable || !item.imageQuery) continue;
    const query = unsplashQueryFor(item);
    const cacheKey = `${item.id}:${query}`;

    if (!cache[cacheKey]) {
      if (requestCount >= UNSPLASH_MAX_REQUESTS) {
        console.log(`Unsplash request cap reached: ${requestCount}/${UNSPLASH_MAX_REQUESTS}. Run again after the hourly limit resets.`);
        break;
      }
      try {
        requestCount += 1;
        const photo = await searchUnsplashPhoto(query, accessKey);
        cache[cacheKey] = photo ? unsplashFieldsFromPhoto(photo) : emptyImageFields();
        cacheChanged = true;
      } catch (error) {
        if (error.status === 401 || error.status === 403) {
          console.warn(`${error.message}. Check or regenerate UNSPLASH_ACCESS_KEY. Stopping Unsplash enrichment.`);
          break;
        }
        console.warn(`${item.id}: ${error.message}. Keeping fallback image URL.`);
        continue;
      }
    }

    if (cache[cacheKey]?.imageUrl) {
      Object.assign(item, cache[cacheKey]);
      enrichedCount += 1;
    }
  }

  if (cacheChanged) writeUnsplashCache(cache);
  data.totals.imageableItems = data.items.filter(item => item.isImageable && item.imageUrl).length;
  data.totals.unsplashItems = enrichedCount;
  data.totals.unsplashRequestsThisRun = requestCount;
  data.totals.unsplashCachedQueries = Object.keys(cache).length;
  return data;
}

function difficultyFor(item) {
  const phrase = isPhrase(item);
  if (phrase || item.w.length > 7) return "hard";
  if (item.w.length > 4 || item.t === "v" || item.t === "adj") return "medium";
  return "easy";
}

function buildChoiceModes(items) {
  return {
    flashcard: items.map(item => item.id),
    listening: items.map(item => item.id),
  };
}

function buildPracticePool(items) {
  return {
    matching: items.map(item => item.id),
    letterArrange: items
      .filter(item => !item.isPhrase && item.korean.length >= 2 && item.korean.length <= 6)
      .map(item => item.id),
    typing: items
      .filter(item => item.korean.length <= 8)
      .map(item => item.id),
  };
}

function buildChallengePool(items) {
  return {
    marathon: items.map(item => item.id),
  };
}

function buildVocabularyGames() {
  const source = JSON.parse(fs.readFileSync(SOURCE_PATH, "utf8"));
  const items = [];
  const lessonPools = {};

  for (const [rawLessonName, entries] of Object.entries(source.data)) {
    const parsed = parseLessonName(rawLessonName);
    if (!parsed || parsed.lesson < 1 || parsed.lesson > 8) continue;

    const lessonItems = entries.map((entry, index) => {
      const id = `VOC_L${String(parsed.lesson).padStart(2, "0")}_${String(index + 1).padStart(3, "0")}`;
      return {
        id,
        lesson: parsed.lesson,
        lessonTitle: parsed.lessonTitle,
        korean: entry.w,
        meaningVi: normalizeMeaning(entry.m),
        partOfSpeech: entry.t,
        antonymText: entry.a ?? null,
        isPhrase: isPhrase(entry),
        isImageable: false,
        imageQuery: "",
        ...emptyImageFields(),
        audioText: entry.w,
        difficulty: difficultyFor(entry),
      };
    });

    items.push(...lessonItems);
    lessonPools[String(parsed.lesson)] = {
      lesson: parsed.lesson,
      lessonTitle: parsed.lessonTitle,
      itemIds: lessonItems.map(item => item.id),
      modes: buildChoiceModes(lessonItems),
    };
  }

  return {
    version: 3,
    sourceRef: "data/tuvungsocap_1-8.json",
    generatedAt: new Date(fs.statSync(SOURCE_PATH).mtimeMs).toISOString(),
    course: source.course,
    totals: {
      lessons: Object.keys(lessonPools).length,
      items: items.length,
      imageableItems: items.filter(item => item.isImageable && item.imageUrl).length,
      unsplashItems: items.filter(item => item.imageSource === "unsplash").length,
      unsplashRequestsThisRun: 0,
      unsplashCachedQueries: fs.existsSync(UNSPLASH_CACHE_PATH) ? Object.keys(readUnsplashCache()).length : 0,
    },
    items,
    lessonPools,
    practicePool: buildPracticePool(items),
    challengePool: buildChallengePool(items),
    gameConfig: {
      flashcardChunkSize: 12,
      matchingPairRange: [8, 12],
      marathonSeconds: 45,
      marathonCorrectBonusSeconds: 5,
      marathonWrongPenaltySeconds: 3,
      speechLang: "ko-KR",
    },
  };
}

function validateVocabularyGames(data) {
  const errors = [];
  const ids = new Set();
  const required = [
    "id",
    "lesson",
    "lessonTitle",
    "korean",
    "meaningVi",
    "partOfSpeech",
    "isPhrase",
    "isImageable",
    "imageQuery",
    "imageUrl",
    "imageThumbUrl",
    "imageSource",
    "imageAuthorName",
    "imageAuthorUrl",
    "imagePageUrl",
    "unsplashDownloadLocation",
    "audioText",
    "difficulty",
  ];

  for (const item of data.items) {
    for (const key of required) {
      if (!(key in item)) errors.push(`${item.id ?? "unknown"} missing ${key}`);
    }
    if (ids.has(item.id)) errors.push(`duplicate id ${item.id}`);
    ids.add(item.id);
    if (item.lesson < 1 || item.lesson > 8) errors.push(`${item.id} has invalid lesson`);
    if (item.imageSource === "unsplash" && (!item.imageAuthorName || !item.imagePageUrl)) {
      errors.push(`${item.id} unsplash image missing attribution`);
    }
    if (!["easy", "medium", "hard"].includes(item.difficulty)) errors.push(`${item.id} invalid difficulty`);
  }

  for (const lesson of [1, 2, 3, 4, 5, 6, 7, 8]) {
    const pool = data.lessonPools[String(lesson)];
    if (!pool) errors.push(`missing lesson pool ${lesson}`);
    const invalid = pool?.itemIds.filter(id => !ids.has(id)) ?? [];
    if (invalid.length) errors.push(`lesson ${lesson} references missing ids ${invalid.join(", ")}`);
  }

  const poolRefs = [
    ...Object.values(data.practicePool).flat(),
    ...data.challengePool.marathon,
  ];
  for (const id of poolRefs) {
    if (!ids.has(id)) errors.push(`pool references missing id ${id}`);
  }

  return errors;
}

async function main() {
  const data = buildVocabularyGames();

  const errors = validateVocabularyGames(data);
  if (errors.length) {
    console.error(errors.join("\n"));
    process.exit(1);
  }
  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  console.log(`Wrote ${OUTPUT_PATH}`);
  console.log(`Items: ${data.totals.items}, imageable: ${data.totals.imageableItems}, unsplash: ${data.totals.unsplashItems}`);
}

if (require.main === module) {
  main().catch(error => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = {
  buildVocabularyGames,
  enrichWithUnsplashImages,
  validateVocabularyGames,
};
