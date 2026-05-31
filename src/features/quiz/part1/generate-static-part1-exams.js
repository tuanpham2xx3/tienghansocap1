const fs = require("fs");
const path = require("path");
const { validatePart1Pools, writePoolArtifacts } = require("./validate-part1-pools");
const { buildPart1Pools, buildPart1Questions } = require("./part1-source-data");

const ROOT_DIR = path.resolve(__dirname, "../../../..");
const EXAMS_OUTPUT_PATH = path.join(ROOT_DIR, "src/data/korean/generated/part1-static-exams.json");
const REPORT_OUTPUT_PATH = path.join(ROOT_DIR, "src/data/korean/generated/part1-static-exams-report.json");

const PART1_FULL_SCOPE_CONFIG = {
  part: 1,
  examSetCount: 20,
  lessonQuota: {
    1: 1,
    2: 1,
    3: 1,
    4: 1,
    5: 2,
    6: 1,
    7: 1,
    8: 2,
  },
  maxSharedQuestionRatio: 0.4,
  randomSeed: "part1-v1",
  maxRetriesPerExam: 300,
};

function hashSeed(seed) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i += 1) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
}

function createSeededRandom(seed) {
  let value = hashSeed(seed)();
  return () => {
    value += 0x6d2b79f5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function sampleOne(items, random) {
  if (items.length === 0) throw new Error("Cannot sample from an empty list.");
  return items[Math.floor(random() * items.length)];
}

function shuffle(items, random) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function isValidQuestion(question) {
  return (
    question.validation.grammarInScope === true &&
    question.validation.vocabularyInScope === true &&
    question.validation.singleCorrectAnswer === true &&
    question.validation.reviewed === true
  );
}

function getCount(counts, id) {
  return counts.get(id)?.selectedCount ?? 0;
}

function cloneSelectionCounts(selectionCounts) {
  return new Map(
    [...selectionCounts.entries()].map(([id, count]) => [
      id,
      {
        questionId: count.questionId,
        selectedCount: count.selectedCount,
        selectedInExamIds: [...count.selectedInExamIds],
      },
    ]),
  );
}

function markQuestionSelected(selectionCounts, questionId, examId) {
  const current = selectionCounts.get(questionId) ?? {
    questionId,
    selectedCount: 0,
    selectedInExamIds: [],
  };

  current.selectedCount += 1;
  current.selectedInExamIds.push(examId);
  selectionCounts.set(questionId, current);
}

function selectBalancedQuestion(questions, selectionCounts, random, avoidQuestionIds = new Set()) {
  const validQuestions = questions
    .filter(isValidQuestion)
    .filter(question => !avoidQuestionIds.has(question.id));

  if (validQuestions.length === 0) {
    throw new Error("Pool không có câu hợp lệ để generate đề.");
  }

  const minimumSelectedCount = Math.min(
    ...validQuestions.map(question => getCount(selectionCounts, question.id)),
  );

  const leastUsedQuestions = validQuestions.filter(
    question => getCount(selectionCounts, question.id) === minimumSelectedCount,
  );

  return sampleOne(leastUsedQuestions, random);
}

function selectBalancedPools(pools, amount, poolUsageCounts, random) {
  if (pools.length < amount) {
    throw new Error(`Không đủ pool hợp lệ. Cần ${amount}, chỉ có ${pools.length}.`);
  }

  const remaining = [...pools];
  const selected = [];
  while (selected.length < amount) {
    const minimumUsage = Math.min(...remaining.map(pool => poolUsageCounts.get(pool.id) ?? 0));
    const leastUsedPools = remaining.filter(pool => (poolUsageCounts.get(pool.id) ?? 0) === minimumUsage);
    const chosen = sampleOne(leastUsedPools, random);
    selected.push(chosen);
    remaining.splice(remaining.findIndex(pool => pool.id === chosen.id), 1);
  }

  return selected;
}

function createStaticExamQuestion(question, displayOrder, random) {
  return {
    questionId: question.id,
    poolId: question.poolId,
    displayOrder,
    shuffledOptionIds: shuffle(question.options.map(option => option.id), random),
  };
}

function calculateSharedQuestionRatio(examA, examB) {
  const idsA = new Set(examA.questions.map(item => item.questionId));
  const sharedCount = examB.questions.filter(item => idsA.has(item.questionId)).length;
  return sharedCount / examA.questionCount;
}

function isCorrectAnswer(question, selectedOptionId) {
  return selectedOptionId === question.correctOptionId;
}

function buildExamCandidate({
  examId,
  pools,
  config,
  selectionCounts,
  poolUsageCounts,
  random,
  existingExams,
}) {
  const candidateSelectionCounts = cloneSelectionCounts(selectionCounts);
  const questions = [];
  const usedQuestionIds = new Set();
  const validPoolsByLesson = new Map();

  for (const pool of pools) {
    if (!pool.questions.some(isValidQuestion)) continue;
    const current = validPoolsByLesson.get(pool.targetLesson) ?? [];
    current.push(pool);
    validPoolsByLesson.set(pool.targetLesson, current);
  }

  for (const [lessonText, amount] of Object.entries(config.lessonQuota)) {
    const lesson = Number(lessonText);
    const lessonPools = validPoolsByLesson.get(lesson) ?? [];
    const selectedPools = selectBalancedPools(lessonPools, amount, poolUsageCounts, random);

    for (const pool of selectedPools) {
      const avoidQuestionIds = new Set(usedQuestionIds);
      for (const existingExam of existingExams) {
        if (calculatePotentialSharedCount(questions, existingExam) >= 4) {
          for (const item of existingExam.questions) avoidQuestionIds.add(item.questionId);
        }
      }
      const question = selectBalancedQuestion(pool.questions, candidateSelectionCounts, random, avoidQuestionIds);
      questions.push(question);
      usedQuestionIds.add(question.id);
      markQuestionSelected(candidateSelectionCounts, question.id, examId);
    }
  }

  const shuffledQuestions = shuffle(questions, random);
  const exam = {
    id: examId,
    part: 1,
    scope: {
      fromLesson: 1,
      toLesson: 8,
    },
    questionCount: 10,
    generatedAt: "2026-05-31T00:00:00.000Z",
    generationSeed: config.randomSeed,
    questions: shuffledQuestions.map((question, index) =>
      createStaticExamQuestion(question, index + 1, random),
    ),
  };

  const overlapFailed = existingExams.some(
    existingExam => calculateSharedQuestionRatio(exam, existingExam) > config.maxSharedQuestionRatio,
  );

  return {
    exam,
    selectionCounts: candidateSelectionCounts,
    overlapFailed,
  };
}

function calculatePotentialSharedCount(candidateQuestions, existingExam) {
  const existingIds = new Set(existingExam.questions.map(item => item.questionId));
  return candidateQuestions.filter(question => existingIds.has(question.id)).length;
}

function buildGenerationReport(exams, questions, selectionCounts, config) {
  const questionSelectionCounts = questions.map(question => {
    const current = selectionCounts.get(question.id);
    return {
      questionId: question.id,
      poolId: question.poolId,
      selectedCount: current?.selectedCount ?? 0,
      selectedInExamIds: current?.selectedInExamIds ?? [],
    };
  });

  const examOverlapChecks = [];
  for (let i = 0; i < exams.length; i += 1) {
    for (let j = i + 1; j < exams.length; j += 1) {
      const sharedQuestionRatio = calculateSharedQuestionRatio(exams[i], exams[j]);
      examOverlapChecks.push({
        examIdA: exams[i].id,
        examIdB: exams[j].id,
        sharedQuestionCount: Math.round(sharedQuestionRatio * exams[i].questionCount),
        sharedQuestionRatio,
        passed: sharedQuestionRatio <= config.maxSharedQuestionRatio,
      });
    }
  }

  return {
    examSetCount: exams.length,
    totalSelectedQuestionSlots: exams.reduce((sum, exam) => sum + exam.questions.length, 0),
    uniqueQuestionsUsed: questionSelectionCounts.filter(item => item.selectedCount > 0).length,
    unusedQuestionIds: questionSelectionCounts
      .filter(item => item.selectedCount === 0)
      .map(item => item.questionId),
    questionSelectionCounts,
    examOverlapChecks,
  };
}

function generateStaticPart1Exams(config = PART1_FULL_SCOPE_CONFIG) {
  const pools = buildPart1Pools();
  const questions = buildPart1Questions();
  const validation = validatePart1Pools(pools);
  if (!validation.valid) {
    throw new Error(`Cannot generate exams from invalid pools:\n${validation.errors.join("\n")}`);
  }

  const random = createSeededRandom(config.randomSeed ?? "part1");
  const exams = [];
  let selectionCounts = new Map();
  const poolUsageCounts = new Map();

  for (let examIndex = 0; examIndex < config.examSetCount; examIndex += 1) {
    const examId = `PART1_EXAM_${String(examIndex + 1).padStart(3, "0")}`;
    let acceptedCandidate = null;

    for (let attempt = 1; attempt <= config.maxRetriesPerExam; attempt += 1) {
      const candidate = buildExamCandidate({
        examId,
        pools,
        config,
        selectionCounts,
        poolUsageCounts,
        random,
        existingExams: exams,
      });

      if (!candidate.overlapFailed) {
        acceptedCandidate = candidate;
        break;
      }
    }

    if (!acceptedCandidate) {
      throw new Error(
        `Không thể sinh ${examId} sau ${config.maxRetriesPerExam} lần retry với maxSharedQuestionRatio=${config.maxSharedQuestionRatio}.`,
      );
    }

    exams.push(acceptedCandidate.exam);
    selectionCounts = acceptedCandidate.selectionCounts;
    for (const item of acceptedCandidate.exam.questions) {
      poolUsageCounts.set(item.poolId, (poolUsageCounts.get(item.poolId) ?? 0) + 1);
    }
  }

  return {
    exams,
    report: buildGenerationReport(exams, questions, selectionCounts, config),
  };
}

function writeStaticPart1ExamArtifacts() {
  writePoolArtifacts();
  const { exams, report } = generateStaticPart1Exams();

  fs.mkdirSync(path.dirname(EXAMS_OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(EXAMS_OUTPUT_PATH, `${JSON.stringify(exams, null, 2)}\n`, "utf8");
  fs.writeFileSync(REPORT_OUTPUT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  return {
    exams,
    report,
    examsPath: EXAMS_OUTPUT_PATH,
    reportPath: REPORT_OUTPUT_PATH,
  };
}

if (require.main === module) {
  const result = writeStaticPart1ExamArtifacts();
  console.log(`Generated ${result.exams.length} static Part 1 exams.`);
  console.log(`Wrote ${path.relative(ROOT_DIR, result.examsPath)}`);
  console.log(`Wrote ${path.relative(ROOT_DIR, result.reportPath)}`);
}

module.exports = {
  PART1_FULL_SCOPE_CONFIG,
  calculateSharedQuestionRatio,
  createSeededRandom,
  generateStaticPart1Exams,
  isCorrectAnswer,
  isValidQuestion,
  selectBalancedQuestion,
  writeStaticPart1ExamArtifacts,
};
