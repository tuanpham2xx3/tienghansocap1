const DATA_PATHS = {
  officialExams: "../src/data/korean/generated/official-exams.json",
  officialAnswerKeys: "../src/data/korean/generated/official-exam-answer-keys.json",
  part1Exams: "../src/data/korean/generated/part1-static-exams.json",
  part1Questions: "../src/data/korean/pools/part1-questions.json",
  part2Exams: "../src/data/korean/generated/part2/part2-static-exams.json",
  part2AnswerKeys: "../src/data/korean/generated/part2/part2-static-answer-keys.json",
  part2Questions: "../src/data/korean/pools/part2-questions.json",
  part3Exams: "../src/data/korean/generated/part3-static-exams.json",
  part3AnswerKeys: "../src/data/korean/generated/part3-static-answer-keys.json",
  part3Questions: "../src/data/korean/pools/part3-questions.json",
};

const state = {
  data: null,
  selectedOfficialExamId: "OFFICIAL_EXAM_001",
  durationMinutes: 45,
  customDurationMinutes: 45,
  hasStarted: false,
  endsAt: null,
  showAnswers: false,
  submitted: false,
  userAnswers: {},
  revealedKoreanKeyboards: {},
};

const labels = ["A", "B", "C", "D"];
const SESSION_KEY = "koreanMockExamSession:v1";

function byId(items, key = "id") {
  return new Map(items.map(item => [item[key], item]));
}

