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
  showAnswers: false,
  submitted: false,
  userAnswers: {},
};

const labels = ["①", "②", "③", "④"];

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

function resetAttempt() {
  state.submitted = false;
  state.showAnswers = false;
  state.userAnswers = {};
}

function answerKey(questionId, part) {
  return `${state.selectedOfficialExamId}:${part}:${questionId}`;
}

function getUserAnswer(questionId, part) {
  return state.userAnswers[answerKey(questionId, part)] ?? "";
}

function setUserAnswer(questionId, part, value) {
  state.userAnswers[answerKey(questionId, part)] = value;
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
    ? "bg-emerald-100 text-emerald-800 ring-emerald-200"
    : "bg-rose-100 text-rose-800 ring-rose-200";
  return `<span class="rounded-md px-2 py-1 text-xs font-semibold ring-1 ${cls}">${result?.correct ? "Đúng" : "Sai"}</span>`;
}

function optionClass({ optionId, selectedOptionId, correctOptionId }) {
  if (!state.submitted && !state.showAnswers) {
    return selectedOptionId === optionId
      ? "border-zinc-900 bg-zinc-100"
      : "border-zinc-200 bg-white hover:border-zinc-400";
  }
  if (optionId === correctOptionId) return "border-emerald-400 bg-emerald-50 text-emerald-950";
  if (selectedOptionId === optionId && selectedOptionId !== correctOptionId) {
    return "border-rose-300 bg-rose-50 text-rose-950";
  }
  return "border-zinc-200 bg-white";
}

function renderOptionList(question, shuffledOptionIds, part, answerKeyItem) {
  const optionById = byId(question.options);
  const selectedOptionId = getUserAnswer(question.id, part);
  const correctOptionId = answerKeyItem?.correctOptionId ?? question.correctOptionId;

  return `
    <div class="mt-3 grid gap-2 sm:grid-cols-2">
      ${shuffledOptionIds
        .map((optionId, index) => {
          const option = optionById.get(optionId);
          const inputId = `${part}-${question.id}-${optionId}`;
          return `
            <label for="${escapeHtml(inputId)}" class="flex cursor-pointer items-start gap-2 rounded-md border px-3 py-2 text-sm ${optionClass({
              optionId,
              selectedOptionId,
              correctOptionId,
            })}">
              <input
                id="${escapeHtml(inputId)}"
                class="mt-1"
                type="radio"
                name="${escapeHtml(part)}-${escapeHtml(question.id)}"
                value="${escapeHtml(optionId)}"
                data-question-id="${escapeHtml(question.id)}"
                data-part="${escapeHtml(part)}"
                ${selectedOptionId === optionId ? "checked" : ""}
                ${state.submitted ? "disabled" : ""}
              />
              <span><span class="mr-2 font-semibold">${labels[index]}</span>${escapeHtml(option?.text ?? optionId)}</span>
            </label>
          `;
        })
        .join("")}
    </div>
    ${
      state.showAnswers || state.submitted
        ? `<div class="mt-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-950">
            <b>Đáp án:</b> ${escapeHtml(answerKeyItem?.correctValue ?? question.correctValue)}
            <span class="text-amber-800">(${escapeHtml(correctOptionId)})</span>
            <div class="mt-1 text-amber-900">${escapeHtml(answerKeyItem?.explanationVi ?? question.explanationVi ?? "")}</div>
          </div>`
        : ""
    }
  `;
}

function renderQuestionCard(number, title, bodyHtml, meta = "", badge = "") {
  return `
    <article class="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
      <div class="flex items-start justify-between gap-3">
        <div class="flex items-center gap-2">
          <div class="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-zinc-900 text-sm font-semibold text-white">${number}</div>
          <h3 class="text-sm font-semibold text-zinc-900">${escapeHtml(title)}</h3>
        </div>
        <div class="flex items-center gap-2">
          ${badge}
          ${meta ? `<div class="text-xs text-zinc-500">${escapeHtml(meta)}</div>` : ""}
        </div>
      </div>
      <div class="mt-3">${bodyHtml}</div>
    </article>
  `;
}

function sectionShell(id, title, subtitle, innerHtml) {
  return `
    <section id="${id}" class="scroll-mt-24 rounded-md border border-zinc-200 bg-zinc-50 p-4">
      <div class="mb-4">
        <h2 class="text-lg font-semibold">${escapeHtml(title)}</h2>
        <p class="text-sm text-zinc-600">${escapeHtml(subtitle)}</p>
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
        <div class="whitespace-pre-wrap text-base leading-7">${formatMultiline(question.stem)}</div>
        ${renderOptionList(question, item.shuffledOptionIds, "part1")}
      `;
      return renderQuestionCard(
        item.displayOrder,
        question.knowledgeTarget,
        body,
        question.id,
        resultBadge(question.id, "part1", grading),
      );
    })
    .join("");
  return sectionShell("part1", "Part 1 - Từ vựng và ngữ pháp", `${context.part1Exam.id} · 10 câu trắc nghiệm`, cards);
}

