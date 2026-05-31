const fs = require("fs");
const path = require("path");
const { readPart2ReadingScope } = require("./part2-knowledge-scope");
const { buildPart2Pools, buildPart2Questions, buildPart2Stimuli } = require("./part2-source-data");

const ROOT_DIR = path.resolve(__dirname, "../../../..");
const POOL_OUTPUT_PATH = path.join(ROOT_DIR, "src/data/korean/pools/part2-pool-catalog.json");
const QUESTION_OUTPUT_PATH = path.join(ROOT_DIR, "src/data/korean/pools/part2-questions.json");
const STIMULI_OUTPUT_PATH = path.join(ROOT_DIR, "src/data/korean/pools/part2-stimuli.json");

const REQUIRED_POOL_COUNT = 25;
const REQUIRED_QUESTION_COUNT = 75;
const VALID_SECTIONS = new Set(["topic_identification", "visual_incorrect_statement", "passage_correct_statement"]);
const VALID_QUESTION_TYPES = new Set(["choose_topic", "choose_incorrect_statement", "choose_correct_statement"]);

function pushIf(condition, errors, message) {
  if (!condition) errors.push(message);
}

function validatePart2Pools(pools = buildPart2Pools()) {
  const scope = readPart2ReadingScope();
  const allowedGrammar = new Set(scope.allowedGrammarKeys);
  const allowedVocabulary = new Set(scope.allowedVocabulary);
  const allowedTopicKeys = new Set(scope.topicLabels.map(topic => topic.key));
  const allowedStimulusTypes = new Set(scope.stimulusTypes.map(item => item.key));
  const allowedReadingFocuses = new Set(scope.passageFocuses);
  const errors = [];
  const seenPoolIds = new Set();
  const seenQuestionIds = new Set();
  const seenStimulusIds = new Set();

  pushIf(pools.length === REQUIRED_POOL_COUNT, errors, `Expected ${REQUIRED_POOL_COUNT} pools, got ${pools.length}`);

  for (const pool of pools) {
    pushIf(!seenPoolIds.has(pool.id), errors, `Duplicate pool id: ${pool.id}`);
    seenPoolIds.add(pool.id);
    pushIf(pool.part === 2, errors, `${pool.id}: part must be 2`);
    pushIf(VALID_SECTIONS.has(pool.section), errors, `${pool.id}: invalid section ${pool.section}`);
    pushIf(pool.questions.length === 3, errors, `${pool.id}: expected exactly 3 questions`);

    for (const question of pool.questions) {
      pushIf(!seenQuestionIds.has(question.id), errors, `Duplicate question id: ${question.id}`);
      seenQuestionIds.add(question.id);
      pushIf(question.part === 2, errors, `${question.id}: part must be 2`);
      pushIf(question.poolId === pool.id, errors, `${question.id}: poolId mismatch`);
      pushIf(question.section === pool.section, errors, `${question.id}: section mismatch`);
      pushIf(VALID_QUESTION_TYPES.has(question.questionType), errors, `${question.id}: invalid questionType`);
      pushIf(Array.isArray(question.options) && question.options.length === 4, errors, `${question.id}: must have 4 options`);

      const optionIds = new Set();
      const optionTexts = new Set();
      for (const option of question.options) {
        pushIf(!optionIds.has(option.id), errors, `${question.id}: duplicate option id ${option.id}`);
        pushIf(!optionTexts.has(option.text), errors, `${question.id}: duplicate option text ${option.text}`);
        optionIds.add(option.id);
        optionTexts.add(option.text);
      }

      pushIf(optionIds.has(question.correctOptionId), errors, `${question.id}: correctOptionId missing in options`);
      const correctOption = question.options.find(option => option.id === question.correctOptionId);
      pushIf(correctOption?.text === question.correctValue, errors, `${question.id}: correctValue does not match correct option`);
      pushIf(Boolean(question.explanationVi), errors, `${question.id}: explanationVi is empty`);
      pushIf(Array.isArray(question.grammarUsed) && question.grammarUsed.length > 0, errors, `${question.id}: grammarUsed is empty`);
      pushIf(Array.isArray(question.vocabularyUsed) && question.vocabularyUsed.length > 0, errors, `${question.id}: vocabularyUsed is empty`);

      const missingGrammar = question.grammarUsed.filter(item => !allowedGrammar.has(item));
      const missingVocabulary = question.vocabularyUsed.filter(item => !allowedVocabulary.has(item));
      pushIf(missingGrammar.length === 0, errors, `${question.id}: grammar out of scope: ${missingGrammar.join(", ")}`);
      pushIf(missingVocabulary.length === 0, errors, `${question.id}: vocabulary out of scope: ${missingVocabulary.join(", ")}`);
      pushIf(question.validation.grammarInScope === (missingGrammar.length === 0), errors, `${question.id}: grammarInScope flag mismatch`);
      pushIf(question.validation.vocabularyInScope === (missingVocabulary.length === 0), errors, `${question.id}: vocabularyInScope flag mismatch`);
      pushIf(question.validation.singleCorrectAnswer === true, errors, `${question.id}: singleCorrectAnswer must be true`);

      if (question.section === "topic_identification") {
        pushIf(question.questionType === "choose_topic", errors, `${question.id}: topic questionType mismatch`);
        pushIf(allowedTopicKeys.has(question.targetTopic), errors, `${question.id}: targetTopic out of scope`);
        pushIf(Boolean(question.readingText), errors, `${question.id}: readingText is empty`);
        pushIf(question.validation.topicUnambiguous === true, errors, `${question.id}: topicUnambiguous must be true`);
      }

      if (question.section === "visual_incorrect_statement") {
        pushIf(question.questionType === "choose_incorrect_statement", errors, `${question.id}: visual questionType mismatch`);
        pushIf(allowedStimulusTypes.has(question.stimulusType), errors, `${question.id}: stimulusType out of scope`);
        pushIf(Boolean(question.stimulusId), errors, `${question.id}: stimulusId is empty`);
        pushIf(question.stimulus?.id === question.stimulusId, errors, `${question.id}: stimulusId mismatch`);
        pushIf(Boolean(question.stimulus?.structuredData), errors, `${question.id}: structuredData missing`);
        pushIf(Boolean(question.stimulus?.fallbackText), errors, `${question.id}: fallbackText missing`);
        pushIf(!seenStimulusIds.has(question.stimulusId), errors, `Duplicate stimulus id: ${question.stimulusId}`);
        seenStimulusIds.add(question.stimulusId);
        pushIf(question.validation.stimulusConsistent === true, errors, `${question.id}: stimulusConsistent must be true`);
      }

      if (question.section === "passage_correct_statement") {
        pushIf(question.questionType === "choose_correct_statement", errors, `${question.id}: passage questionType mismatch`);
        pushIf(allowedReadingFocuses.has(question.readingFocus), errors, `${question.id}: readingFocus out of scope`);
        pushIf(Boolean(question.readingText), errors, `${question.id}: readingText is empty`);
        pushIf(question.validation.passageConsistent === true, errors, `${question.id}: passageConsistent must be true`);
      }
    }
  }

  const questions = pools.flatMap(pool => pool.questions);
  pushIf(questions.length === REQUIRED_QUESTION_COUNT, errors, `Expected ${REQUIRED_QUESTION_COUNT} questions, got ${questions.length}`);

  return {
    valid: errors.length === 0,
    errors,
    poolCount: pools.length,
    questionCount: questions.length,
    stimulusCount: buildPart2Stimuli().length,
  };
}

