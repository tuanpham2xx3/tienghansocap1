const GRAMMAR_PATH = "../data/nguphapsc_1-8.json";

const MODES = [
  { id: "summary", label: "Tổng hợp ngữ pháp" },
  { id: "lecture", label: "Ngữ pháp qua bài giảng" },
  { id: "conjugation", label: "Bảng chia động/tính từ" },
];

const LECTURE_VIDEOS = {
  "Bài 01": ["https://www.youtube.com/embed/AbDCZ2ZR4U0?si=v0WjXwm-m1BLBE5X"],
  "Bài 02": ["https://www.youtube.com/embed/h5XasQaI3mo?si=8SbxfZCzPS7CvNFr"],
  "Bài 03": ["https://www.youtube.com/embed/h5XasQaI3mo?si=dJGGZPU7sVkFJ-zD"],
  "Bài 04": ["https://www.youtube.com/embed/sWgK8m140K0?si=TyCYqCJVJygFUwUu"],
  "Bài 05": [
    "https://www.youtube.com/embed/XsokqQwcit4?si=zsGu1l7YbZnbDinD",
    "https://www.youtube.com/embed/wxmaoXFpoMs?si=X54N7m0sXYWSbU-5",
    "https://www.youtube.com/embed/UGauIyy2kC4?si=8ZRaW54KYhnaS8iM",
  ],
  "Bài 06": [
    "https://www.youtube.com/embed/_ZKaI5BsX6s?si=VRYhybn5Mhjz596y",
    "https://www.youtube.com/embed/7aJ8iLcX_rw?si=N_s-YHxM34rwoFr2",
  ],
  "Bài 07": ["https://www.youtube.com/embed/7aJ8iLcX_rw?si=kUy-w-eqwsF-sLZ_"],
  "Bài 08": ["https://www.youtube.com/embed/uZ262Pwyiwg?si=8QOI397MBkCOoCoK"],
};

const CONJUGATION_WORDS = [
  { word: "끄다", type: "verb", meaning: "tắt" },
  { word: "알다", type: "verb", meaning: "biết" },
  { word: "팔다", type: "verb", meaning: "bán" },
  { word: "끊다", type: "verb", meaning: "cắt, ngắt" },
  { word: "찍다", type: "verb", meaning: "chụp, đóng dấu" },
  { word: "도착하다", type: "verb", meaning: "đến nơi" },
  { word: "생각하다", type: "verb", meaning: "suy nghĩ" },
  { word: "돕다", type: "verb", meaning: "giúp" },
  { word: "알아보다", type: "verb", meaning: "tìm hiểu" },
  { word: "사다", type: "verb", meaning: "mua" },
  { word: "다니다", type: "verb", meaning: "đi lại, theo học" },
  { word: "받다", type: "verb", meaning: "nhận" },
  { word: "마시다", type: "verb", meaning: "uống" },
  { word: "먹다", type: "verb", meaning: "ăn" },
  { word: "연락하다", type: "verb", meaning: "liên lạc" },
  { word: "걷다", type: "verb", meaning: "đi bộ" },
  { word: "보내다", type: "verb", meaning: "gửi, tiễn" },
  { word: "닫다", type: "verb", meaning: "đóng" },
  { word: "열다", type: "verb", meaning: "mở" },
  { word: "남기다", type: "verb", meaning: "để lại" },
  { word: "출발하다", type: "verb", meaning: "xuất phát" },
  { word: "취소하다", type: "verb", meaning: "hủy" },
  { word: "앉다", type: "verb", meaning: "ngồi" },
  { word: "좋다", type: "adjective", meaning: "tốt, thích" },
  { word: "기쁘다", type: "adjective", meaning: "vui mừng" },
  { word: "즐겁다", type: "adjective", meaning: "vui vẻ" },
  { word: "예쁘다", type: "adjective", meaning: "đẹp" },
  { word: "아름답다", type: "adjective", meaning: "xinh đẹp" },
  { word: "비싸다", type: "adjective", meaning: "đắt" },
  { word: "크다", type: "adjective", meaning: "to, lớn" },
];

