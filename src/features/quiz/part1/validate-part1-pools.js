const fs = require("fs");
const path = require("path");
const { buildKnowledgeIndex, normalizeGrammar, normalizeVocabulary } = require("./knowledge-index");
const { buildPart1Pools, buildPart1Questions } = require("./part1-source-data");

const ROOT_DIR = path.resolve(__dirname, "../../../..");
const POOL_OUTPUT_PATH = path.join(ROOT_DIR, "src/data/korean/pools/part1-pool-catalog.json");
const QUESTION_OUTPUT_PATH = path.join(ROOT_DIR, "src/data/korean/pools/part1-questions.json");

const REQUIRED_POOL_COUNT = 38;
const REQUIRED_QUESTION_COUNT = 114;

function assertCondition(condition, message, errors) {
  if (!condition) errors.push(message);
}

function validateQuestion(question, pool, knowledgeIndex, seenQuestionIds, errors) {
  assertCondition(!seenQuestionIds.has(question.id), `Duplicate question.id: ${question.id}`, errors);
  seenQuestionIds.add(question.id);

  assertCondition(question.poolId === pool.id, `${question.id}: poolId does not match parent pool`, errors);
  assertCondition(question.targetLesson === pool.targetLesson, `${question.id}: targetLesson does not match pool`, errors);
  assertCondition(Array.isArray(question.options) && question.options.length === 4, `${question.id}: must have 4 options`, errors);
  assertCondition(Boolean(question.stem), `${question.id}: stem is empty`, errors);
  assertCondition(Boolean(question.explanationVi), `${question.id}: explanationVi is empty`, errors);
  assertCondition(question.targetLesson >= 1 && question.targetLesson <= 8, `${question.id}: targetLesson out of 1..8`, errors);

  const optionIds = new Set();
  const optionTexts = new Set();
  for (const option of question.options) {
    assertCondition(!optionIds.has(option.id), `${question.id}: duplicate option.id ${option.id}`, errors);
    assertCondition(!optionTexts.has(option.text), `${question.id}: duplicate option.text ${option.text}`, errors);
    optionIds.add(option.id);
    optionTexts.add(option.text);
  }

  assertCondition(optionIds.has(question.correctOptionId), `${question.id}: correctOptionId not found in options`, errors);
  const correctOption = question.options.find(item => item.id === question.correctOptionId);
  assertCondition(correctOption?.text === question.correctValue, `${question.id}: correctValue does not match correct option text`, errors);

  const allowedGrammar = knowledgeIndex.getCumulativeGrammar(question.targetLesson);
  const grammarInScope = question.grammarUsed.every(item => allowedGrammar.has(normalizeGrammar(item)));
  const missingGrammar = question.grammarUsed.filter(item => !allowedGrammar.has(normalizeGrammar(item)));
  assertCondition(grammarInScope, `${question.id}: grammar out of scope: ${missingGrammar.join(", ")}`, errors);

  const allowedVocabulary = knowledgeIndex.getCumulativeVocabulary(question.targetLesson);
  const vocabularyInScope = question.vocabularyUsed.every(item => allowedVocabulary.has(normalizeVocabulary(item)));
  const missingVocabulary = question.vocabularyUsed.filter(item => !allowedVocabulary.has(normalizeVocabulary(item)));
  assertCondition(vocabularyInScope, `${question.id}: vocabulary out of scope: ${missingVocabulary.join(", ")}`, errors);

  assertCondition(question.validation.singleCorrectAnswer === true, `${question.id}: singleCorrectAnswer must be true`, errors);
  assertCondition(question.validation.grammarInScope === grammarInScope, `${question.id}: grammarInScope flag is inconsistent`, errors);
  assertCondition(question.validation.vocabularyInScope === vocabularyInScope, `${question.id}: vocabularyInScope flag is inconsistent`, errors);
}

function validatePart1Pools(pools = buildPart1Pools()) {
  const errors = [];
  const knowledgeIndex = buildKnowledgeIndex();
  const seenPoolIds = new Set();
  const seenQuestionIds = new Set();

  assertCondition(pools.length === REQUIRED_POOL_COUNT, `Expected ${REQUIRED_POOL_COUNT} pools, got ${pools.length}`, errors);

  for (const pool of pools) {
    assertCondition(!seenPoolIds.has(pool.id), `Duplicate pool.id: ${pool.id}`, errors);
    seenPoolIds.add(pool.id);
    assertCondition(pool.questions.length === 3, `${pool.id}: expected exactly 3 questions`, errors);

    for (const question of pool.questions) {
      validateQuestion(question, pool, knowledgeIndex, seenQuestionIds, errors);
    }
  }

  const questions = pools.flatMap(pool => pool.questions);
  assertCondition(questions.length === REQUIRED_QUESTION_COUNT, `Expected ${REQUIRED_QUESTION_COUNT} questions, got ${questions.length}`, errors);

  return {
    valid: errors.length === 0,
    errors,
    poolCount: pools.length,
    questionCount: questions.length,
  };
}

function writePoolArtifacts() {
  const pools = buildPart1Pools();
  const result = validatePart1Pools(pools);
  if (!result.valid) {
    throw new Error(`Part 1 pool validation failed:\n${result.errors.join("\n")}`);
  }

  const catalog = pools.map(({ questions, ...pool }) => ({
    ...pool,
    quantity: questions.length,
  }));
  const questions = buildPart1Questions();

  fs.mkdirSync(path.dirname(POOL_OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(POOL_OUTPUT_PATH, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");
  fs.writeFileSync(QUESTION_OUTPUT_PATH, `${JSON.stringify(questions, null, 2)}\n`, "utf8");

  return {
    ...result,
    catalogPath: POOL_OUTPUT_PATH,
    questionsPath: QUESTION_OUTPUT_PATH,
  };
}

if (require.main === module) {
  const result = writePoolArtifacts();
  console.log(`Validated ${result.poolCount} pools / ${result.questionCount} questions.`);
  console.log(`Wrote ${path.relative(ROOT_DIR, result.catalogPath)}`);
  console.log(`Wrote ${path.relative(ROOT_DIR, result.questionsPath)}`);
}

module.exports = {
  validatePart1Pools,
  writePoolArtifacts,
  POOL_OUTPUT_PATH,
  QUESTION_OUTPUT_PATH,
};
