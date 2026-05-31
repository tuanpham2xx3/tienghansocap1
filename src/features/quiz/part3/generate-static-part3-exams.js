const fs = require("fs");
const path = require("path");
const { createSeededRandom } = require("../part1/generate-static-part1-exams");
const { buildPart3Pools, buildPart3Questions } = require("./part3-source-data");
const { validatePart3Pools, writePart3PoolArtifacts } = require("./validate-part3-pools");

const ROOT_DIR = path.resolve(__dirname, "../../../..");
const EXAMS_OUTPUT_PATH = path.join(ROOT_DIR, "src/data/korean/generated/part3-static-exams.json");
const ANSWER_KEYS_OUTPUT_PATH = path.join(ROOT_DIR, "src/data/korean/generated/part3-static-answer-keys.json");
const REPORT_OUTPUT_PATH = path.join(ROOT_DIR, "src/data/korean/generated/part3-static-exams-report.json");

const PART3_STATIC_EXAM_CONFIG = {
  part: 3,
  examSetCount: 20,
  questionCount: 8,
  directionQuota: {
    vi_to_ko: 4,
    ko_to_vi: 4,
  },
  maxSharedQuestionRatio: 0.375,
  randomSeed: "part3-v1",
  maxRetriesPerExam: 500,
};

const COVERAGE_GROUPS = {
  lifeCommunication: new Set(["invitation", "preference", "family_job", "past_activity", "habit_frequency"]),
  timeLocationPast: new Set(["past_activity", "location_existence", "time_schedule"]),
  desireRequestPlan: new Set(["invitation", "desire_travel", "reason_request", "plan_intention", "shopping_quantity"]),
  shoppingFoodDescription: new Set(["shopping_quantity", "contrast_description", "reason_request", "habit_frequency"]),
};

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

function isValidPart3Question(question) {
  return (
    question.validation.grammarInScope === true &&
    question.validation.vocabularyInScope === true &&
    question.validation.translationNatural === true &&
    question.validation.multipleValidAnswersHandled === true
  );
}

function cloneSelectionCounts(counts) {
  return new Map(
    [...counts.entries()].map(([id, stat]) => [
      id,
      {
        questionId: stat.questionId,
        selectedCount: stat.selectedCount,
        selectedInExamIds: [...stat.selectedInExamIds],
      },
    ]),
  );
}

function markPart3QuestionSelected(questionId, examId, counts) {
  const stat = counts.get(questionId) ?? {
    questionId,
    selectedCount: 0,
    selectedInExamIds: [],
  };
  stat.selectedCount += 1;
  stat.selectedInExamIds.push(examId);
  counts.set(questionId, stat);
}

function selectBalancedPart3Question(candidates, counts, random, usedSemanticGroupIds) {
  const valid = candidates
    .filter(isValidPart3Question)
    .filter(question => !usedSemanticGroupIds.has(question.semanticGroupId));

  if (valid.length === 0) {
    throw new Error("Part 3 pool không có câu hợp lệ để generate đề.");
  }

  const minCount = Math.min(...valid.map(question => counts.get(question.id)?.selectedCount ?? 0));
  const leastUsed = valid.filter(question => (counts.get(question.id)?.selectedCount ?? 0) === minCount);
  return sampleOne(leastUsed, random);
}

function selectBalancedPools(pools, amount, poolUsageCounts, random, usedPoolIds) {
  const remaining = pools.filter(pool => !usedPoolIds.has(pool.id));
  if (remaining.length < amount) {
    throw new Error(`Không đủ pool Part 3 hợp lệ. Cần ${amount}, chỉ có ${remaining.length}.`);
  }

  const selected = [];
  while (selected.length < amount) {
    const minUsage = Math.min(...remaining.map(pool => poolUsageCounts.get(pool.id) ?? 0));
    const leastUsed = remaining.filter(pool => (poolUsageCounts.get(pool.id) ?? 0) === minUsage);
    const chosen = sampleOne(leastUsed, random);
    selected.push(chosen);
    remaining.splice(remaining.findIndex(pool => pool.id === chosen.id), 1);
  }
  return selected;
}