const CONJUGATION_COLUMNS = [
  { key: "formal", label: "ㅂ/습니다" },
  { key: "polite", label: "-아/어요" },
  { key: "past", label: "았/었어요" },
  { key: "propositive", label: "ㅂ/읍시다", verbOnly: true },
  { key: "future", label: "-(으)ㄹ 거예요" },
  { key: "connector", label: "-아/어서" },
  { key: "command", label: "-(으)세요", verbOnly: true },
  { key: "suggestion", label: "-(으)ㄹ까요", verbOnly: true },
  { key: "ability", label: "-(으)ㄹ 수 있다/없다", verbOnly: true },
  { key: "honorific", label: "(으)시다" },
  { key: "purpose", label: "-(으)러 가다", verbOnly: true },
  { key: "intention", label: "-(으)려고 하다", verbOnly: true },
];

const POLITE_FORMS = {
  끄다: "꺼요",
  알다: "알아요",
  팔다: "팔아요",
  끊다: "끊어요",
  찍다: "찍어요",
  도착하다: "도착해요",
  생각하다: "생각해요",
  돕다: "도와요",
  알아보다: "알아봐요",
  사다: "사요",
  다니다: "다녀요",
  받다: "받아요",
  마시다: "마셔요",
  먹다: "먹어요",
  연락하다: "연락해요",
  걷다: "걸어요",
  보내다: "보내요",
  닫다: "닫아요",
  열다: "열어요",
  남기다: "남겨요",
  출발하다: "출발해요",
  취소하다: "취소해요",
  앉다: "앉아요",
  좋다: "좋아요",
  기쁘다: "기뻐요",
  즐겁다: "즐거워요",
  예쁘다: "예뻐요",
  아름답다: "아름다워요",
  비싸다: "비싸요",
  크다: "커요",
};

const PAST_FORMS = {
  끄다: "껐어요",
  알다: "알았어요",
  팔다: "팔았어요",
  끊다: "끊었어요",
  찍다: "찍었어요",
  도착하다: "도착했어요",
  생각하다: "생각했어요",
  돕다: "도왔어요",
  알아보다: "알아봤어요",
  사다: "샀어요",
  다니다: "다녔어요",
  받다: "받았어요",
  마시다: "마셨어요",
  먹다: "먹었어요",
  연락하다: "연락했어요",
  걷다: "걸었어요",
  보내다: "보냈어요",
  닫다: "닫았어요",
  열다: "열었어요",
  남기다: "남겼어요",
  출발하다: "출발했어요",
  취소하다: "취소했어요",
  앉다: "앉았어요",
  좋다: "좋았어요",
  기쁘다: "기뻤어요",
  즐겁다: "즐거웠어요",
  예쁘다: "예뻤어요",
  아름답다: "아름다웠어요",
  비싸다: "비쌌어요",
  크다: "컸어요",
};

const CONNECTOR_FORMS = {
  끄다: "꺼서",
  알다: "알아서",
  팔다: "팔아서",
  끊다: "끊어서",
  찍다: "찍어서",
  도착하다: "도착해서",
  생각하다: "생각해서",
  돕다: "도와서",
  알아보다: "알아봐서",
  사다: "사서",
  다니다: "다녀서",
  받다: "받아서",
  마시다: "마셔서",
  먹다: "먹어서",
  연락하다: "연락해서",
  걷다: "걸어서",
  보내다: "보내서",
  닫다: "닫아서",
  열다: "열어서",
  남기다: "남겨서",
  출발하다: "출발해서",
  취소하다: "취소해서",
  앉다: "앉아서",
  좋다: "좋아서",
  기쁘다: "기뻐서",
  즐겁다: "즐거워서",
  예쁘다: "예뻐서",
  아름답다: "아름다워서",
  비싸다: "비싸서",
  크다: "커서",
};

const CONJUGATION_OVERRIDES = {
  걷다: {
    propositive: "걸읍시다",
    future: "걸을 거예요",
    command: "걸으세요",
    suggestion: "걸을까요",
    ability: "걸을 수 있다 / 걸을 수 없다",
    honorific: "걸으시다",
    purpose: "걸으러 가다",
    intention: "걸으려고 하다",
  },
  돕다: {
    propositive: "도웁시다",
    future: "도울 거예요",
    command: "도우세요",
    suggestion: "도울까요",
    ability: "도울 수 있다 / 도울 수 없다",
    honorific: "도우시다",
    purpose: "도우러 가다",
    intention: "도우려고 하다",
  },
  즐겁다: {
    future: "즐거울 거예요",
    honorific: "즐거우시다",
  },
  아름답다: {
    future: "아름다울 거예요",
    honorific: "아름다우시다",
  },
};

