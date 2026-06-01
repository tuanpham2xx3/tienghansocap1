const DATA_PATH = "../src/data/korean/generated/vocabulary-games.json";
const STORAGE_KEY = "koreanVocabularyGameStateV1";
const STORED_STATE_KEYS = [
  "section",
  "mode",
  "lesson",
  "index",
  "selected",
  "feedback",
  "answerText",
  "score",
  "streak",
  "locked",
  "pairLeft",
  "matchedIds",
  "assembled",
  "cardFlipped",
  "audioTextVisible",
  "speedStarted",
  "speedRemaining",
  "marathonLives",
  "marathonSeed",
];

const SECTIONS = {
  learn: { label: "Học từ mới", modes: ["flashcard", "listening"] },
  practice: { label: "Luyện tập", modes: ["matching", "letterArrange", "typing"] },
  challenge: { label: "Thử thách", modes: ["marathon"] },
};

const MODE_LABELS = {
  flashcard: "Flashcard",
  listening: "Nghe phát âm",
  matching: "Nối từ",
  letterArrange: "Xếp chữ",
  typing: "Gõ từ",
  marathon: "Marathon",
};

const state = {
  data: null,
  itemsById: new Map(),
  section: "learn",
  mode: "flashcard",
  lesson: 1,
  index: 0,
  selected: "",
  feedback: "",
  answerText: "",
  score: 0,
  streak: 0,
  locked: false,
  pairLeft: "",
  matchAttempt: null,
  matchTimerId: null,
  marathonAdvanceTimerId: null,
  matchedIds: [],
  assembled: [],
  cardFlipped: false,
  audioTextVisible: false,
  practiceSeed: Math.floor(Date.now() % 2147483647) + Math.floor(Math.random() * 100000),
  speedStarted: false,
  speedRemaining: 45,
  marathonLives: 3,
  marathonSeed: 1,
  timerId: null,
};

function saveLocalState() {
  if (!state.data) return;
  const stored = Object.fromEntries(STORED_STATE_KEYS.map(key => [key, state[key]]));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
}