function calculateSharedQuestionRatio(examA, examB) {
  const idsA = new Set(examA.questions.map(item => item.questionId));
  const sharedCount = examB.questions.filter(item => idsA.has(item.questionId)).length;
  return sharedCount / examA.questionCount;
}

function evaluateCoverage(exam, questionById) {
  const questions = exam.questions.map(item => questionById.get(item.questionId));
  const hasSkillFrom = group => questions.some(question => group.has(question.skill));
  const lifeCount = questions.filter(question => COVERAGE_GROUPS.lifeCommunication.has(question.skill)).length;
  return {
    examId: exam.id,
    viToKoCount: questions.filter(question => question.direction === "vi_to_ko").length,
    koToViCount: questions.filter(question => question.direction === "ko_to_vi").length,
    skillCoveragePassed:
      lifeCount >= 2 &&
      hasSkillFrom(COVERAGE_GROUPS.timeLocationPast) &&
      hasSkillFrom(COVERAGE_GROUPS.desireRequestPlan) &&
      hasSkillFrom(COVERAGE_GROUPS.shoppingFoodDescription),
  };
}

function buildExamCandidate({ examId, pools, config, selectionCounts, poolUsageCounts, random }) {
  const candidateCounts = cloneSelectionCounts(selectionCounts);
  const usedPoolIds = new Set();
  const usedSemanticGroupIds = new Set();
  const selectedByDirection = {
    vi_to_ko: [],
    ko_to_vi: [],
  };

  for (const [direction, amount] of Object.entries(config.directionQuota)) {
    const directionPools = pools.filter(
      pool => pool.direction === direction && pool.questions.some(isValidPart3Question),
    );
    const selectedPools = selectBalancedPools(directionPools, amount, poolUsageCounts, random, usedPoolIds);

    for (const pool of selectedPools) {
      const question = selectBalancedPart3Question(pool.questions, candidateCounts, random, usedSemanticGroupIds);
      selectedByDirection[direction].push(question);
      usedPoolIds.add(pool.id);
      usedSemanticGroupIds.add(question.semanticGroupId);
      markPart3QuestionSelected(question.id, examId, candidateCounts);
    }
  }

  const orderedQuestions = [
    ...shuffle(selectedByDirection.vi_to_ko, random),
    ...shuffle(selectedByDirection.ko_to_vi, random),
  ];

  return {
    exam: {
      id: examId,
      part: 3,
      questionCount: 8,
      directionQuota: {
        vi_to_ko: 4,
        ko_to_vi: 4,
      },
      generatedAt: "2026-05-31T00:00:00.000Z",
      generationSeed: config.randomSeed,
      questions: orderedQuestions.map((question, index) => ({
        questionId: question.id,
        poolId: question.poolId,
        direction: question.direction,
        displayOrder: index + 1,
      })),
    },
    selectionCounts: candidateCounts,
  };
}

function buildAnswerKeys(exams, questionById) {
  return exams.map(exam => ({
    examId: exam.id,
    answers: exam.questions.map(item => {
      const question = questionById.get(item.questionId);
      return {
        questionId: item.questionId,
        displayOrder: item.displayOrder,
        direction: item.direction,
        sampleAnswer: question.sampleAnswer,
        acceptedAnswers: question.acceptedAnswers,
        explanationVi: question.explanationVi,
      };
    }),
  }));
}

function buildReport(exams, questions, selectionCounts, questionById, config) {
  const questionSelectionCounts = questions.map(question => {
    const stat = selectionCounts.get(question.id);
    return {
      questionId: question.id,
      poolId: question.poolId,
      direction: question.direction,
      selectedCount: stat?.selectedCount ?? 0,
      selectedInExamIds: stat?.selectedInExamIds ?? [],
    };
  });

  const examOverlapChecks = [];
  for (let i = 0; i < exams.length; i += 1) {
    for (let j = i + 1; j < exams.length; j += 1) {
      const ratio = calculateSharedQuestionRatio(exams[i], exams[j]);
      examOverlapChecks.push({
        examIdA: exams[i].id,
        examIdB: exams[j].id,
        sharedQuestionCount: Math.round(ratio * exams[i].questionCount),
        sharedQuestionRatio: ratio,
        passed: ratio <= config.maxSharedQuestionRatio,
      });
    }
  }

  return {
    examSetCount: exams.length,
    totalSelectedQuestionSlots: exams.reduce((sum, exam) => sum + exam.questions.length, 0),
    uniqueQuestionsUsed: questionSelectionCounts.filter(item => item.selectedCount > 0).length,
    unusedQuestionIds: questionSelectionCounts.filter(item => item.selectedCount === 0).map(item => item.questionId),
    questionSelectionCounts,
    examOverlapChecks,
    coverageChecks: exams.map(exam => evaluateCoverage(exam, questionById)),
  };
}