const state = {
  data: null,
  mode: "summary",
  selectedLessonIndex: 0,
  query: "",
};

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function youtubeEmbedUrl(urlOrId) {
  const value = String(urlOrId ?? "").trim();
  if (!value) return "";
  const idPatterns = [
    /youtu\.be\/([a-zA-Z0-9_-]{6,})/,
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{6,})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{6,})/,
    /^([a-zA-Z0-9_-]{6,})$/,
  ];
  const matched = idPatterns
    .map(pattern => value.match(pattern)?.[1])
    .find(Boolean);
  return matched ? `https://www.youtube.com/embed/${matched}` : "";
}

function renderLectureVideos(lesson) {
  const videos = (LECTURE_VIDEOS[lesson.lesson] ?? [])
    .map(youtubeEmbedUrl)
    .filter(Boolean);

  if (!videos.length) {
    return `
      <div class="mt-5 rounded-xl border border-[#D9CBB8] bg-white p-5">
        <div class="text-sm font-extrabold text-[#262422]">Video bài giảng</div>
        <p class="mt-2 text-sm font-semibold text-[#6B625C]">Bài này chưa gắn video YouTube.</p>
      </div>
    `;
  }

  return `
    <div class="mt-5 grid gap-4 ${videos.length > 1 ? "xl:grid-cols-2" : ""}">
      ${videos.map((src, index) => `
        <section class="overflow-hidden rounded-xl border border-[#D6D3CD] bg-white shadow-sm">
          <div class="flex items-center justify-between border-b border-[#D6D3CD] px-4 py-3">
            <div class="text-sm font-extrabold text-[#262422]">Video bài giảng${videos.length > 1 ? ` ${index + 1}` : ""}</div>
            <a class="text-xs font-bold text-[#2F5D50] underline decoration-[#2F5D50]/30 underline-offset-4" href="${escapeHtml(src)}" target="_blank" rel="noreferrer">Mở YouTube</a>
          </div>
          <div class="aspect-video bg-[#262422]">
            <iframe
              class="h-full w-full"
              src="${escapeHtml(src)}"
              title="YouTube video bài giảng ${escapeHtml(lesson.lesson)}"
              frameborder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerpolicy="strict-origin-when-cross-origin"
              allowfullscreen
            ></iframe>
          </div>
        </section>
      `).join("")}
    </div>
  `;
}

