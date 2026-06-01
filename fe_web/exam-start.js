const OFFICIAL_EXAMS_PATH = "../src/data/korean/generated/official-exams.json";
const SESSION_KEY = "koreanMockExamSession:v1";

const state = {
  exams: [],
  selectedExamId: "OFFICIAL_EXAM_001",
  durationMinutes: 45,
};

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function getSavedSession() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? "null");
    return saved && typeof saved === "object" ? saved : null;
  } catch {
    sessionStorage.removeItem(SESSION_KEY);
    return null;
  }
}

function formatRemaining(endsAt) {
  const seconds = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
  const minutes = Math.floor(seconds / 60);
  const restSeconds = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(restSeconds).padStart(2, "0")}`;
}

async function loadExams() {
  const response = await fetch(OFFICIAL_EXAMS_PATH);
  if (!response.ok) throw new Error("Không tải được danh sách đề.");
  return response.json();
}

function selectedExam() {
  return state.exams.find(exam => exam.id === state.selectedExamId) ?? state.exams[0];
}

function renderExamSelect() {
  const select = document.getElementById("examSelect");
  select.innerHTML = state.exams
    .map(exam => `<option value="${escapeHtml(exam.id)}">${escapeHtml(exam.title)} (${escapeHtml(exam.id)})</option>`)
    .join("");
  select.value = state.selectedExamId;
}

function renderDurationOptions() {
  document.querySelectorAll("[data-minutes]").forEach(button => {
    const isActive = Number(button.dataset.minutes) === state.durationMinutes;
    button.classList.toggle("border-[#2F5D50]", isActive);
    button.classList.toggle("bg-[#EEF6F2]", isActive);
  });
  document.getElementById("customDurationInput").value = state.durationMinutes;
}

function renderSummary() {
  const exam = selectedExam();
  document.getElementById("examSummary").innerHTML = `
    <div class="rounded-xl border border-[#D9CBB8] bg-[#FFF8EE] p-4">
      <div class="font-extrabold text-[#262422]">${escapeHtml(exam.title)}</div>
      <div class="mt-1 text-xs font-bold">${escapeHtml(exam.id)}</div>
    </div>
    <div class="grid grid-cols-2 gap-2">
      <div class="rounded-xl border border-[#D9CBB8] p-3">Part 1<br /><b class="text-[#262422]">${exam.questionCounts.part1} câu</b></div>
      <div class="rounded-xl border border-[#D9CBB8] p-3">Part 2<br /><b class="text-[#262422]">${exam.questionCounts.part2} câu</b></div>
      <div class="rounded-xl border border-[#D9CBB8] p-3">Part 3<br /><b class="text-[#262422]">${exam.questionCounts.part3} câu</b></div>
      <div class="rounded-xl border border-[#D9CBB8] p-3">Tổng<br /><b class="text-[#262422]">${exam.questionCounts.total} câu</b></div>
    </div>
    <div class="rounded-xl border border-[#D9CBB8] bg-white p-4">
      Thời gian chọn: <b class="text-[#262422]">${state.durationMinutes} phút</b>
    </div>
  `;
}

function renderResumePanel() {
  const saved = getSavedSession();
  const panel = document.getElementById("resumePanel");
  if (!saved?.hasStarted || saved.submitted) {
    panel.classList.add("hidden");
    panel.innerHTML = "";
    return;
  }

  panel.classList.remove("hidden");
  panel.innerHTML = `
    <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div>
        <div class="text-sm font-extrabold text-[#2F5D50]">Đang có bài thi chưa nộp</div>
        <div class="mt-1 text-sm font-semibold text-[#262422]">${escapeHtml(saved.selectedOfficialExamId)} · còn ${formatRemaining(saved.endsAt)}</div>
      </div>
      <a class="inline-flex h-11 items-center justify-center rounded-lg bg-[#2F5D50] px-4 text-sm font-bold text-white hover:bg-[#254C42]" href="./exam.html">Tiếp tục làm bài</a>
    </div>
  `;
}

function startExam() {
  const exam = selectedExam();
  const durationMinutes = Math.min(180, Math.max(5, Number(state.durationMinutes) || 45));
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({
    selectedOfficialExamId: exam.id,
    durationMinutes,
    customDurationMinutes: durationMinutes,
    hasStarted: true,
    endsAt: Date.now() + durationMinutes * 60 * 1000,
    showAnswers: false,
    submitted: false,
    userAnswers: {},
    revealedKoreanKeyboards: {},
    savedAt: Date.now(),
  }));
  window.location.href = "./exam.html";
}

function initEvents() {
  document.getElementById("examSelect").addEventListener("change", event => {
    state.selectedExamId = event.target.value;
    renderSummary();
  });

  document.querySelectorAll("[data-minutes]").forEach(button => {
    button.addEventListener("click", () => {
      state.durationMinutes = Number(button.dataset.minutes);
      renderDurationOptions();
      renderSummary();
    });
  });

  document.getElementById("customDurationInput").addEventListener("input", event => {
    state.durationMinutes = Math.min(180, Math.max(5, Number(event.target.value) || 45));
    renderDurationOptions();
    renderSummary();
  });

  document.getElementById("startExam").addEventListener("click", startExam);
}

async function init() {
  try {
    state.exams = await loadExams();
    const saved = getSavedSession();
    if (saved?.selectedOfficialExamId) state.selectedExamId = saved.selectedOfficialExamId;
    if (Number.isFinite(saved?.durationMinutes)) state.durationMinutes = saved.durationMinutes;
    renderExamSelect();
    renderDurationOptions();
    renderSummary();
    renderResumePanel();
    initEvents();
  } catch (error) {
    document.getElementById("examSummary").innerHTML = `
      <div class="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-950">${escapeHtml(error.message)}</div>
    `;
  }
}

init();