function generateStaticPart3Exams(config = PART3_STATIC_EXAM_CONFIG) {
  const pools = buildPart3Pools();
  const questions = buildPart3Questions();
  const questionById = new Map(questions.map(question => [question.id, question]));
  const validation = validatePart3Pools(pools);
  if (!validation.valid) {
    throw new Error(`Cannot generate Part 3 exams from invalid pools:\n${validation.errors.join("\n")}`);
  }

  const random = createSeededRandom(config.randomSeed ?? "part3");
  const exams = [];
  let selectionCounts = new Map();
  const poolUsageCounts = new Map();

  for (let examIndex = 0; examIndex < config.examSetCount; examIndex += 1) {
    const examId = `PART3_EXAM_${String(examIndex + 1).padStart(3, "0")}`;
    let accepted = null;

    for (let attempt = 1; attempt <= config.maxRetriesPerExam; attempt += 1) {
      const candidate = buildExamCandidate({
        examId,
        pools,
        config,
        selectionCounts,
        poolUsageCounts,
        random,
      });

      const coverage = evaluateCoverage(candidate.exam, questionById);
      const overlapFailed = exams.some(
        exam => calculateSharedQuestionRatio(candidate.exam, exam) > config.maxSharedQuestionRatio,
      );

      if (coverage.skillCoveragePassed && !overlapFailed) {
        accepted = candidate;
        break;
      }
    }

    if (!accepted) {
      throw new Error(`Không thể sinh ${examId} sau ${config.maxRetriesPerExam} lần retry.`);
    }

    exams.push(accepted.exam);
    selectionCounts = accepted.selectionCounts;
    for (const item of accepted.exam.questions) {
      poolUsageCounts.set(item.poolId, (poolUsageCounts.get(item.poolId) ?? 0) + 1);
    }
  }

  const answerKeys = buildAnswerKeys(exams, questionById);
  const report = buildReport(exams, questions, selectionCounts, questionById, config);
  return { exams, answerKeys, report };
}

function writeStaticPart3ExamArtifacts() {
  writePart3PoolArtifacts();
  const { exams, answerKeys, report } = generateStaticPart3Exams();

  fs.mkdirSync(path.dirname(EXAMS_OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(EXAMS_OUTPUT_PATH, `${JSON.stringify(exams, null, 2)}\n`, "utf8");
  fs.writeFileSync(ANSWER_KEYS_OUTPUT_PATH, `${JSON.stringify(answerKeys, null, 2)}\n`, "utf8");
  fs.writeFileSync(REPORT_OUTPUT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  return {
    exams,
    answerKeys,
    report,
    examsPath: EXAMS_OUTPUT_PATH,
    answerKeysPath: ANSWER_KEYS_OUTPUT_PATH,
    reportPath: REPORT_OUTPUT_PATH,
  };
}

if (require.main === module) {
  const result = writeStaticPart3ExamArtifacts();
  console.log(`Generated ${result.exams.length} static Part 3 exams.`);
  console.log(`Wrote ${path.relative(ROOT_DIR, result.examsPath)}`);
  console.log(`Wrote ${path.relative(ROOT_DIR, result.answerKeysPath)}`);
  console.log(`Wrote ${path.relative(ROOT_DIR, result.reportPath)}`);
}

module.exports = {
  PART3_STATIC_EXAM_CONFIG,
  calculateSharedQuestionRatio,
  generateStaticPart3Exams,
  isValidPart3Question,
  selectBalancedPart3Question,
  writeStaticPart3ExamArtifacts,
};