async function loadJson(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Không tải được ${path}`);
  return response.json();
}

function allPoints() {
  return state.data.grammar_list.flatMap((lesson, lessonIndex) =>
    lesson.grammar_points.map((point, pointIndex) => ({
      ...point,
      lesson: lesson.lesson,
      lessonIndex,
      pointIndex,
    })),
  );
}

function normalized(value) {
  return String(value ?? "").toLowerCase();
}

function filteredPoints() {
  const query = normalized(state.query).trim();
  const points = allPoints();
  if (!query) return points;
  return points.filter(point =>
    [point.lesson, point.grammar, point.meaning, point.explanation, point.example_kr, point.example_vn]
      .some(value => normalized(value).includes(query)),
  );
}

function lastChar(value) {
  return Array.from(value).at(-1) ?? "";
}

function stemOf(dictionaryForm) {
  return dictionaryForm.endsWith("다") ? dictionaryForm.slice(0, -1) : dictionaryForm;
}

function hasBatchim(syllable) {
  const code = syllable.charCodeAt(0);
  if (code < 0xac00 || code > 0xd7a3) return false;
  return (code - 0xac00) % 28 !== 0;
}

function jongIndex(syllable) {
  const code = syllable.charCodeAt(0);
  if (code < 0xac00 || code > 0xd7a3) return 0;
  return (code - 0xac00) % 28;
}

function removeFinalConsonant(syllable) {
  const code = syllable.charCodeAt(0);
  if (code < 0xac00 || code > 0xd7a3) return syllable;
  return String.fromCharCode(code - jongIndex(syllable));
}

function addFinalConsonant(syllable, jongIndex) {
  const code = syllable.charCodeAt(0);
  if (code < 0xac00 || code > 0xd7a3) return syllable;
  return String.fromCharCode(code + jongIndex);
}

function stemInfo(dictionaryForm) {
  const stem = stemOf(dictionaryForm);
  const last = lastChar(stem);
  const jong = jongIndex(last);
  return {
    stem,
    last,
    jong,
    hasBatchim: jong !== 0,
    hasLBatchim: jong === 8,
  };
}

function formalPresent(dictionaryForm) {
  if (dictionaryForm.endsWith("하다")) return `${dictionaryForm.slice(0, -2)}합니다`;
  const { stem, last, hasBatchim, hasLBatchim } = stemInfo(dictionaryForm);
  if (hasLBatchim) return `${stem.slice(0, -1)}${addFinalConsonant(removeFinalConsonant(last), 17)}니다`;
  if (hasBatchim) return `${stem}습니다`;
  return `${stem.slice(0, -1)}${addFinalConsonant(last, 17)}니다`;
}

function politeBase(dictionaryForm) {
  if (POLITE_FORMS[dictionaryForm]) return POLITE_FORMS[dictionaryForm];

  const stem = stemOf(dictionaryForm);
  if (dictionaryForm.endsWith("하다")) return `${dictionaryForm.slice(0, -2)}해요`;

  const last = lastChar(stem);
  if (stem.endsWith("으")) return `${stem.slice(0, -1)}어요`;
  if (stem.endsWith("아") || stem.endsWith("오")) return `${stem}아요`;
  if (stem.endsWith("어") || stem.endsWith("여")) return `${stem}요`;
  if (hasBatchim(last)) {
    const vowelCode = (last.charCodeAt(0) - 0xac00) % 588;
    const jungIndex = Math.floor(vowelCode / 28);
    return `${stem}${[0, 8].includes(jungIndex) ? "아요" : "어요"}`;
  }
  return `${stem}어요`;
}

function politePast(dictionaryForm) {
  if (PAST_FORMS[dictionaryForm]) return PAST_FORMS[dictionaryForm];

  const present = politeBase(dictionaryForm);
  if (present.endsWith("해요")) return `${present.slice(0, -2)}했어요`;
  if (present.endsWith("아요")) return `${present.slice(0, -2)}았어요`;
  if (present.endsWith("어요")) return `${present.slice(0, -2)}었어요`;
  if (present.endsWith("요")) return `${present.slice(0, -1)}어요`;
  return `${stemOf(dictionaryForm)}었어요`;
}

function connectorForm(dictionaryForm) {
  if (CONNECTOR_FORMS[dictionaryForm]) return CONNECTOR_FORMS[dictionaryForm];
  const present = politeBase(dictionaryForm);
  if (present.endsWith("해요")) return `${present.slice(0, -2)}해서`;
  if (present.endsWith("아요") || present.endsWith("어요")) return `${present.slice(0, -2)}서`;
  return `${stemOf(dictionaryForm)}어서`;
}

function lDropStem(stem, last) {
  return `${stem.slice(0, -1)}${removeFinalConsonant(last)}`;
}

function attachBEnding(dictionaryForm, suffixWithoutIeung, suffixWithIeung) {
  const { stem, last, hasBatchim, hasLBatchim } = stemInfo(dictionaryForm);
  if (hasLBatchim) return `${stem.slice(0, -1)}${addFinalConsonant(removeFinalConsonant(last), 17)}${suffixWithoutIeung}`;
  if (hasBatchim) return `${stem}${suffixWithIeung}`;
  return `${stem.slice(0, -1)}${addFinalConsonant(last, 17)}${suffixWithoutIeung}`;
}

function attachEuEnding(dictionaryForm, noBatchimSuffix, batchimSuffix) {
  const { stem, last, hasBatchim, hasLBatchim } = stemInfo(dictionaryForm);
  if (hasLBatchim) return `${lDropStem(stem, last)}${noBatchimSuffix}`;
  if (hasBatchim) return `${stem}${batchimSuffix}`;
  return `${stem}${noBatchimSuffix}`;
}

function attachFutureEnding(dictionaryForm, suffix) {
  const separator = suffix === "까요" ? "" : " ";
  const { stem, last, hasBatchim, hasLBatchim } = stemInfo(dictionaryForm);
  if (hasLBatchim) return `${stem}${separator}${suffix}`;
  if (hasBatchim) return `${stem}을${separator}${suffix}`;
  return `${stem.slice(0, -1)}${addFinalConsonant(last, 8)}${separator}${suffix}`;
}

function conjugationCell(item, column) {
  if (column.verbOnly && item.type !== "verb") return "×";
  if (CONJUGATION_OVERRIDES[item.word]?.[column.key]) return CONJUGATION_OVERRIDES[item.word][column.key];
  if (column.key === "formal") return formalPresent(item.word);
  if (column.key === "polite") return politeBase(item.word);
  if (column.key === "past") return politePast(item.word);
  if (column.key === "propositive") return attachBEnding(item.word, "시다", "읍시다");
  if (column.key === "future") return attachFutureEnding(item.word, "거예요");
  if (column.key === "connector") return connectorForm(item.word);
  if (column.key === "command") return attachEuEnding(item.word, "세요", "으세요");
  if (column.key === "suggestion") return attachFutureEnding(item.word, "까요");
  if (column.key === "ability") return `${attachFutureEnding(item.word, "수 있다")} / ${attachFutureEnding(item.word, "수 없다")}`;
  if (column.key === "honorific") return attachEuEnding(item.word, "시다", "으시다");
  if (column.key === "purpose") return attachEuEnding(item.word, "러 가다", "으러 가다");
  if (column.key === "intention") return attachEuEnding(item.word, "려고 하다", "으려고 하다");
  return "";
}

function renderModeTabs() {
  document.getElementById("modeTabs").innerHTML = MODES.map(mode => {
    const isActive = state.mode === mode.id;
    const cls = isActive
      ? "border-[#2F5D50] bg-[#EEF6F2] text-[#2F5D50]"
      : "border-[#D6D3CD] bg-white text-[#262422] hover:border-[#2F5D50] hover:bg-[#F5F4F0]";
    return `
      <button type="button" class="mode-button rounded-lg border px-3 py-3 text-left text-sm font-extrabold ${cls}" data-mode="${mode.id}">
        ${escapeHtml(mode.label)}
      </button>
    `;
  }).join("");
}

function renderLessonSelect() {
  const select = document.getElementById("lessonSelect");
  select.innerHTML = state.data.grammar_list
    .map((lesson, index) => `<option value="${index}">${escapeHtml(lesson.lesson)} · ${lesson.grammar_points.length} mẫu</option>`)
    .join("");
  select.value = String(state.selectedLessonIndex);
  document.getElementById("lessonPanel").classList.toggle("hidden", state.mode !== "lecture");
  document.getElementById("searchPanel").classList.toggle("hidden", state.mode === "conjugation");
}

function pointCard(point, number) {
  return `
    <article id="grammar-${point.lessonIndex}-${point.pointIndex}" class="study-card rounded-xl border border-[#D6D3CD] bg-white p-5">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div class="text-xs font-extrabold text-[#2F5D50]">${escapeHtml(point.lesson)} · ${number}</div>
          <h3 class="mt-1 font-korean text-2xl font-extrabold text-[#262422]">${escapeHtml(point.grammar)}</h3>
          <p class="mt-1 text-sm font-bold text-[#6B625C]">${escapeHtml(point.meaning)}</p>
        </div>
      </div>
      <p class="mt-4 text-sm font-medium leading-7 text-[#262422]">${escapeHtml(point.explanation)}</p>
      <div class="mt-4 rounded-lg border border-[#D9CBB8] bg-[#FFF8EE] p-4">
        <div class="font-korean text-lg font-extrabold leading-8">${escapeHtml(point.example_kr)}</div>
        <div class="mt-1 text-sm font-semibold text-[#6B625C]">${escapeHtml(point.example_vn)}</div>
      </div>
    </article>
  `;
}

function renderSummary() {
  const points = filteredPoints();
  return `
    <div class="grammar-panel">
      <div class="rounded-xl border border-[#D6D3CD] bg-[#F8F7F3] p-5">
        <div class="text-sm font-extrabold text-[#2F5D50]">Tổng hợp</div>
        <h1 class="mt-2 text-3xl font-extrabold">Tổng hợp ngữ pháp từ bài 1 đến 8 sơ cấp 1</h1>
        <p class="mt-2 max-w-3xl text-sm font-medium leading-6 text-[#6B625C]">Duyệt nhanh toàn bộ mẫu theo bài, nghĩa, giải thích và ví dụ.</p>
      </div>
      <div class="mt-5 grid gap-3">
        ${points.length ? points.map((point, index) => pointCard(point, index + 1)).join("") : emptyState("Không tìm thấy mẫu phù hợp.")}
      </div>
    </div>
  `;
}

function renderLecture() {
  const lesson = state.data.grammar_list[state.selectedLessonIndex];
  return `
    <div class="grammar-panel">
      <section class="relative overflow-hidden rounded-xl border border-[#D9CBB8] bg-[#FFF8EE] p-5">
        <div class="absolute right-6 top-5 h-8 w-32 rotate-3 bg-[#F6D365]/70"></div>
        <div class="relative">
          <div class="text-sm font-extrabold text-[#2F5D50]">Bài giảng</div>
          <h1 class="mt-2 text-3xl font-extrabold">${escapeHtml(lesson.lesson)}</h1>
          <p class="mt-2 max-w-3xl text-sm font-medium leading-6 text-[#6B625C]">Học theo thứ tự bài, đọc giải thích rồi đối chiếu ví dụ tiếng Hàn và tiếng Việt.</p>
          <div class="mt-4 flex flex-wrap gap-2">
            ${lesson.grammar_points.map((point, index) => `
              <a class="lesson-link rounded-lg border border-[#D9CBB8] bg-white px-3 py-2 text-sm font-bold hover:border-[#2F5D50] hover:bg-[#EEF6F2]" href="#grammar-${state.selectedLessonIndex}-${index}">
                ${escapeHtml(point.grammar)}
              </a>
            `).join("")}
          </div>
        </div>
      </section>
      ${renderLectureVideos(lesson)}
      <div class="mt-5 grid gap-4">
        ${lesson.grammar_points.map((point, index) => pointCard({ ...point, lesson: lesson.lesson, lessonIndex: state.selectedLessonIndex, pointIndex: index }, index + 1)).join("")}
      </div>
    </div>
  `;
}

function renderConjugation() {
  return `
    <div class="grammar-panel">
      <section class="rounded-xl border border-[#D6D3CD] bg-[#F8F7F3] p-5">
        <div class="text-sm font-extrabold text-[#2F5D50]">Bảng chia động/tính từ</div>
        <h1 class="mt-2 text-3xl font-extrabold">Bảng chia đuôi sơ cấp 1</h1>
        <p class="mt-2 max-w-3xl text-sm font-medium leading-6 text-[#6B625C]">Ôn nhanh 12 mẫu chia thường gặp. Dấu × là mẫu không dùng tự nhiên với tính từ.</p>
      </section>
      <div class="mt-5 cursor-grab overflow-x-auto rounded-xl border border-[#D6D3CD] bg-white active:cursor-grabbing" data-drag-scroll>
        <table class="min-w-[1720px] border-collapse text-left select-none">
          <thead>
            <tr class="bg-[#2F5D50] text-white">
              <th class="sticky left-0 z-10 w-[128px] border-r border-[#D6D3CD]/40 bg-[#2F5D50] px-3 py-3 text-sm font-extrabold">Từ gốc</th>
              <th class="sticky left-[128px] z-10 w-[160px] border-r border-[#D6D3CD]/40 bg-[#2F5D50] px-3 py-3 text-sm font-extrabold">Nghĩa</th>
              ${CONJUGATION_COLUMNS.map(column => `
                <th class="w-[118px] border-r border-white/20 px-3 py-3 align-top font-korean text-sm font-extrabold leading-6">
                  ${escapeHtml(column.label)}
                </th>
              `).join("")}
            </tr>
          </thead>
          <tbody class="divide-y divide-[#D6D3CD]">
            ${CONJUGATION_WORDS.map(item => `
              <tr class="bg-white hover:bg-[#FFF8EE]">
                <th class="sticky left-0 z-10 border-r border-[#D6D3CD] bg-white px-3 py-2.5 font-korean text-base font-extrabold leading-6 text-[#262422]">
                  ${escapeHtml(item.word)}
                </th>
                <td class="sticky left-[128px] z-10 border-r border-[#D6D3CD] bg-white px-3 py-2.5 text-sm font-semibold leading-6 text-[#6B625C]">
                  ${escapeHtml(item.meaning)}
                </td>
                ${CONJUGATION_COLUMNS.map(column => {
                  const value = conjugationCell(item, column);
                  const isBlocked = value === "×";
                  return `
                    <td class="border-r border-[#D6D3CD] px-3 py-2.5 align-middle font-korean text-sm font-bold leading-6 ${isBlocked ? "text-center text-[#B91C1C]" : "text-[#262422]"}">
                      ${escapeHtml(value)}
                    </td>
                  `;
                }).join("")}
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
      <div class="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-[#6B625C]">
        <span class="rounded-lg border border-[#D6D3CD] bg-white px-3 py-2">ㄹ 받침: 알다 → 압니다, 아세요</span>
        <span class="rounded-lg border border-[#D6D3CD] bg-white px-3 py-2">ㅂ 불규칙: 돕다 → 도와요, 아름답다 → 아름다워요</span>
        <span class="rounded-lg border border-[#D6D3CD] bg-white px-3 py-2">ㄷ 불규칙: 걷다 → 걸어요</span>
      </div>
    </div>
  `;
}

function emptyState(message) {
  return `
    <div class="rounded-xl border border-[#D6D3CD] bg-[#F8F7F3] p-8 text-center">
      <div class="text-base font-extrabold">${escapeHtml(message)}</div>
    </div>
  `;
}

function renderApp() {
  renderModeTabs();
  renderLessonSelect();

  const app = document.getElementById("app");
  if (state.mode === "lecture") app.innerHTML = renderLecture();
  else if (state.mode === "conjugation") app.innerHTML = renderConjugation();
  else app.innerHTML = renderSummary();
}

function initEvents() {
  document.getElementById("modeTabs").addEventListener("click", event => {
    const button = event.target.closest("[data-mode]");
    if (!button) return;
    state.mode = button.dataset.mode;
    renderApp();
  });

  document.getElementById("lessonSelect").addEventListener("change", event => {
    state.selectedLessonIndex = Number(event.target.value);
    renderApp();
  });

  document.getElementById("grammarSearch").addEventListener("input", event => {
    state.query = event.target.value;
    if (state.mode !== "summary") state.mode = "summary";
    renderApp();
  });

  const app = document.getElementById("app");
  let dragState = null;
  app.addEventListener("pointerdown", event => {
    const scroller = event.target.closest("[data-drag-scroll]");
    if (!scroller || event.button !== 0) return;
    dragState = {
      scroller,
      pointerId: event.pointerId,
      startX: event.clientX,
      startLeft: scroller.scrollLeft,
      moved: false,
    };
    scroller.setPointerCapture(event.pointerId);
  });

  app.addEventListener("pointermove", event => {
    if (!dragState || event.pointerId !== dragState.pointerId) return;
    const deltaX = event.clientX - dragState.startX;
    if (Math.abs(deltaX) > 3) dragState.moved = true;
    dragState.scroller.scrollLeft = dragState.startLeft - deltaX;
    if (dragState.moved) event.preventDefault();
  });

  app.addEventListener("pointerup", event => {
    if (!dragState || event.pointerId !== dragState.pointerId) return;
    dragState.scroller.releasePointerCapture(event.pointerId);
    dragState = null;
  });

  app.addEventListener("pointercancel", () => {
    dragState = null;
  });
}

async function init() {
  document.getElementById("app").appendChild(document.getElementById("loadingTemplate").content.cloneNode(true));
  try {
    state.data = await loadJson(GRAMMAR_PATH);
    initEvents();
    renderApp();
  } catch (error) {
    document.getElementById("app").innerHTML = `
      <section class="rounded-md border border-red-200 bg-red-50 p-5 text-red-950">
        <div class="font-semibold">Không tải được dữ liệu ngữ pháp</div>
        <p class="mt-2 text-sm">${escapeHtml(error.message)}</p>
      </section>
    `;
  }
}

init();
