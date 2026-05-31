const assert = require("assert");
const { buildPart3Questions, buildPart3Pools } = require("./part3-source-data");
const { validatePart3Pools } = require("./validate-part3-pools");
const {
  PART3_STATIC_EXAM_CONFIG,
  calculateSharedQuestionRatio,
  generateStaticPart3Exams,
} = require("./generate-static-part3-exams");

function runTests() {
  const pools = buildPart3Pools();
  const questions = buildPart3Questions();
  const questionById = new Map(questions.map(question => [question.id, question]));

  const validation = validatePart3Pools(pools);
  assert.strictEqual(validation.valid, true, validation.errors.join("\n"));
  assert.strictEqual(validation.poolCount, 28);
  assert.strictEqual(validation.questionCount, 84);

  const firstRun = generateStaticPart3Exams();
  const secondRun = generateStaticPart3Exams();
  assert.deepStrictEqual(firstRun.exams, secondRun.exams, "randomSeed must produce stable exams");
  assert.deepStrictEqual(firstRun.answerKeys, secondRun.answerKeys, "randomSeed must produce stable answer keys");

  assert.strictEqual(firstRun.exams.length, PART3_STATIC_EXAM_CONFIG.examSetCount);
  assert.strictEqual(firstRun.answerKeys.length, PART3_STATIC_EXAM_CONFIG.examSetCount);
  assert.strictEqual(firstRun.report.examSetCount, PART3_STATIC_EXAM_CONFIG.examSetCount);

  for (const exam of firstRun.exams) {
    assert.strictEqual(exam.part, 3);
    assert.strictEqual(exam.questionCount, 8);
    assert.strictEqual(exam.questions.length, 8);

    const poolIds = new Set(exam.questions.map(item => item.poolId));
    assert.strictEqual(poolIds.size, 8, `${exam.id}: poolId must be unique`);

    const semanticGroupIds = new Set();
    const directionCounts = { vi_to_ko: 0, ko_to_vi: 0 };
    for (const item of exam.questions) {
      const question = questionById.get(item.questionId);
      assert.ok(question, `${item.questionId} must exist`);
      assert.strictEqual(question.direction, item.direction);
      assert.strictEqual(question.poolId, item.poolId);
      assert.ok(!semanticGroupIds.has(question.semanticGroupId), `${exam.id}: duplicate semanticGroupId ${question.semanticGroupId}`);
      semanticGroupIds.add(question.semanticGroupId);
      directionCounts[item.direction] += 1;
      assert.ok(!("options" in question), `${question.id}: Part 3 must not use options`);
      assert.ok(!("correctOptionId" in question), `${question.id}: Part 3 must not use correctOptionId`);
    }

    assert.strictEqual(directionCounts.vi_to_ko, 4, `${exam.id}: vi_to_ko quota mismatch`);
    assert.strictEqual(directionCounts.ko_to_vi, 4, `${exam.id}: ko_to_vi quota mismatch`);

    const answerKey = firstRun.answerKeys.find(item => item.examId === exam.id);
    assert.ok(answerKey, `${exam.id}: answer key missing`);
    assert.strictEqual(answerKey.answers.length, 8);
    for (const answer of answerKey.answers) {
      const examQuestion = exam.questions.find(item => item.questionId === answer.questionId);
      const question = questionById.get(answer.questionId);
      assert.ok(examQuestion, `${answer.questionId}: answer key question not in exam`);
      assert.strictEqual(answer.displayOrder, examQuestion.displayOrder);
      assert.strictEqual(answer.direction, examQuestion.direction);
      assert.strictEqual(answer.sampleAnswer, question.sampleAnswer);
      assert.deepStrictEqual(answer.acceptedAnswers, question.acceptedAnswers);
    }
  }

  for (let i = 0; i < firstRun.exams.length; i += 1) {
    for (let j = i + 1; j < firstRun.exams.length; j += 1) {
      const ratio = calculateSharedQuestionRatio(firstRun.exams[i], firstRun.exams[j]);
      assert.ok(
        ratio <= PART3_STATIC_EXAM_CONFIG.maxSharedQuestionRatio,
        `${firstRun.exams[i].id}/${firstRun.exams[j].id}: overlap ${ratio} exceeds limit`,
      );
    }
  }

  assert.strictEqual(
    firstRun.report.examOverlapChecks.every(item => item.passed),
    true,
    "all overlap checks must pass",
  );
  assert.strictEqual(
    firstRun.report.coverageChecks.every(item => item.viToKoCount === 4 && item.koToViCount === 4 && item.skillCoveragePassed),
    true,
    "all coverage checks must pass",
  );
}

if (require.main === module) {
  runTests();
  console.log("Part 3 static exam tests passed.");
}

module.exports = { runTests };
