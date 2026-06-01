const assert = require("assert");
const { validatePart1Pools } = require("./validate-part1-pools");
const { buildPart1Pools, buildPart1Questions } = require("./part1-source-data");
const {
  PART1_FULL_SCOPE_CONFIG,
  calculateSharedQuestionRatio,
  generateStaticPart1Exams,
  hasVietnameseInStem,
  isCorrectAnswer,
  isValidQuestion,
} = require("./generate-static-part1-exams");

function runTests() {
  const pools = buildPart1Pools();
  const questions = buildPart1Questions();
  const questionById = new Map(questions.map(question => [question.id, question]));

  const validation = validatePart1Pools(pools);
  assert.strictEqual(validation.valid, true, validation.errors.join("\n"));
  assert.strictEqual(validation.poolCount, 38);
  assert.strictEqual(validation.questionCount, 114);

  const firstRun = generateStaticPart1Exams();
  const secondRun = generateStaticPart1Exams();

  assert.deepStrictEqual(firstRun.exams, secondRun.exams, "randomSeed must make generation reproducible");
  assert.strictEqual(firstRun.exams.length, 20, "must generate exactly 20 static exams");
  assert.strictEqual(firstRun.report.examSetCount, 20);
  assert.strictEqual(firstRun.report.totalSelectedQuestionSlots, 200);

  for (const exam of firstRun.exams) {
    assert.strictEqual(exam.part, 1);
    assert.strictEqual(exam.questionCount, 10);
    assert.strictEqual(exam.questions.length, 10);

    const poolIds = new Set(exam.questions.map(item => item.poolId));
    assert.strictEqual(poolIds.size, 10, `${exam.id}: poolId must be unique within an exam`);

    const lessonCounts = {};
    for (const item of exam.questions) {
      const question = questionById.get(item.questionId);
      assert.ok(question, `${item.questionId} must exist in root questions`);
      assert.strictEqual(hasVietnameseInStem(question), false, `${item.questionId}: stem must not contain Vietnamese`);
      lessonCounts[question.targetLesson] = (lessonCounts[question.targetLesson] ?? 0) + 1;

      const optionIds = question.options.map(option => option.id);
      assert.deepStrictEqual(
        [...item.shuffledOptionIds].sort(),
        [...optionIds].sort(),
        `${item.questionId}: shuffledOptionIds must contain exactly the original option ids`,
      );
      assert.strictEqual(new Set(item.shuffledOptionIds).size, 4);
      assert.strictEqual(isCorrectAnswer(question, question.correctOptionId), true);
    }

    for (const [lesson, amount] of Object.entries(PART1_FULL_SCOPE_CONFIG.lessonQuota)) {
      assert.strictEqual(lessonCounts[lesson], amount, `${exam.id}: lesson ${lesson} quota mismatch`);
    }
  }

  for (let i = 0; i < firstRun.exams.length; i += 1) {
    for (let j = i + 1; j < firstRun.exams.length; j += 1) {
      const ratio = calculateSharedQuestionRatio(firstRun.exams[i], firstRun.exams[j]);
      assert.ok(
        ratio <= PART1_FULL_SCOPE_CONFIG.maxSharedQuestionRatio,
        `${firstRun.exams[i].id}/${firstRun.exams[j].id} overlap ratio ${ratio} exceeds limit`,
      );
    }
  }

  const countsByPool = new Map();
  for (const item of firstRun.report.questionSelectionCounts) {
    const question = questionById.get(item.questionId);
    if (!isValidQuestion(question)) continue;
    const current = countsByPool.get(item.poolId) ?? [];
    current.push(item.selectedCount);
    countsByPool.set(item.poolId, current);
  }

  for (const [poolId, counts] of countsByPool.entries()) {
    const max = Math.max(...counts);
    const min = Math.min(...counts);
    assert.ok(max - min <= 1, `${poolId}: question selection should be balanced within pool`);
  }

  assert.strictEqual(
    firstRun.report.examOverlapChecks.every(item => item.passed),
    true,
    "all overlap checks must pass",
  );
}

if (require.main === module) {
  runTests();
  console.log("Part 1 static exam tests passed.");
}

module.exports = { runTests };