function renderStimulus(stimulus) {
  if (!stimulus) return "";
  return `
    <div class="mb-3 rounded-md border border-dashed border-zinc-300 bg-zinc-50 p-3 text-sm">
      <div class="mb-2 font-semibold">${escapeHtml(stimulus.title ?? "Thông tin")}</div>
      <pre class="whitespace-pre-wrap font-sans leading-6 text-zinc-800">${escapeHtml(stimulus.fallbackText)}</pre>
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
        ? `<div class="rounded-md bg-zinc-50 p-3 text-base leading-7">${formatMultiline(question.readingText)}</div>`
        : "";
      const prompt = question.prompt ? `<div class="mb-2 text-sm font-medium">${escapeHtml(question.prompt)}</div>` : "";
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
      );
    })
    .join("");

  return sectionShell("part2", "Part 2 - Đọc hiểu", `${context.part2Exam.id} · 9 câu đọc hiểu`, cards);
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
        ? `<div class="mt-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-950">
            <b>Đáp án mẫu:</b> ${escapeHtml(answer.sampleAnswer)}
            <div class="mt-2"><b>Đáp án chấp nhận:</b></div>
            <ul class="mt-1 list-disc pl-5">${answer.acceptedAnswers.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
            <div class="mt-2 text-amber-900">${escapeHtml(answer.explanationVi)}</div>
          </div>`
        : "";
      const body = `
        <div class="rounded-md bg-zinc-50 p-3 text-base leading-7">${formatMultiline(question.prompt)}</div>
        <textarea
          class="mt-3 min-h-24 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm leading-6 shadow-sm focus:border-zinc-900 focus:outline-none"
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
      );
    })
    .join("");

  return sectionShell("part3", "Part 3 - Dịch câu", `${context.part3Exam.id} · 8 câu tự luận`, cards);
}

function renderScoreSummary(grading) {
  if (!state.submitted) return "";
  const { summary } = grading;
  return `
    <section class="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-emerald-950">
      <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div class="text-sm font-semibold">Kết quả</div>
          <div class="mt-1 text-2xl font-bold">${summary.total.correct}/${summary.total.total}</div>
        </div>
        <div class="grid gap-2 text-sm sm:grid-cols-3">
          <div class="rounded-md bg-white/70 px-3 py-2">Part 1: <b>${summary.part1.correct}/${summary.part1.total}</b></div>
          <div class="rounded-md bg-white/70 px-3 py-2">Part 2: <b>${summary.part2.correct}/${summary.part2.total}</b></div>
          <div class="rounded-md bg-white/70 px-3 py-2">Part 3: <b>${summary.part3.correct}/${summary.part3.total}</b></div>
        </div>
      </div>
    </section>
  `;
}

function renderMeta(officialExam, grading) {
  const meta = document.getElementById("examMeta");
  const score = state.submitted
    ? `<div><span class="font-medium">Điểm:</span> ${grading.summary.total.correct}/${grading.summary.total.total}</div>`
    : "";
  meta.innerHTML = `
    <div><span class="font-medium">Official:</span> ${escapeHtml(officialExam.id)}</div>
    <div><span class="font-medium">Part 1:</span> ${escapeHtml(officialExam.partExamIds.part1)}</div>
    <div><span class="font-medium">Part 2:</span> ${escapeHtml(officialExam.partExamIds.part2)}</div>
    <div><span class="font-medium">Part 3:</span> ${escapeHtml(officialExam.partExamIds.part3)}</div>
    <div><span class="font-medium">Tổng câu:</span> ${officialExam.questionCounts.total}</div>
    ${score}
  `;
}

function render() {
  const app = document.getElementById("app");
  const officialExam = getOfficialExam();
  const context = getPartContext(officialExam);
  const grading = gradeAttempt();

  renderMeta(officialExam, grading);
  document.getElementById("toggleAnswers").textContent = state.showAnswers ? "Ẩn đáp án" : "Hiện đáp án";
  document.getElementById("submitExam").textContent = state.submitted ? "Làm lại" : "Nộp bài";
  app.innerHTML = [
    renderScoreSummary(grading),
    renderPart1(context, grading),
    renderPart2(context, grading),
    renderPart3(context, grading),
  ].join("");
}

function initSelect() {
  const select = document.getElementById("examSelect");
  select.innerHTML = state.data.officialExams
    .map(exam => `<option value="${escapeHtml(exam.id)}">${escapeHtml(exam.title)} (${escapeHtml(exam.id)})</option>`)
    .join("");
  select.value = state.selectedOfficialExamId;
  select.addEventListener("change", event => {
    state.selectedOfficialExamId = event.target.value;
    resetAttempt();
    render();
  });
}

function initEvents() {
  document.getElementById("toggleAnswers").addEventListener("click", () => {
    state.showAnswers = !state.showAnswers;
    render();
  });

  document.getElementById("submitExam").addEventListener("click", () => {
    if (state.submitted) {
      resetAttempt();
    } else {
      state.submitted = true;
      state.showAnswers = true;
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    render();
  });

  document.getElementById("app").addEventListener("change", event => {
    const target = event.target;
    if (target.matches('input[type="radio"][data-question-id]')) {
      setUserAnswer(target.dataset.questionId, target.dataset.part, target.value);
    }
  });

  document.getElementById("app").addEventListener("input", event => {
    const target = event.target;
    if (target.matches("textarea[data-question-id]")) {
      setUserAnswer(target.dataset.questionId, target.dataset.part, target.value);
    }
  });
}

async function init() {
  document.getElementById("app").appendChild(document.getElementById("loadingTemplate").content.cloneNode(true));
  try {
    state.data = await loadAllData();
    initSelect();
    initEvents();
    render();
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
