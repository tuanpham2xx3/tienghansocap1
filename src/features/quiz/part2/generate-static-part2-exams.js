const fs = require("fs");
const path = require("path");
const { createSeededRandom } = require("../part1/generate-static-part1-exams");
const { buildPart2Pools, buildPart2Questions } = require("./part2-source-data");
const { validatePart2Pools, writePart2PoolArtifacts } = require("./validate-part2-pools");

const ROOT_DIR = path.resolve(__dirname, "../../../..");
const EXAMS_OUTPUT_PATH = path.join(ROOT_DIR, "src/data/korean/generated/part2/part2-static-exams.json");
const ANSWER_KEYS_OUTPUT_PATH = path.join(ROOT_DIR, "src/data/korean/generated/part2/part2-static-answer-keys.json");
const REPORT_OUTPUT_PATH = path.join(ROOT_DIR, "src/data/korean/generated/part2/part2-static-exams-report.json");

const PART2_STATIC_EXAM_CONFIG = {
  part: 2,
  examSetCount: 20,
  questionCount: 9,
  sectionQuota: {
    topic_identification: 5,
    visual_incorrect_statement: 2,
    passage_correct_statement: 2,
  },
  maxSharedQuestionRatio: 1 / 3,
  randomSeed: "part2-v1",
  maxRetriesPerExam: 500,
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

function hasVietnameseInDisplayedPart2Text(question) {
  const displayedText = [
    question.readingText,
    question.correctValue,
    question.stimulus?.fallbackText,
    ...question.options.map(option => option.text),
  ]
    .filter(Boolean)
    .join(" ");

  return /[ăâđêôơưÁÀẢÃẠẮẰẲẴẶẤẦẨẪẬĐÉÈẺẼẸẾỀỂỄỆÍÌỈĨỊÓÒỎÕỌỐỒỔỖỘỚỜỞỠỢÚÙỦŨỤỨỪỬỮỰÝỲỶỸỴáàảãạắằẳẵặấầẩẫậéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ]/u.test(displayedText);
}

function isValidPart2Question(question) {
  return (
    question.validation.grammarInScope === true &&
    question.validation.vocabularyInScope === true &&
    question.validation.singleCorrectAnswer === true &&
    (question.validation.topicUnambiguous ?? true) === true &&
    (question.validation.stimulusConsistent ?? true) === true &&
    (question.validation.passageConsistent ?? true) === true &&
    !hasVietnameseInDisplayedPart2Text(question)
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

function markSelected(questionId, examId, counts) {
  const stat = counts.get(questionId) ?? {
    questionId,
    selectedCount: 0,
    selectedInExamIds: [],
  };
  stat.selectedCount += 1;
  stat.selectedInExamIds.push(examId);
  counts.set(questionId, stat);
}

function selectBalancedQuestion(candidates, counts, random) {
  const valid = candidates.filter(isValidPart2Question);
  if (!valid.length) throw new Error("Pool Part 2 không có câu hợp lệ.");
  const minCount = Math.min(...valid.map(question => counts.get(question.id)?.selectedCount ?? 0));
  return sampleOne(valid.filter(question => (counts.get(question.id)?.selectedCount ?? 0) === minCount), random);
}

function selectBalancedPools(pools, amount, poolUsageCounts, random, extraDistinctKey) {
  if (pools.length < amount) {
    throw new Error(`Không đủ pool Part 2. Cần ${amount}, chỉ có ${pools.length}.`);
  }

  const remaining = [...pools];
  const selected = [];
  const usedKeys = new Set();
  while (selected.length < amount) {
    const candidates = remaining.filter(pool => {
      if (!extraDistinctKey) return true;
      const key = extraDistinctKey(pool);
      return !usedKeys.has(key);
    });
    const available = candidates.length ? candidates : remaining;
    const minUsage = Math.min(...available.map(pool => poolUsageCounts.get(pool.id) ?? 0));
    const leastUsed = available.filter(pool => (poolUsageCounts.get(pool.id) ?? 0) === minUsage);
    const chosen = sampleOne(leastUsed, random);
    selected.push(chosen);
    if (extraDistinctKey) usedKeys.add(extraDistinctKey(chosen));
    remaining.splice(remaining.findIndex(pool => pool.id === chosen.id), 1);
  }
  return selected;
}

function createStaticExamQuestion(question, displayOrder, random) {
  return {
    questionId: question.id,
    poolId: question.poolId,
    section: question.section,
    displayOrder,
    shuffledOptionIds: shuffle(question.options.map(option => option.id), random),
    ...(question.section === "visual_incorrect_statement"
      ? { stimulusAssetPath: `generated/part2/stimuli/${question.stimulusId}.json` }
      : {}),
  };
}

function calculateSharedQuestionRatio(examA, examB) {
  const idsA = new Set(examA.questions.map(item => item.questionId));
  const sharedCount = examB.questions.filter(item => idsA.has(item.questionId)).length;
  return sharedCount / examA.questionCount;
}

function buildExamCandidate({ examId, pools, config, selectionCounts, poolUsageCounts, random }) {
  const candidateCounts = cloneSelectionCounts(selectionCounts);
  const topicPools = pools.filter(pool => pool.section === "topic_identification");
  const visualPools = pools.filter(pool => pool.section === "visual_incorrect_statement");
  const passagePools = pools.filter(pool => pool.section === "passage_correct_statement");

  const selectedTopicPools = selectBalancedPools(topicPools, config.sectionQuota.topic_identification, poolUsageCounts, random, pool => pool.targetTopic);
  const selectedVisualPools = selectBalancedPools(visualPools, config.sectionQuota.visual_incorrect_statement, poolUsageCounts, random, pool => pool.stimulusType);
  const selectedPassagePools = selectBalancedPools(passagePools, config.sectionQuota.passage_correct_statement, poolUsageCounts, random, pool => pool.readingFocus);

  const selectedTopics = selectedTopicPools.map(pool => selectBalancedQuestion(pool.questions, candidateCounts, random));
  const selectedVisuals = selectedVisualPools.map(pool => selectBalancedQuestion(pool.questions, candidateCounts, random));
  const selectedPassages = selectedPassagePools.map(pool => selectBalancedQuestion(pool.questions, candidateCounts, random));

  for (const question of [...selectedTopics, ...selectedVisuals, ...selectedPassages]) {
    markSelected(question.id, examId, candidateCounts);
  }

  const orderedQuestions = [
    ...shuffle(selectedTopics, random),
    ...shuffle(selectedVisuals, random),
    ...shuffle(selectedPassages, random),
  ];

  return {
    exam: {
      id: examId,
      part: 2,
      questionCount: 9,
      generatedAt: "2026-05-31T00:00:00.000Z",
      generationSeed: config.randomSeed,
      questions: orderedQuestions.map((question, index) =>
        createStaticExamQuestion(question, index + 1, random),
      ),
    },
    selectionCounts: candidateCounts,
  };
}

function isCorrect(question, selectedOptionId) {
  return selectedOptionId === question.correctOptionId;
}

function evaluateCoverage(exam, questionById) {
  const questions = exam.questions.map(item => questionById.get(item.questionId));
  const topics = questions.filter(q => q.section === "topic_identification").map(q => q.targetTopic);
  const stimulusTypes = questions.filter(q => q.section === "visual_incorrect_statement").map(q => q.stimulusType);
  const readingFocuses = questions.filter(q => q.section === "passage_correct_statement").map(q => q.readingFocus);
  return {
    examId: exam.id,
    topicIdentificationCount: topics.length,
    visualIncorrectStatementCount: stimulusTypes.length,
    passageCorrectStatementCount: readingFocuses.length,
    distinctTargetTopicPassed: new Set(topics).size === topics.length,
    distinctStimulusTypePassed: new Set(stimulusTypes).size === stimulusTypes.length,
    distinctReadingFocusPassed: new Set(readingFocuses).size === readingFocuses.length,
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
        section: item.section,
        correctOptionId: question.correctOptionId,
        correctValue: question.correctValue,
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
      section: question.section,
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
    sectionCoverageChecks: exams.map(exam => evaluateCoverage(exam, questionById)),
  };
}

function generateStaticPart2Exams(config = PART2_STATIC_EXAM_CONFIG) {
  const pools = buildPart2Pools();
  const questions = buildPart2Questions();
  const questionById = new Map(questions.map(question => [question.id, question]));
  const validation = validatePart2Pools(pools);
  if (!validation.valid) {
    throw new Error(`Cannot generate Part 2 exams from invalid pools:\n${validation.errors.join("\n")}`);
  }

  const random = createSeededRandom(config.randomSeed ?? "part2");
  const exams = [];
  let selectionCounts = new Map();
  const poolUsageCounts = new Map();

  for (let examIndex = 0; examIndex < config.examSetCount; examIndex += 1) {
    const examId = `PART2_EXAM_${String(examIndex + 1).padStart(3, "0")}`;
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
      const coveragePassed =
        coverage.topicIdentificationCount === 5 &&
        coverage.visualIncorrectStatementCount === 2 &&
        coverage.passageCorrectStatementCount === 2 &&
        coverage.distinctTargetTopicPassed &&
        coverage.distinctStimulusTypePassed &&
        coverage.distinctReadingFocusPassed;
      const overlapFailed = exams.some(
        exam => calculateSharedQuestionRatio(candidate.exam, exam) > config.maxSharedQuestionRatio,
      );

      if (coveragePassed && !overlapFailed) {
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

  return {
    exams,
    answerKeys: buildAnswerKeys(exams, questionById),
    report: buildReport(exams, questions, selectionCounts, questionById, config),
  };
}

function writeStimulusAssets(questions) {
  const visualQuestions = questions.filter(question => question.section === "visual_incorrect_statement");
  const outputDir = path.join(ROOT_DIR, "src/data/korean/generated/part2/stimuli");
  fs.mkdirSync(outputDir, { recursive: true });
  for (const question of visualQuestions) {
    fs.writeFileSync(
      path.join(outputDir, `${question.stimulusId}.json`),
      `${JSON.stringify(question.stimulus, null, 2)}\n`,
      "utf8",
    );
  }
}

function writeStaticPart2ExamArtifacts() {
  writePart2PoolArtifacts();
  const { exams, answerKeys, report } = generateStaticPart2Exams();
  writeStimulusAssets(buildPart2Questions());

  fs.mkdirSync(path.dirname(EXAMS_OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(EXAMS_OUTPUT_PATH, `${JSON.stringify(exams, null, 2)}\n`, "utf8");
  fs.writeFileSync(ANSWER_KEYS_OUTPUT_PATH, `${JSON.stringify(answerKeys, null, 2)}\n`, "utf8");
  fs.writeFileSync(REPORT_OUTPUT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  return { exams, answerKeys, report, examsPath: EXAMS_OUTPUT_PATH, answerKeysPath: ANSWER_KEYS_OUTPUT_PATH, reportPath: REPORT_OUTPUT_PATH };
}

if (require.main === module) {
  const result = writeStaticPart2ExamArtifacts();
  console.log(`Generated ${result.exams.length} static Part 2 exams.`);
  console.log(`Wrote ${path.relative(ROOT_DIR, result.examsPath)}`);
  console.log(`Wrote ${path.relative(ROOT_DIR, result.answerKeysPath)}`);
  console.log(`Wrote ${path.relative(ROOT_DIR, result.reportPath)}`);
}

module.exports = {
  PART2_STATIC_EXAM_CONFIG,
  calculateSharedQuestionRatio,
  generateStaticPart2Exams,
  hasVietnameseInDisplayedPart2Text,
  isCorrect,
  isValidPart2Question,
  selectBalancedQuestion,
  writeStaticPart2ExamArtifacts,
};