async function loadJson(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Không tải được ${path}`);
  return response.json();
}

async function loadAllData() {
  const entries = await Promise.all(
    Object.entries(DATA_PATHS).map(async ([key, path]) => [key, await loadJson(path)]),
  );
  return Object.fromEntries(entries);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function formatMultiline(value) {
  return escapeHtml(value).replaceAll("\n", "<br />");
}

function hashText(value) {
  let hash = 2166136261;
  for (const char of String(value)) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededShuffle(items, seedText) {
  const result = [...items];
  let seed = hashText(seedText);
  for (let index = result.length - 1; index > 0; index -= 1) {
    seed = Math.imul(seed ^ (seed >>> 15), 2246822519) >>> 0;
    const swapIndex = seed % (index + 1);
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

function getKoreanCharacterChoices(question, answer) {
  const correctText = [answer.sampleAnswer, ...answer.acceptedAnswers].join("");
  const correctChars = [...new Set(Array.from(correctText).filter(char => /[가-힣]/u.test(char)))];
  const distractorChars = Array.from("가나다라마바사아자차카타파하은는이를에에서고하고요습니다");
  const distractors = [...new Set(distractorChars.filter(char => !correctChars.includes(char)))]
    .slice(0, Math.max(8, 42 - correctChars.length));
  return seededShuffle([...correctChars, ...distractors], question.id);
}

function loadSavedSession() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? "null");
    if (!saved || typeof saved !== "object") return;
    if (saved.selectedOfficialExamId) state.selectedOfficialExamId = saved.selectedOfficialExamId;
    if (Number.isFinite(saved.durationMinutes)) state.durationMinutes = saved.durationMinutes;
    if (Number.isFinite(saved.customDurationMinutes)) state.customDurationMinutes = saved.customDurationMinutes;
    state.hasStarted = Boolean(saved.hasStarted);
    state.endsAt = Number.isFinite(saved.endsAt) ? saved.endsAt : null;
    state.showAnswers = Boolean(saved.showAnswers);
    state.submitted = Boolean(saved.submitted);
    state.userAnswers = saved.userAnswers && typeof saved.userAnswers === "object" ? saved.userAnswers : {};
    state.revealedKoreanKeyboards = saved.revealedKoreanKeyboards && typeof saved.revealedKoreanKeyboards === "object"
      ? saved.revealedKoreanKeyboards
      : {};
  } catch {
    sessionStorage.removeItem(SESSION_KEY);
  }
}

function persistSession() {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({
    selectedOfficialExamId: state.selectedOfficialExamId,
    durationMinutes: state.durationMinutes,
    customDurationMinutes: state.customDurationMinutes,
    hasStarted: state.hasStarted,
    endsAt: state.endsAt,
    showAnswers: state.showAnswers,
    submitted: state.submitted,
    userAnswers: state.userAnswers,
    revealedKoreanKeyboards: state.revealedKoreanKeyboards,
    savedAt: Date.now(),
  }));
}

function remainingSeconds() {
  if (!state.hasStarted || state.submitted || !state.endsAt) return state.durationMinutes * 60;
  return Math.max(0, Math.ceil((state.endsAt - Date.now()) / 1000));
}

function formatClock(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function submitAttempt() {
  state.submitted = true;
  state.showAnswers = true;
  persistSession();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function answerKey(questionId, part) {
  return `${state.selectedOfficialExamId}:${part}:${questionId}`;
}

function getUserAnswer(questionId, part) {
  return state.userAnswers[answerKey(questionId, part)] ?? "";
}

function setUserAnswer(questionId, part, value) {
  state.userAnswers[answerKey(questionId, part)] = value;
  if (state.hasStarted) persistSession();
}

function koreanKeyboardKey(questionId) {
  return answerKey(questionId, "part3");
}

function normalizeTranslationAnswer(value) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/h\u01b0\u01a1ng|huong/giu, "HUONG")
    .replace(/tu\u1ea5n|tuan/giu, "TUAN")
    .replace(/t\u00e2m|tam/giu, "TAM");
}

function isAcceptedPart3Translation(userAnswer, answer) {
  const normalizedUserAnswer = normalizeTranslationAnswer(userAnswer);
  const accepted = new Set(
    [answer.sampleAnswer, ...answer.acceptedAnswers].map(normalizeTranslationAnswer),
  );
  return normalizedUserAnswer.length > 0 && accepted.has(normalizedUserAnswer);
}

function getOfficialExam() {
  return byId(state.data.officialExams).get(state.selectedOfficialExamId);
}

function getPartContext(officialExam) {
  const {
    part1Exams,
    part1Questions,
    part2Exams,
    part2Questions,
    part2AnswerKeys,
    part3Exams,
    part3Questions,
    part3AnswerKeys,
  } = state.data;

  const part1Exam = byId(part1Exams).get(officialExam.partExamIds.part1);
  const part2Exam = byId(part2Exams).get(officialExam.partExamIds.part2);
  const part3Exam = byId(part3Exams).get(officialExam.partExamIds.part3);

  return {
    part1Exam,
    part1QuestionById: byId(part1Questions),
    part2Exam,
    part2QuestionById: byId(part2Questions),
    part2AnswerByQuestionId: byId(byId(part2AnswerKeys, "examId").get(part2Exam.id).answers, "questionId"),
    part3Exam,
    part3QuestionById: byId(part3Questions),
    part3AnswerByQuestionId: byId(byId(part3AnswerKeys, "examId").get(part3Exam.id).answers, "questionId"),
  };
}

function gradeAttempt() {
  const officialExam = getOfficialExam();
  const context = getPartContext(officialExam);
  const results = new Map();
  const summary = {
    part1: { correct: 0, total: context.part1Exam.questions.length },
    part2: { correct: 0, total: context.part2Exam.questions.length },
    part3: { correct: 0, total: context.part3Exam.questions.length },
  };

  for (const item of context.part1Exam.questions) {
    const question = context.part1QuestionById.get(item.questionId);
    const selected = getUserAnswer(item.questionId, "part1");
    const correct = selected === question.correctOptionId;
    if (correct) summary.part1.correct += 1;
    results.set(answerKey(item.questionId, "part1"), { correct, correctOptionId: question.correctOptionId });
  }

  for (const item of context.part2Exam.questions) {
    const answer = context.part2AnswerByQuestionId.get(item.questionId);
    const selected = getUserAnswer(item.questionId, "part2");
    const correct = selected === answer.correctOptionId;
    if (correct) summary.part2.correct += 1;
    results.set(answerKey(item.questionId, "part2"), { correct, correctOptionId: answer.correctOptionId });
  }

  for (const item of context.part3Exam.questions) {
    const answer = context.part3AnswerByQuestionId.get(item.questionId);
    const text = getUserAnswer(item.questionId, "part3");
    const correct = isAcceptedPart3Translation(text, answer);
    if (correct) summary.part3.correct += 1;
    results.set(answerKey(item.questionId, "part3"), { correct });
  }

  summary.total = {
    correct: summary.part1.correct + summary.part2.correct + summary.part3.correct,
    total: summary.part1.total + summary.part2.total + summary.part3.total,
  };

  return { results, summary };
}

function resultBadge(questionId, part, grading) {
  if (!state.submitted) return "";
  const result = grading.results.get(answerKey(questionId, part));
  const cls = result?.correct
    ? "border-[#2F5D50] bg-[#EEF6F2] text-[#2F5D50]"
    : "border-[#B91C1C] bg-red-50 text-[#B91C1C]";
  return `<span class="rounded-md border px-2 py-1 text-xs font-bold ${cls}">${result?.correct ? "Đúng" : "Sai"}</span>`;
}

function optionClass({ optionId, selectedOptionId, correctOptionId }) {
  if (!state.submitted && !state.showAnswers) {
    return selectedOptionId === optionId
      ? "border-[#2F5D50] bg-[#EEF6F2] text-[#262422]"
      : "border-[#D6D3CD] bg-white hover:border-[#2F5D50] hover:bg-[#F5F4F0]";
  }
  if (optionId === correctOptionId) return "border-[#2F5D50] bg-[#EEF6F2] text-[#262422]";
  if (selectedOptionId === optionId && selectedOptionId !== correctOptionId) {
    return "border-[#B91C1C] bg-red-50 text-[#262422]";
  }
  return "border-[#D6D3CD] bg-white text-[#262422]";
}

function renderOptionList(question, shuffledOptionIds, part, answerKeyItem) {
  const optionById = byId(question.options);
  const selectedOptionId = getUserAnswer(question.id, part);
  const correctOptionId = answerKeyItem?.correctOptionId ?? question.correctOptionId;

  return `
    <div class="mt-4 grid gap-2">
      ${shuffledOptionIds
        .map((optionId, index) => {
          const option = optionById.get(optionId);
          const inputId = `${part}-${question.id}-${optionId}`;
          return `
            <label for="${escapeHtml(inputId)}" class="flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-3 text-sm font-semibold transition-colors md:px-4 ${optionClass({
              optionId,
              selectedOptionId,
              correctOptionId,
            })}">
              <input
                id="${escapeHtml(inputId)}"
                class="sr-only"
                type="radio"
                name="${escapeHtml(part)}-${escapeHtml(question.id)}"
                value="${escapeHtml(optionId)}"
                data-question-id="${escapeHtml(question.id)}"
                data-part="${escapeHtml(part)}"
                ${selectedOptionId === optionId ? "checked" : ""}
                ${state.submitted ? "disabled" : ""}
              />
              <span class="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-[#D6D3CD] bg-white text-xs font-extrabold">${labels[index]}</span>
              <span class="leading-6 md:leading-7">${escapeHtml(option?.text ?? optionId)}</span>
            </label>
          `;
        })
        .join("")}
    </div>
    ${
      state.showAnswers || state.submitted
        ? `<div class="mt-3 rounded-lg border border-[#F6D365] bg-[#FFF8EE] px-4 py-3 text-sm text-[#262422]">
            <b>Đáp án:</b> ${escapeHtml(answerKeyItem?.correctValue ?? question.correctValue)}
            <span class="text-[#6B625C]">(${escapeHtml(correctOptionId)})</span>
            <div class="mt-1 text-[#6B625C]">${escapeHtml(answerKeyItem?.explanationVi ?? question.explanationVi ?? "")}</div>
          </div>`
        : ""
    }
  `;
}

function renderQuestionCard(number, title, bodyHtml, meta = "", badge = "", anchorId = "") {
  const titleHtml = title
    ? `<h3 class="text-sm font-extrabold leading-6 text-[#262422] md:text-base">${escapeHtml(title)}</h3>`
    : "";

  return `
    <article id="${escapeHtml(anchorId || `question-${number}`)}" class="scroll-mt-24 rounded-xl border border-[#D6D3CD] bg-white p-4 shadow-sm md:p-5">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div class="flex items-center gap-2">
          <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#2F5D50] text-sm font-extrabold text-white">${number}</div>
          ${titleHtml}
        </div>
        <div class="flex items-center gap-2">
          ${badge}
          ${meta ? `<div class="text-xs font-semibold text-[#6B625C]">${escapeHtml(meta)}</div>` : ""}
        </div>
      </div>
      <div class="mt-4">${bodyHtml}</div>
    </article>
  `;
}

function sectionShell(id, title, subtitle, innerHtml) {
  return `
    <section id="${id}" class="scroll-mt-24 rounded-xl border border-[#D6D3CD] bg-[#F8F7F3] p-4">
      <div class="mb-4">
        <h2 class="text-xl font-extrabold text-[#262422]">${escapeHtml(title)}</h2>
        <p class="mt-1 text-sm font-medium text-[#6B625C]">${escapeHtml(subtitle)}</p>
      </div>
      <div class="space-y-3">${innerHtml}</div>
    </section>
  `;
}

function renderPart1(context, grading) {
  const cards = context.part1Exam.questions
    .slice()
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map(item => {
      const question = context.part1QuestionById.get(item.questionId);
      const body = `
        <div class="whitespace-pre-wrap rounded-lg border border-[#D6D3CD] bg-[#FFF8EE] p-3 text-sm font-semibold leading-6 md:p-4 md:text-base md:leading-8">${formatMultiline(question.stem)}</div>
        ${renderOptionList(question, item.shuffledOptionIds, "part1")}
      `;
      return renderQuestionCard(
        item.displayOrder,
        "",
        body,
        question.id,
        resultBadge(question.id, "part1", grading),
        `q-part1-${question.id}`,
      );
    })
    .join("");
  return sectionShell("part1", "Part 1 - Từ vựng và ngữ pháp", `${context.part1Exam.id} · 10 câu trắc nghiệm`, cards);
}

function renderStimulus(stimulus) {
  if (!stimulus) return "";
  return `
    <div class="mb-3 rounded-lg border border-dashed border-[#D6D3CD] bg-[#FFF8EE] p-3 text-sm md:p-4">
      <div class="mb-2 font-extrabold">${escapeHtml(stimulus.title ?? "Thông tin")}</div>
      <pre class="whitespace-pre-wrap font-sans leading-6 text-[#262422]">${escapeHtml(stimulus.fallbackText)}</pre>
    </div>
  `;
}

function renderPart2(context, grading) {
  const sectionTitle = {
    topic_identification: "Chọn chủ đề đúng",
    visual_incorrect_statement: "Chọn phát biểu không đúng",
    passage_correct_statement: "Chọn phát biểu đúng",
  };

  const cards = context.part2Exam.questions
    .slice()
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map(item => {
      const question = context.part2QuestionById.get(item.questionId);
      const answer = context.part2AnswerByQuestionId.get(item.questionId);
      const reading = question.readingText
        ? `<div class="rounded-lg border border-[#D6D3CD] bg-[#FFF8EE] p-3 font-korean text-sm font-semibold leading-7 md:p-4 md:text-base md:leading-8">${formatMultiline(question.readingText)}</div>`
        : "";
      const prompt = question.prompt ? `<div class="mb-2 text-sm font-bold text-[#262422]">${escapeHtml(question.prompt)}</div>` : "";
      const body = `
        ${prompt}
        ${renderStimulus(question.stimulus)}
        ${reading}
        ${renderOptionList(question, item.shuffledOptionIds, "part2", answer)}
      `;
      return renderQuestionCard(
        item.displayOrder,
        sectionTitle[question.section],
        body,
        question.id,
        resultBadge(question.id, "part2", grading),
        `q-part2-${question.id}`,
      );
    })
    .join("");

  return sectionShell("part2", "Part 2 - Đọc hiểu", `${context.part2Exam.id} · 9 câu đọc hiểu`, cards);
}

function renderKoreanInputAid(question, answer) {
  if (question.direction !== "vi_to_ko" || state.submitted) return "";

  const keyboardKey = koreanKeyboardKey(question.id);
  if (!state.revealedKoreanKeyboards[keyboardKey]) {
    return `
      <button
        type="button"
        class="mt-3 text-left text-sm font-bold text-[#2F5D50] underline decoration-[#2F5D50]/30 underline-offset-4 hover:text-[#254C42]"
        data-korean-helper-toggle="true"
        data-question-id="${escapeHtml(question.id)}"
      >Không viết được tiếng Hàn à, ấn vào đây</button>
    `;
  }

  return `
    <div class="mt-3 rounded-lg border border-[#D6D3CD] bg-white p-3">
      <div class="grid grid-cols-8 gap-1.5 sm:grid-cols-10 md:grid-cols-12">
        ${getKoreanCharacterChoices(question, answer)
          .map(char => `
            <button
              type="button"
              class="h-9 rounded-md border border-[#D6D3CD] bg-[#FFF8EE] font-korean text-base font-bold text-[#262422] hover:border-[#2F5D50] hover:bg-[#EEF6F2] active:translate-y-px"
              data-korean-char="${escapeHtml(char)}"
              data-question-id="${escapeHtml(question.id)}"
            >${escapeHtml(char)}</button>
          `)
          .join("")}
      </div>
    </div>
  `;
}

function renderPart3(context, grading) {
  const cards = context.part3Exam.questions
    .slice()
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map(item => {
      const question = context.part3QuestionById.get(item.questionId);
      const answer = context.part3AnswerByQuestionId.get(item.questionId);
      const userAnswer = getUserAnswer(item.questionId, "part3");
      const directionText = item.direction === "vi_to_ko" ? "Dịch sang tiếng Hàn" : "Dịch sang tiếng Việt";
      const answerHtml = state.showAnswers || state.submitted
        ? `<div class="mt-3 rounded-lg border border-[#F6D365] bg-[#FFF8EE] px-4 py-3 text-sm text-[#262422]">
            <b>Đáp án mẫu:</b> ${escapeHtml(answer.sampleAnswer)}
            <div class="mt-2"><b>Đáp án chấp nhận:</b></div>
            <ul class="mt-1 list-disc pl-5">${answer.acceptedAnswers.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
            <div class="mt-2 text-[#6B625C]">${escapeHtml(answer.explanationVi)}</div>
          </div>`
        : "";
      const body = `
        <div class="rounded-lg border border-[#D6D3CD] bg-[#FFF8EE] p-3 text-sm font-semibold leading-6 md:p-4 md:text-base md:leading-8">${formatMultiline(question.prompt)}</div>
        ${renderKoreanInputAid(question, answer)}
        <textarea
          class="mt-3 min-h-28 w-full rounded-lg border border-[#D6D3CD] bg-white px-3 py-2 text-sm leading-6 shadow-sm focus:border-[#2F5D50] focus:outline-none focus:ring-4 focus:ring-[#2F5D50]/10"
          placeholder="Nhập đáp án của bạn..."
          data-question-id="${escapeHtml(question.id)}"
          data-part="part3"
          ${state.submitted ? "disabled" : ""}
        >${escapeHtml(userAnswer)}</textarea>
        ${answerHtml}
      `;
      return renderQuestionCard(
        item.displayOrder,
        directionText,
        body,
        question.id,
        resultBadge(question.id, "part3", grading),
        `q-part3-${question.id}`,
      );
    })
    .join("");

  return sectionShell("part3", "Part 3 - Dịch câu", `${context.part3Exam.id} · 8 câu tự luận`, cards);
}

function renderScoreSummary(grading) {
  if (!state.submitted) return "";
  const { summary } = grading;
  return `
    <section class="rounded-xl border border-[#2F5D50] bg-[#EEF6F2] p-4 text-[#262422]">
      <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div class="text-sm font-extrabold text-[#2F5D50]">Kết quả</div>
          <div class="mt-1 text-xl font-extrabold md:text-2xl">${summary.total.correct}/${summary.total.total}</div>
        </div>
        <div class="grid gap-2 text-sm sm:grid-cols-3">
          <div class="rounded-lg border border-[#D6D3CD] bg-white px-3 py-2">Part 1: <b>${summary.part1.correct}/${summary.part1.total}</b></div>
          <div class="rounded-lg border border-[#D6D3CD] bg-white px-3 py-2">Part 2: <b>${summary.part2.correct}/${summary.part2.total}</b></div>
          <div class="rounded-lg border border-[#D6D3CD] bg-white px-3 py-2">Part 3: <b>${summary.part3.correct}/${summary.part3.total}</b></div>
        </div>
      </div>
    </section>
  `;
}

function allQuestionRefs(context) {
  const part1 = context.part1Exam.questions
    .slice()
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map(item => ({ part: "part1", questionId: item.questionId, anchor: `q-part1-${item.questionId}` }));
  const part2 = context.part2Exam.questions
    .slice()
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map(item => ({ part: "part2", questionId: item.questionId, anchor: `q-part2-${item.questionId}` }));
  const part3 = context.part3Exam.questions
    .slice()
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map(item => ({ part: "part3", questionId: item.questionId, anchor: `q-part3-${item.questionId}` }));
  return [...part1, ...part2, ...part3];
}

function renderQuestionMap(context, grading) {
  const questionMap = document.getElementById("questionMap");
  if (!questionMap) return;
  questionMap.innerHTML = allQuestionRefs(context)
    .map((item, index) => {
      const answer = getUserAnswer(item.questionId, item.part);
      const result = state.submitted ? grading.results.get(answerKey(item.questionId, item.part)) : null;
      const cls = state.submitted
        ? result?.correct
          ? "border-[#2F5D50] bg-[#2F5D50] text-white"
          : "border-[#B91C1C] bg-red-50 text-[#B91C1C]"
        : answer
          ? "border-[#2F5D50] bg-[#EEF6F2] text-[#262422]"
          : "border-[#D6D3CD] bg-white text-[#262422]";
      return `<a class="grid h-10 min-w-10 place-items-center rounded-lg border text-sm font-extrabold ${cls}" href="#${escapeHtml(item.anchor)}">${index + 1}</a>`;
    })
    .join("");
}

function renderMeta(officialExam, grading) {
  const meta = document.getElementById("examMeta");
  if (!meta) return;
  const score = state.submitted
    ? `<div><span class="font-medium">Điểm:</span> ${grading.summary.total.correct}/${grading.summary.total.total}</div>`
    : "";
  meta.innerHTML = `
    <div><span class="font-bold text-[#262422]">Official:</span> ${escapeHtml(officialExam.id)}</div>
    <div><span class="font-bold text-[#262422]">Part 1:</span> ${escapeHtml(officialExam.partExamIds.part1)}</div>
    <div><span class="font-bold text-[#262422]">Part 2:</span> ${escapeHtml(officialExam.partExamIds.part2)}</div>
    <div><span class="font-bold text-[#262422]">Part 3:</span> ${escapeHtml(officialExam.partExamIds.part3)}</div>
    <div><span class="font-bold text-[#262422]">Tổng câu:</span> ${officialExam.questionCounts.total}</div>
    ${score}
  `;
}

function updateControls() {
  const timerPill = document.getElementById("timerPill");
  const timerPillRow = document.getElementById("timerPillRow");
  const submitButton = document.getElementById("submitExam");
  const toggleButton = document.getElementById("toggleAnswers");
  const clearButton = document.getElementById("clearSession");

  if (timerPill) {
    const secondsLeft = remainingSeconds();
    timerPill.textContent = formatClock(secondsLeft);
    timerPill.classList.toggle("text-[#B91C1C]", state.hasStarted && secondsLeft <= 300 && !state.submitted);
  }
  if (timerPillRow) {
    timerPillRow.classList.toggle("hidden", !state.hasStarted);
    timerPillRow.classList.toggle("flex", state.hasStarted);
  }
  if (submitButton) {
    submitButton.classList.toggle("hidden", !state.hasStarted || state.submitted);
    submitButton.textContent = "Nộp bài";
  }
  if (toggleButton) {
    toggleButton.classList.toggle("hidden", !state.hasStarted);
    toggleButton.textContent = state.showAnswers ? "Ẩn đáp án" : "Hiện đáp án";
  }
  if (clearButton) clearButton.classList.toggle("hidden", !state.hasStarted);
}

function tickTimer() {
  updateControls();
  if (state.hasStarted && !state.submitted && remainingSeconds() <= 0) {
    submitAttempt();
    render();
  }
}

function render() {
  const app = document.getElementById("app");
  const officialExam = getOfficialExam();
  const context = getPartContext(officialExam);
  const grading = gradeAttempt();

  renderMeta(officialExam, grading);
  updateControls();
  renderQuestionMap(context, grading);
  app.innerHTML = [
    renderScoreSummary(grading),
    renderPart1(context, grading),
    renderPart2(context, grading),
    renderPart3(context, grading),
  ].join("");
}

function refreshQuestionMap() {
  const officialExam = getOfficialExam();
  const context = getPartContext(officialExam);
  renderQuestionMap(context, gradeAttempt());
}

function findPart3Textarea(questionId) {
  return [...document.querySelectorAll('textarea[data-part="part3"][data-question-id]')]
    .find(textarea => textarea.dataset.questionId === questionId);
}

function insertKoreanCharacter(questionId, char) {
  const textarea = findPart3Textarea(questionId);
  if (!textarea || textarea.disabled) return;

  const start = textarea.selectionStart ?? textarea.value.length;
  const end = textarea.selectionEnd ?? textarea.value.length;
  const nextValue = `${textarea.value.slice(0, start)}${char}${textarea.value.slice(end)}`;
  textarea.value = nextValue;
  setUserAnswer(questionId, "part3", nextValue);
  textarea.focus();
  textarea.setSelectionRange(start + char.length, start + char.length);
  refreshQuestionMap();
}

function submitConfirmSummary() {
  const officialExam = getOfficialExam();
  const refs = allQuestionRefs(getPartContext(officialExam));
  const answeredCount = refs.filter(item => getUserAnswer(item.questionId, item.part).trim()).length;
  const unansweredCount = refs.length - answeredCount;
  if (unansweredCount <= 0) {
    return "Bạn đã trả lời tất cả câu hỏi. Sau khi nộp, bài làm sẽ được chấm và hiện đáp án.";
  }
  return `Bạn còn ${unansweredCount}/${refs.length} câu chưa trả lời. Sau khi nộp, bài làm sẽ được chấm và hiện đáp án.`;
}

function openSubmitConfirmModal() {
  const modal = document.getElementById("submitConfirmModal");
  const message = document.getElementById("submitConfirmMessage");
  const confirmButton = document.getElementById("confirmSubmitExam");
  if (!modal) return;
  if (message) message.textContent = submitConfirmSummary();
  modal.classList.remove("hidden");
  modal.classList.add("flex");
  confirmButton?.focus();
}

function closeSubmitConfirmModal() {
  const modal = document.getElementById("submitConfirmModal");
  if (!modal) return;
  modal.classList.add("hidden");
  modal.classList.remove("flex");
  document.getElementById("submitExam")?.focus();
}

function initEvents() {
  document.getElementById("toggleAnswers").addEventListener("click", () => {
    state.showAnswers = !state.showAnswers;
    persistSession();
    render();
  });

  document.getElementById("submitExam").addEventListener("click", () => {
    if (state.submitted) return;
    openSubmitConfirmModal();
  });

  document.getElementById("cancelSubmitConfirm").addEventListener("click", closeSubmitConfirmModal);

  document.getElementById("confirmSubmitExam").addEventListener("click", () => {
    closeSubmitConfirmModal();
    submitAttempt();
    render();
  });

  document.getElementById("submitConfirmModal").addEventListener("click", event => {
    if (event.target.id === "submitConfirmModal") closeSubmitConfirmModal();
  });

  document.addEventListener("keydown", event => {
    const modal = document.getElementById("submitConfirmModal");
    if (event.key === "Escape" && modal && !modal.classList.contains("hidden")) closeSubmitConfirmModal();
  });

  document.getElementById("clearSession").addEventListener("click", () => {
    sessionStorage.removeItem(SESSION_KEY);
  });

  document.getElementById("app").addEventListener("change", event => {
    const target = event.target;
    if (target.matches('input[type="radio"][data-question-id]')) {
      setUserAnswer(target.dataset.questionId, target.dataset.part, target.value);
      render();
    }
  });

  document.getElementById("app").addEventListener("click", event => {
    const target = event.target;
    const revealButton = target.closest("[data-korean-helper-toggle]");
    if (revealButton) {
      state.revealedKoreanKeyboards[koreanKeyboardKey(revealButton.dataset.questionId)] = true;
      persistSession();
      render();
      return;
    }

    const charButton = target.closest("[data-korean-char]");
    if (charButton) {
      insertKoreanCharacter(charButton.dataset.questionId, charButton.dataset.koreanChar);
    }
  });

  document.getElementById("app").addEventListener("input", event => {
    const target = event.target;
    if (target.matches("textarea[data-question-id]")) {
      setUserAnswer(target.dataset.questionId, target.dataset.part, target.value);
      refreshQuestionMap();
    }
  });
}

async function init() {
  document.getElementById("app").appendChild(document.getElementById("loadingTemplate").content.cloneNode(true));
  try {
    state.data = await loadAllData();
    loadSavedSession();
    if (!state.hasStarted) {
      window.location.href = "./exam-start.html";
      return;
    }
    initEvents();
    render();
    setInterval(tickTimer, 1000);
  } catch (error) {
    document.getElementById("app").innerHTML = `
      <section class="rounded-md border border-red-200 bg-red-50 p-5 text-red-950">
        <div class="font-semibold">Không tải được dữ liệu</div>
        <p class="mt-2 text-sm">${escapeHtml(error.message)}</p>
        <p class="mt-2 text-sm">Hãy mở trang qua local server ở root project, không mở trực tiếp file HTML.</p>
      </section>
    `;
  }
}

init();