function writePart2PoolArtifacts() {
  const pools = buildPart2Pools();
  const result = validatePart2Pools(pools);
  if (!result.valid) {
    throw new Error(`Part 2 validation failed:\n${result.errors.join("\n")}`);
  }

  const catalog = pools.map(({ questions, ...pool }) => ({
    ...pool,
    quantity: questions.length,
  }));

  fs.mkdirSync(path.dirname(POOL_OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(POOL_OUTPUT_PATH, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");
  fs.writeFileSync(QUESTION_OUTPUT_PATH, `${JSON.stringify(buildPart2Questions(), null, 2)}\n`, "utf8");
  fs.writeFileSync(STIMULI_OUTPUT_PATH, `${JSON.stringify(buildPart2Stimuli(), null, 2)}\n`, "utf8");

  return {
    ...result,
    catalogPath: POOL_OUTPUT_PATH,
    questionsPath: QUESTION_OUTPUT_PATH,
    stimuliPath: STIMULI_OUTPUT_PATH,
  };
}

if (require.main === module) {
  const result = writePart2PoolArtifacts();
  console.log(`Validated ${result.poolCount} Part 2 pools / ${result.questionCount} questions / ${result.stimulusCount} stimuli.`);
  console.log(`Wrote ${path.relative(ROOT_DIR, result.catalogPath)}`);
  console.log(`Wrote ${path.relative(ROOT_DIR, result.questionsPath)}`);
  console.log(`Wrote ${path.relative(ROOT_DIR, result.stimuliPath)}`);
}

module.exports = {
  POOL_OUTPUT_PATH,
  QUESTION_OUTPUT_PATH,
  STIMULI_OUTPUT_PATH,
  validatePart2Pools,
  writePart2PoolArtifacts,
};