function restoreLocalState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    const stored = JSON.parse(raw);
    for (const key of STORED_STATE_KEYS) {
      if (key in stored) state[key] = stored[key];
    }
    if (!SECTIONS[state.section]) state.section = "learn";
    if (!SECTIONS[state.section].modes.includes(state.mode)) state.mode = SECTIONS[state.section].modes[0];
    if (!state.data.lessonPools[String(state.lesson)]) state.lesson = 1;
    state.index = Math.max(0, Number(state.index) || 0);
    state.score = Math.max(0, Number(state.score) || 0);
    state.streak = Math.max(0, Number(state.streak) || 0);
    state.speedRemaining = Math.max(0, Number(state.speedRemaining) || state.data.gameConfig.marathonSeconds);
    state.marathonLives = Math.max(0, Number(state.marathonLives) || state.data.gameConfig.marathonLives);
    state.marathonSeed = Math.max(1, Number(state.marathonSeed) || 1);
    state.matchedIds = Array.isArray(state.matchedIds) ? state.matchedIds : [];
    state.assembled = Array.isArray(state.assembled) ? state.assembled : [];
    const items = currentItems();
    state.index = items.length ? state.index % items.length : 0;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function shuffle(items, seed = 1) {
  const copy = items.slice();
  let x = seed || 1;
  for (let i = copy.length - 1; i > 0; i -= 1) {
    x = (x * 1664525 + 1013904223) >>> 0;
    const j = x % (i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function hashText(value) {
  let hash = 0;
  for (const char of String(value)) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return hash;
}

function currentLessonPool() {
  return state.data.lessonPools[String(state.lesson)];
}

function idsToItems(ids) {
  return ids.map(id => state.itemsById.get(id)).filter(Boolean);
}

function currentItems() {
  if (state.section === "learn") {
    return idsToItems(currentLessonPool().modes[state.mode] || currentLessonPool().itemIds);
  }
  if (state.section === "practice") {
    const items = idsToItems(state.data.practicePool[state.mode] || state.data.practicePool.matching);
    return shuffle(items, state.practiceSeed + hashText(state.mode));
  }
  if (state.mode === "marathon") {
    return shuffle(idsToItems(state.data.challengePool.marathon), state.marathonSeed);
  }
  return idsToItems(state.data.challengePool.marathon);
}

function currentItem() {
  const items = currentItems();
  return items[state.index % Math.max(items.length, 1)];
}

function currentProgressTotal() {
  if (state.mode === "matching") return Math.max(Math.ceil(currentItems().length / 10), 1);
  return Math.max(currentItems().length, 1);
}

function optionItems(correct, sourceItems = currentItems(), count = 4) {
  const sameType = sourceItems.filter(item => item.id !== correct.id && item.partOfSpeech === correct.partOfSpeech);
  const fallback = state.data.items.filter(item => item.id !== correct.id && item.partOfSpeech === correct.partOfSpeech);
  const distractors = shuffle([...sameType, ...fallback], correct.id.length + state.index)
    .filter((item, index, list) => list.findIndex(candidate => candidate.id === item.id) === index)
    .slice(0, Math.max(count - 1, 0));
  return shuffle([correct, ...distractors], correct.id.length + state.index + 17).slice(0, count);
}

function stopTimer() {
  if (state.timerId) window.clearInterval(state.timerId);
  state.timerId = null;
}

function clearMatchTimer() {
  if (state.matchTimerId) window.clearTimeout(state.matchTimerId);
  state.matchTimerId = null;
}

function clearMarathonAdvanceTimer() {
  if (state.marathonAdvanceTimerId) window.clearTimeout(state.marathonAdvanceTimerId);
  state.marathonAdvanceTimerId = null;
}

function resetRound() {
  stopTimer();
  clearMatchTimer();
  clearMarathonAdvanceTimer();
  state.index = 0;
  state.selected = "";
  state.feedback = "";
  state.answerText = "";
  state.score = 0;
  state.streak = 0;
  state.locked = false;
  state.pairLeft = "";
  state.matchAttempt = null;
  state.matchedIds = [];
  state.assembled = [];
  state.cardFlipped = false;
  state.audioTextVisible = false;
  state.speedStarted = false;
  state.speedRemaining = state.data?.gameConfig.marathonSeconds ?? 45;
  state.marathonLives = state.data?.gameConfig.marathonLives ?? 3;
  saveLocalState();
}

function speak(text = currentItem()?.audioText) {
  if (!text || !("speechSynthesis" in window)) {
    state.feedback = "Thiết bị này chưa hỗ trợ đọc bằng Web Speech API.";
    render();
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "ko-KR";
  const voices = window.speechSynthesis.getVoices();
  utterance.voice = voices.find(voice => voice.lang.toLowerCase().startsWith("ko")) || null;
  utterance.rate = 0.88;
  window.speechSynthesis.speak(utterance);
}

function setSection(section) {
  state.section = section;
  state.mode = SECTIONS[section].modes[0];
  resetRound();
  render();
}

function setMode(mode) {
  state.mode = mode;
  resetRound();
  render();
}

function setLesson(lesson) {
  state.lesson = Number(lesson);
  resetRound();
  render();
}

function nextQuestion() {
  clearMarathonAdvanceTimer();
  const total = currentProgressTotal();
  state.index = (state.index + 1) % total;
  state.selected = "";
  state.feedback = "";
  state.answerText = "";
  state.locked = false;
  state.assembled = [];
  state.cardFlipped = false;
  state.audioTextVisible = false;
  state.pairLeft = "";
  state.matchAttempt = null;
  state.matchedIds = [];
  clearMatchTimer();
  render();
}

function previousQuestion() {
  clearMarathonAdvanceTimer();
  const total = currentProgressTotal();
  state.index = (state.index - 1 + total) % total;
  state.selected = "";
  state.feedback = "";
  state.answerText = "";
  state.locked = false;
  state.assembled = [];
  state.cardFlipped = false;
  state.audioTextVisible = false;
  state.pairLeft = "";
  state.matchAttempt = null;
  state.matchedIds = [];
  clearMatchTimer();
  render();
}

function checkChoice(id) {
  if (state.locked) return;
  const correct = currentItem();
  state.selected = id;
  state.locked = true;
  if (state.mode === "marathon") {
    if (id === correct.id) {
      state.score += 1;
      state.streak += 1;
      state.speedRemaining += state.data.gameConfig.marathonCorrectBonusSeconds;
    } else {
      state.streak = 0;
      state.marathonLives = Math.max(0, state.marathonLives - 1);
      if (state.marathonLives <= 0) {
        stopTimer();
      }
    }
    state.feedback = "";
    if (state.speedRemaining <= 0 || state.marathonLives <= 0) {
      state.locked = true;
    } else {
      clearMarathonAdvanceTimer();
      state.marathonAdvanceTimerId = window.setTimeout(() => {
        if (state.speedRemaining <= 0 || state.marathonLives <= 0) {
          state.locked = true;
        } else {
          state.index = (state.index + 1) % currentProgressTotal();
          state.selected = "";
          state.locked = false;
        }
        state.marathonAdvanceTimerId = null;
        render();
      }, 1000);
    }
    render();
    return;
  }
  if (id === correct.id) {
    state.score += 1;
    state.streak += 1;
    state.feedback = "Đúng.";
  } else {
    state.streak = 0;
    state.feedback = `Sai. Đáp án đúng là ${correct.korean} - ${correct.meaningVi}.`;
  }
  render();
}

function checkTextAnswer() {
  const item = currentItem();
  const normalizedUser = state.answerText.trim().replace(/\s+/g, " ");
  const normalizedAnswer = item.korean.trim().replace(/\s+/g, " ");
  if (normalizedUser === normalizedAnswer) {
    state.score += 1;
    state.streak += 1;
    state.feedback = "Đúng.";
  } else {
    state.streak = 0;
    state.feedback = `Chưa đúng. Đáp án là ${item.korean}.`;
  }
  state.locked = true;
  render();
}

function startMarathon() {
  resetRound();
  clearMarathonAdvanceTimer();
  state.speedStarted = true;
  state.speedRemaining = state.data.gameConfig.marathonSeconds;
  state.marathonLives = state.data.gameConfig.marathonLives;
  state.marathonSeed = Math.floor(Date.now() % 2147483647) + Math.floor(Math.random() * 100000);
  state.timerId = window.setInterval(() => {
    state.speedRemaining -= 1;
    if (state.speedRemaining <= 0) {
      stopTimer();
      state.speedRemaining = 0;
      state.locked = true;
    }
    if (state.marathonLives <= 0) {
      stopTimer();
      state.locked = true;
    }
    render();
  }, 1000);
  render();
}

function buttonClass(active = false) {
  return active
    ? "tap-button rounded-lg bg-[#2F5D50] px-3 py-2 text-left text-sm font-bold text-white"
    : "tap-button rounded-lg border border-[#D6D3CD] bg-white px-3 py-2 text-left text-sm font-bold text-[#262422] hover:bg-[#F5F4F0]";
}

function renderControls() {
  const sectionTabs = document.getElementById("sectionTabs");
  sectionTabs.innerHTML = Object.entries(SECTIONS)
    .map(([key, section]) => `<button class="${buttonClass(state.section === key)}" data-section="${key}">${section.label}</button>`)
    .join("");

  const modeTabs = document.getElementById("modeTabs");
  modeTabs.innerHTML = SECTIONS[state.section].modes
    .map(mode => `<button class="${buttonClass(state.mode === mode)}" data-mode="${mode}">${MODE_LABELS[mode]}</button>`)
    .join("");

  const lessonSelect = document.getElementById("lessonSelect");
  const lessonControlPanel = document.getElementById("lessonControlPanel");
  lessonControlPanel.classList.toggle("hidden", state.section !== "learn");
  lessonSelect.innerHTML = Object.values(state.data.lessonPools)
    .map(pool => `<option value="${pool.lesson}">${escapeHtml(pool.lessonTitle)} (${pool.itemIds.length} từ)</option>`)
    .join("");
  lessonSelect.value = String(state.lesson);

}

function shell(title, subtitle, body) {
  const total = currentProgressTotal();
  const displayIndex = (state.index % total) + 1;
  return `
    <div class="mx-auto flex w-full min-w-0 max-w-[1120px] flex-col gap-4 md:gap-5">
      <div class="flex flex-col gap-2 border-b border-[#D6D3CD] pb-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 class="text-xl font-extrabold md:text-2xl">${escapeHtml(title)}</h2>
          <p class="mt-1 text-sm leading-6 text-[#6B625C]">${escapeHtml(subtitle)}</p>
        </div>
        <div class="rounded-lg border border-[#D6D3CD] px-3 py-2 text-sm font-bold">${displayIndex}/${total}</div>
      </div>
      ${state.feedback ? `<div class="feedback-in rounded-lg border border-[#D9CBB8] bg-[#FFF8EE] px-3 py-2 text-sm font-semibold">${escapeHtml(state.feedback)}</div>` : ""}
      ${body}
    </div>
  `;
}

function itemMeta(item) {
  return `
    <div class="mt-4 flex flex-wrap gap-2 text-xs font-bold text-[#6B625C]">
      <span class="rounded-md border border-[#D6D3CD] px-2 py-1">${escapeHtml(item.partOfSpeech)}</span>
      <span class="rounded-md border border-[#D6D3CD] px-2 py-1">${escapeHtml(item.difficulty)}</span>
      ${item.antonymText ? `<span class="rounded-md border border-[#D6D3CD] px-2 py-1">Trái nghĩa: ${escapeHtml(item.antonymText)}</span>` : ""}
    </div>
  `;
}

function renderFlashcard() {
  const item = currentItem();
  return shell(
    "Card học từ mới",
    "Lật nhanh từng từ trong bài đang chọn. Dùng nút Nghe để phát âm tiếng Hàn.",
    `
      <div class="relative mx-auto w-full max-w-[900px] px-11 sm:px-16">
        <button class="circle-button absolute left-0 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-[#D6D3CD] bg-white text-xl font-extrabold text-[#2F5D50] sm:h-12 sm:w-12 sm:text-2xl" data-action="previous" type="button" title="Từ trước" aria-label="Từ trước">‹</button>
        <button class="study-card mx-auto block w-full rounded-2xl border border-[#D6D3CD] bg-[#FFF8EE] p-4 text-left shadow-sm hover:border-[#2F5D50] focus:border-[#2F5D50] focus:outline-none focus:ring-4 focus:ring-[#2F5D50]/10 md:p-8" data-action="flip-card" type="button">
          <div class="study-card-content text-center">
            <div class="text-sm font-bold text-[#6B625C]">${escapeHtml(item.lessonTitle)}</div>
            <div class="mt-4 flex items-center justify-center gap-3">
              <div class="font-korean text-4xl font-extrabold leading-tight sm:text-5xl md:text-7xl">${escapeHtml(item.korean)}</div>
              <span class="circle-button inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#D6D3CD] bg-white text-[#2F5D50] sm:h-11 sm:w-11" data-action="speak" role="button" tabindex="0" title="Nghe phát âm" aria-label="Nghe phát âm"><span class="speaker-glyph">🔊</span></span>
            </div>
            ${
              state.cardFlipped
                ? `
                   <div class="mt-5 text-xl font-extrabold md:text-2xl">${escapeHtml(item.meaningVi)}</div>
                  <div class="mt-5 flex justify-center">${itemMeta(item)}</div>
                `
                : `<div class="mt-6 text-sm font-bold text-[#6B625C]">Bấm vào thẻ để xem nghĩa</div>`
            }
          </div>
        </button>
        <button class="circle-button absolute right-0 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-[#D6D3CD] bg-white text-xl font-extrabold text-[#2F5D50] sm:h-12 sm:w-12 sm:text-2xl" data-action="next" type="button" title="Từ tiếp theo" aria-label="Từ tiếp theo">›</button>
      </div>
    `,
  );
}

function renderListening() {
  const item = currentItem();
  const options = optionItems(item);
  return shell(
    "Nghe phát âm",
    "Nghe tiếng Hàn rồi chọn nghĩa đúng.",
    `
      <div class="rounded-xl border border-[#D6D3CD] bg-[#FFF8EE] p-4 text-center md:p-6">
        <button class="tap-button rounded-lg bg-[#2F5D50] px-5 py-3 text-sm font-bold text-white" data-action="speak">Phát âm tiếng Hàn</button>
        <div class="mt-4 min-h-12">
          ${
            state.audioTextVisible
              ? `<div class="font-korean text-2xl font-extrabold">${escapeHtml(item.audioText)}</div>`
              : `<button class="tap-button rounded-lg border border-[#D6D3CD] bg-white px-4 py-2 text-sm font-bold text-[#262422]" data-action="show-audio-text">Ấn vào để hiện dạng chữ</button>`
          }
        </div>
      </div>
      <div class="grid gap-2 sm:grid-cols-2">
        ${options.map(option => answerButton(option.id, option.meaningVi, item.id)).join("")}
      </div>
      ${state.locked ? `<button class="tap-button w-fit rounded-lg bg-[#2F5D50] px-4 py-2 text-sm font-bold text-white" data-action="next">Câu tiếp theo</button>` : ""}
    `,
  );
}

function answerButton(id, text, correctId = currentItem().id) {
  const selected = state.selected === id;
  const correct = state.locked && id === correctId;
  const wrong = state.locked && selected && id !== correctId;
  const cls = correct
    ? "border-[#2F5D50] bg-[#EEF6F2]"
    : wrong
      ? "border-[#B91C1C] bg-red-50"
      : "border-[#D6D3CD] bg-white hover:bg-[#F5F4F0]";
  return `<button class="tap-button rounded-lg border px-4 py-3 text-left text-sm font-bold ${cls}" data-choice="${id}">${escapeHtml(text)}</button>`;
}

function renderMatching() {
  const roundSize = 10;
  const orderedItems = shuffle(currentItems(), 33);
  const roundCount = Math.max(Math.ceil(orderedItems.length / roundSize), 1);
  const roundIndex = state.index % roundCount;
  const items = orderedItems.slice(roundIndex * roundSize, roundIndex * roundSize + roundSize);
  const meanings = shuffle(items, 77 + roundIndex);
  const roundDone = items.length > 0 && items.every(item => state.matchedIds.includes(item.id));
  return shell(
    "Nối từ",
    "Chọn một từ tiếng Hàn rồi chọn nghĩa tiếng Việt tương ứng.",
    `
      <div class="grid gap-3 sm:grid-cols-2 md:gap-4">
        <div class="grid gap-2">
          ${items
            .map(item => `
              <button class="${matchButtonClass(item.id, "left")} font-korean text-lg" data-match-left="${item.id}" ${state.matchedIds.includes(item.id) ? "disabled" : ""}>
                ${escapeHtml(item.korean)}
              </button>
            `)
            .join("")}
        </div>
        <div class="grid gap-2">
          ${meanings
            .map(item => `
              <button class="${matchButtonClass(item.id, "right")}" data-match-right="${item.id}" ${state.matchedIds.includes(item.id) ? "disabled" : ""}>
                ${escapeHtml(item.meaningVi)}
              </button>
            `)
            .join("")}
        </div>
      </div>
      <div class="flex flex-wrap gap-2">
        <button class="tap-button w-fit rounded-lg border border-[#D6D3CD] bg-white px-4 py-2 text-sm font-bold" data-action="reset-round">Làm lại</button>
        ${roundDone ? `<button class="tap-button w-fit rounded-lg bg-[#2F5D50] px-4 py-2 text-sm font-bold text-white" data-action="next">Nhóm tiếp theo</button>` : ""}
      </div>
    `,
  );
}

function matchButtonClass(id, side) {
  if (state.matchedIds.includes(id)) return "tap-button rounded-lg border border-[#2F5D50] bg-[#EEF6F2] px-4 py-3 text-left text-sm font-bold";
  if (state.matchAttempt?.result === "wrong" && state.matchAttempt[side] === id) {
    return "tap-button rounded-lg border border-[#B91C1C] bg-red-50 px-4 py-3 text-left text-sm font-bold text-[#B91C1C]";
  }
  if (side === "left" && state.pairLeft === id) return "tap-button rounded-lg border border-[#2F5D50] bg-white px-4 py-3 text-left text-sm font-bold ring-4 ring-[#2F5D50]/10";
  return "tap-button rounded-lg border border-[#D6D3CD] bg-white px-4 py-3 text-left text-sm font-bold hover:bg-[#F5F4F0]";
}

function renderLetterArrange() {
  const item = currentItem();
  const letters = shuffle(Array.from(item.korean), item.id.length + 81);
  const assembled = state.assembled.join("");
  return shell(
    "Xếp chữ",
    "Sắp xếp các ký tự để tạo đúng từ tiếng Hàn.",
    `
      <div class="rounded-xl border border-[#D6D3CD] bg-[#FFF8EE] p-4 md:p-5">
        <div class="text-sm font-bold text-[#6B625C]">Nghĩa</div>
        <div class="mt-2 text-lg font-extrabold md:text-xl">${escapeHtml(item.meaningVi)}</div>
        <div class="mt-4 min-h-14 rounded-lg border border-[#D6D3CD] bg-white p-3 font-korean text-2xl font-extrabold md:min-h-16 md:text-3xl">${escapeHtml(assembled || " ")}</div>
      </div>
      <div class="flex flex-wrap gap-2">
        ${letters.map((letter, index) => `<button class="tap-button h-11 min-w-11 rounded-lg border border-[#D6D3CD] bg-white px-3 font-korean text-lg font-bold md:h-12 md:min-w-12 md:text-xl" data-letter="${index}" data-value="${escapeHtml(letter)}">${escapeHtml(letter)}</button>`).join("")}
      </div>
      <div class="flex flex-wrap gap-2">
        <button class="tap-button rounded-lg border border-[#D6D3CD] bg-white px-4 py-2 text-sm font-bold" data-action="clear-letters">Xóa</button>
        <button class="tap-button rounded-lg bg-[#2F5D50] px-4 py-2 text-sm font-bold text-white" data-action="check-arrange">Kiểm tra</button>
        ${state.locked ? `<button class="tap-button rounded-lg bg-[#2F5D50] px-4 py-2 text-sm font-bold text-white" data-action="next">Câu tiếp theo</button>` : ""}
      </div>
    `,
  );
}

function renderTextInputMode(title, subtitle, promptHtml) {
  return shell(
    title,
    subtitle,
    `
      <div class="rounded-xl border border-[#D6D3CD] bg-[#FFF8EE] p-4 md:p-5">${promptHtml}</div>
      <input class="h-12 w-full rounded-lg border border-[#D6D3CD] px-3 font-korean text-lg font-bold focus:border-[#2F5D50] focus:outline-none focus:ring-4 focus:ring-[#2F5D50]/10" value="${escapeHtml(state.answerText)}" data-answer-input placeholder="Nhập tiếng Hàn" />
      <div class="flex flex-wrap gap-2">
        <button class="tap-button rounded-lg border border-[#D6D3CD] bg-white px-4 py-2 text-sm font-bold" data-action="speak">Nghe</button>
        <button class="tap-button rounded-lg bg-[#2F5D50] px-4 py-2 text-sm font-bold text-white" data-action="check-text">Kiểm tra</button>
        ${state.locked ? `<button class="tap-button rounded-lg bg-[#2F5D50] px-4 py-2 text-sm font-bold text-white" data-action="next">Câu tiếp theo</button>` : ""}
      </div>
    `,
  );
}

function renderTyping() {
  const item = currentItem();
  return renderTextInputMode(
    "Gõ từ",
    "Nhìn nghĩa tiếng Việt hoặc nghe phát âm rồi nhập đúng tiếng Hàn.",
    `
      <div class="text-sm font-bold text-[#6B625C]">Nghĩa tiếng Việt</div>
      <div class="mt-2 text-xl font-extrabold">${escapeHtml(item.meaningVi)}</div>
    `,
  );
}

function renderMarathon() {
  if (!state.speedStarted) {
    return shell(
      "Marathon",
      "Trả lời liên tục trong 45 giây. Có 3 mạng, sai mất 1 mạng, đúng được cộng 5 giây.",
      `<button class="tap-button w-full rounded-lg bg-[#2F5D50] px-5 py-3 text-sm font-bold text-white sm:w-fit" data-action="start-marathon">Bắt đầu Marathon</button>`,
    );
  }
  const item = currentItem();
  const options = optionItems(item);
  const gameOver = state.speedRemaining <= 0 || state.marathonLives <= 0;
  return shell(
    "Marathon",
    "Chọn nghĩa đúng càng lâu càng tốt. Mỗi lượt bắt đầu sẽ xáo trộn thứ tự câu hỏi.",
    `
      <div class="flex flex-wrap gap-2">
        <div class="w-fit rounded-lg border border-[#D6D3CD] px-3 py-2 text-sm font-bold">Còn ${state.speedRemaining}s</div>
        <div class="w-fit rounded-lg border border-[#D6D3CD] px-3 py-2 text-sm font-bold">Mạng: ${state.marathonLives}</div>
        <div class="w-fit rounded-lg border border-[#D6D3CD] px-3 py-2 text-sm font-bold">Combo: ${state.streak}</div>
      </div>
      <div class="rounded-xl border border-[#D6D3CD] bg-[#FFF8EE] p-4 md:p-5">
        <div class="font-korean text-3xl font-extrabold md:text-4xl">${escapeHtml(item.korean)}</div>
      </div>
      <div class="grid gap-2 sm:grid-cols-2">
        ${options.map(option => answerButton(option.id, option.meaningVi, item.id)).join("")}
      </div>
      ${gameOver ? `<div class="rounded-lg border border-[#D6D3CD] bg-white px-4 py-3 text-sm font-bold">Kết thúc. Điểm của bạn: ${state.score}</div>` : ""}
      <div class="flex flex-wrap gap-2">
        ${gameOver ? `<button class="tap-button w-fit rounded-lg bg-[#2F5D50] px-4 py-2 text-sm font-bold text-white" data-action="start-marathon">Chơi lại</button>` : ""}
      </div>
    `,
  );
}

function renderMode() {
  if (state.mode === "flashcard") return renderFlashcard();
  if (state.mode === "listening") return renderListening();
  if (state.mode === "matching") return renderMatching();
  if (state.mode === "letterArrange") return renderLetterArrange();
  if (state.mode === "typing") return renderTyping();
  if (state.mode === "marathon") return renderMarathon();
  return renderMarathon();
}

function render() {
  if (!state.data) return;
  renderControls();
  document.getElementById("app").innerHTML = renderMode();
  saveLocalState();
}

async function loadData() {
  const response = await fetch(DATA_PATH);
  if (!response.ok) throw new Error(`Không tải được ${DATA_PATH}`);
  return response.json();
}

function initEvents() {
  document.getElementById("sectionTabs").addEventListener("click", event => {
    const button = event.target.closest("[data-section]");
    if (button) setSection(button.dataset.section);
  });

  document.getElementById("modeTabs").addEventListener("click", event => {
    const button = event.target.closest("[data-mode]");
    if (button) setMode(button.dataset.mode);
  });

  document.getElementById("lessonSelect").addEventListener("change", event => {
    setLesson(event.target.value);
  });

  document.getElementById("app").addEventListener("click", event => {
    const choice = event.target.closest("[data-choice]");
    if (choice) {
      checkChoice(choice.dataset.choice);
      return;
    }

    const actionButton = event.target.closest("[data-action]");
    if (actionButton) handleAction(actionButton.dataset.action);

    const matchLeft = event.target.closest("[data-match-left]");
    if (matchLeft) {
      clearMatchTimer();
      state.matchAttempt = null;
      state.pairLeft = matchLeft.dataset.matchLeft;
      render();
      return;
    }

    const matchRight = event.target.closest("[data-match-right]");
    if (matchRight && state.pairLeft) {
      if (matchRight.dataset.matchRight === state.pairLeft) {
        if (!state.matchedIds.includes(state.pairLeft)) state.matchedIds.push(state.pairLeft);
        state.score += 1;
        state.streak += 1;
        state.feedback = "";
        state.matchAttempt = null;
        state.pairLeft = "";
        render();
      } else {
        const left = state.pairLeft;
        const right = matchRight.dataset.matchRight;
        state.streak = 0;
        state.feedback = "";
        state.matchAttempt = { left, right, result: "wrong" };
        render();
        clearMatchTimer();
        state.matchTimerId = window.setTimeout(() => {
          if (state.matchAttempt?.left === left && state.matchAttempt?.right === right) {
            state.matchAttempt = null;
            state.pairLeft = "";
            state.feedback = "";
            render();
          }
        }, 650);
      }
      return;
    }

    const letter = event.target.closest("[data-letter]");
    if (letter) {
      state.assembled.push(letter.dataset.value);
      render();
    }
  });

  document.getElementById("app").addEventListener("input", event => {
    if (event.target.matches("[data-answer-input]")) {
      state.answerText = event.target.value;
      saveLocalState();
    }
  });

  document.getElementById("app").addEventListener("keydown", event => {
    const iconButton = event.target.closest('[role="button"][data-action]');
    if (!iconButton) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleAction(iconButton.dataset.action);
    }
  });
}

function handleAction(action) {
  if (action === "next") nextQuestion();
  if (action === "previous") previousQuestion();
  if (action === "speak") speak();
  if (action === "check-text") checkTextAnswer();
  if (action === "reset-round") {
    resetRound();
    render();
  }
  if (action === "clear-letters") {
    state.assembled = [];
    render();
  }
  if (action === "check-arrange") {
    state.answerText = state.assembled.join("");
    checkTextAnswer();
  }
  if (action === "start-marathon") startMarathon();
  if (action === "flip-card") {
    state.cardFlipped = !state.cardFlipped;
    render();
  }
  if (action === "show-audio-text") {
    state.audioTextVisible = true;
    saveLocalState();
    render();
  }
}

async function init() {
  document.getElementById("app").appendChild(document.getElementById("loadingTemplate").content.cloneNode(true));
  try {
    state.data = await loadData();
    state.itemsById = new Map(state.data.items.map(item => [item.id, item]));
    state.speedRemaining = state.data.gameConfig.marathonSeconds;
    restoreLocalState();
    const dataMeta = document.getElementById("dataMeta");
    if (dataMeta) {
      dataMeta.textContent = `${state.data.totals.items} từ từ dữ liệu gốc, audio dùng giọng mặc định của thiết bị.`;
    }
    initEvents();
    render();
  } catch (error) {
    document.getElementById("app").innerHTML = `
      <section class="rounded-xl border border-red-200 bg-red-50 p-5 text-red-950">
        <div class="font-bold">Không tải được dữ liệu từ vựng</div>
        <p class="mt-2 text-sm">${escapeHtml(error.message)}</p>
        <p class="mt-2 text-sm">Hãy mở trang qua local server, không mở trực tiếp file HTML.</p>
      </section>
    `;
  }
}

window.addEventListener("beforeunload", stopTimer);
init();
