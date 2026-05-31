const assert = require("assert");
const { buildPart2Pools, buildPart2Questions } = require("./part2-source-data");
const { validatePart2Pools } = require("./validate-part2-pools");
const {
  PART2_STATIC_EXAM_CONFIG,
  calculateSharedQuestionRatio,
  generateStaticPart2Exams,
  isCorrect,
} = require("./generate-static-part2-exams");

function runTests() {
  const pools = buildPart2Pools();
  const questions = buildPart2Questions();
  const questionById = new Map(questions.map(question => [question.id, question]));

  const validation = validatePart2Pools(pools);
  assert.strictEqual(validation.valid, true, validation.errors.join("\n"));
  assert.strictEqual(validation.poolCount, 25);
  assert.strictEqual(validation.questionCount, 75);
  assert.strictEqual(validation.stimulusCount, 15);

  const firstRun = generateStaticPart2Exams();
  const secondRun = generateStaticPart2Exams();
  assert.deepStrictEqual(firstRun.exams, secondRun.exams, "randomSeed must produce stable exams");
  assert.deepStrictEqual(firstRun.answerKeys, secondRun.answerKeys, "randomSeed must produce stable answer keys");

  assert.strictEqual(firstRun.exams.length, PART2_STATIC_EXAM_CONFIG.examSetCount);
  assert.strictEqual(firstRun.answerKeys.length, PART2_STATIC_EXAM_CONFIG.examSetCount);

  for (const exam of firstRun.exams) {
    assert.strictEqual(exam.part, 2);
    assert.strictEqual(exam.questionCount, 9);
    assert.strictEqual(exam.questions.length, 9);

    const poolIds = new Set(exam.questions.map(item => item.poolId));
    assert.strictEqual(poolIds.size, 9, `${exam.id}: poolId must be unique`);

    const sections = exam.questions.map(item => item.section);
    assert.deepStrictEqual(sections.slice(0, 5), Array(5).fill("topic_identification"));
    assert.deepStrictEqual(sections.slice(5, 7), Array(2).fill("visual_incorrect_statement"));
    assert.deepStrictEqual(sections.slice(7, 9), Array(2).fill("passage_correct_statement"));

    const topics = new Set();
    const stimulusTypes = new Set();
    const readingFocuses = new Set();
    for (const item of exam.questions) {
      const question = questionById.get(item.questionId);
      assert.ok(question, `${item.questionId} must exist`);
      assert.strictEqual(question.poolId, item.poolId);
      assert.strictEqual(question.section, item.section);
      assert.strictEqual(isCorrect(question, question.correctOptionId), true);

      const originalOptionIds = question.options.map(option => option.id);
      assert.deepStrictEqual([...item.shuffledOptionIds].sort(), [...originalOptionIds].sort());
      assert.strictEqual(new Set(item.shuffledOptionIds).size, 4);

      if (question.section === "topic_identification") topics.add(question.targetTopic);
      if (question.section === "visual_incorrect_statement") stimulusTypes.add(question.stimulusType);
      if (question.section === "passage_correct_statement") readingFocuses.add(question.readingFocus);
    }
    assert.strictEqual(topics.size, 5);
    assert.strictEqual(stimulusTypes.size, 2);
    assert.strictEqual(readingFocuses.size, 2);

    const answerKey = firstRun.answerKeys.find(item => item.examId === exam.id);
    assert.ok(answerKey, `${exam.id}: answer key missing`);
    assert.strictEqual(answerKey.answers.length, 9);
    for (const answer of answerKey.answers) {
      const examQuestion = exam.questions.find(item => item.questionId === answer.questionId);
      const question = questionById.get(answer.questionId);
      assert.ok(examQuestion, `${answer.questionId}: answer not in exam`);
      assert.strictEqual(answer.displayOrder, examQuestion.displayOrder);
      assert.strictEqual(answer.correctOptionId, question.correctOptionId);
      assert.strictEqual(answer.correctValue, question.correctValue);
    }
  }

  for (let i = 0; i < firstRun.exams.length; i += 1) {
    for (let j = i + 1; j < firstRun.exams.length; j += 1) {
      const ratio = calculateSharedQuestionRatio(firstRun.exams[i], firstRun.exams[j]);
      assert.ok(ratio <= PART2_STATIC_EXAM_CONFIG.maxSharedQuestionRatio, `overlap ${ratio} exceeds limit`);
    }
  }

  assert.strictEqual(firstRun.report.examOverlapChecks.every(item => item.passed), true);
  assert.strictEqual(
    firstRun.report.sectionCoverageChecks.every(item =>
      item.topicIdentificationCount === 5 &&
      item.visualIncorrectStatementCount === 2 &&
      item.passageCorrectStatementCount === 2 &&
      item.distinctTargetTopicPassed &&
      item.distinctStimulusTypePassed &&
      item.distinctReadingFocusPassed
    ),
    true,
  );
}

if (require.main === module) {
  runTests();
  console.log("Part 2 static exam tests passed.");
}

module.exports = { runTests };
