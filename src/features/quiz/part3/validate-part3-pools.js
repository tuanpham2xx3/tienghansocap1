const fs = require("fs");
const path = require("path");
const { readPart3KnowledgeScope, normalizePart3Text } = require("./part3-knowledge-scope");
const { buildPart3Pools, buildPart3Questions } = require("./part3-source-data");

const ROOT_DIR = path.resolve(__dirname, "../../../..");
const POOL_OUTPUT_PATH = path.join(ROOT_DIR, "src/data/korean/pools/part3-pool-catalog.json");
const QUESTION_OUTPUT_PATH = path.join(ROOT_DIR, "src/data/korean/pools/part3-questions.json");

const REQUIRED_POOL_COUNT = 28;
const REQUIRED_QUESTION_COUNT = 84;
const VALID_DIRECTIONS = new Set(["vi_to_ko", "ko_to_vi"]);

function hasHangul(value) {
  return /[가-힣]/.test(value);
}

function pushIf(condition, errors, message) {
  if (!condition) errors.push(message);
}

function validateAnswerShape(question, errors) {
  pushIf(Boolean(question.sampleAnswer), errors, `${question.id}: sampleAnswer is empty`);
  pushIf(Array.isArray(question.acceptedAnswers) && question.acceptedAnswers.length > 0, errors, `${question.id}: acceptedAnswers is empty`);

  const normalizedSample = normalizePart3Text(question.sampleAnswer);
  const normalizedAccepted = new Set(question.acceptedAnswers.map(normalizePart3Text));
  pushIf(normalizedAccepted.has(normalizedSample), errors, `${question.id}: acceptedAnswers must contain sampleAnswer`);

  if (question.direction === "vi_to_ko") {
    pushIf(!hasHangul(question.prompt), errors, `${question.id}: vi_to_ko prompt should be Vietnamese`);
    pushIf(hasHangul(question.sampleAnswer), errors, `${question.id}: vi_to_ko sampleAnswer should be Korean`);
  }

  if (question.direction === "ko_to_vi") {
    pushIf(hasHangul(question.prompt), errors, `${question.id}: ko_to_vi prompt should be Korean`);
    pushIf(!hasHangul(question.sampleAnswer), errors, `${question.id}: ko_to_vi sampleAnswer should be Vietnamese`);
  }
}

function validatePart3Pools(pools = buildPart3Pools()) {
  const scope = readPart3KnowledgeScope();
  const allowedGrammar = new Set(scope.allowedGrammarKeys);
  const allowedVocabulary = new Set(scope.allowedVocabulary);
  const allowedSkills = new Set(scope.allowedSkillKeys);
  const errors = [];
  const seenPoolIds = new Set();
  const seenQuestionIds = new Set();

  pushIf(pools.length === REQUIRED_POOL_COUNT, errors, `Expected ${REQUIRED_POOL_COUNT} pools, got ${pools.length}`);

  for (const pool of pools) {
    pushIf(!seenPoolIds.has(pool.id), errors, `Duplicate pool id: ${pool.id}`);
    seenPoolIds.add(pool.id);
    pushIf(VALID_DIRECTIONS.has(pool.direction), errors, `${pool.id}: invalid direction ${pool.direction}`);
    pushIf(allowedSkills.has(pool.skill), errors, `${pool.id}: skill out of scope ${pool.skill}`);
    pushIf(pool.questions.length === 3, errors, `${pool.id}: expected exactly 3 questions`);

    for (const question of pool.questions) {
      pushIf(!seenQuestionIds.has(question.id), errors, `Duplicate question id: ${question.id}`);
      seenQuestionIds.add(question.id);
      pushIf(question.part === 3, errors, `${question.id}: part must be 3`);
      pushIf(question.poolId === pool.id, errors, `${question.id}: poolId mismatch`);
      pushIf(question.direction === pool.direction, errors, `${question.id}: direction mismatch`);
      pushIf(question.skill === pool.skill, errors, `${question.id}: skill mismatch`);
      pushIf(Boolean(question.prompt), errors, `${question.id}: prompt is empty`);
      pushIf(Boolean(question.explanationVi), errors, `${question.id}: explanationVi is empty`);
      pushIf(Boolean(question.semanticGroupId), errors, `${question.id}: semanticGroupId is empty`);
      pushIf(Array.isArray(question.grammarUsed) && question.grammarUsed.length > 0, errors, `${question.id}: grammarUsed is empty`);
      pushIf(Array.isArray(question.vocabularyUsed) && question.vocabularyUsed.length > 0, errors, `${question.id}: vocabularyUsed is empty`);

      const missingGrammar = question.grammarUsed.filter(item => !allowedGrammar.has(item));
      const missingVocabulary = question.vocabularyUsed.filter(item => !allowedVocabulary.has(item));
      pushIf(missingGrammar.length === 0, errors, `${question.id}: grammar out of scope: ${missingGrammar.join(", ")}`);
      pushIf(missingVocabulary.length === 0, errors, `${question.id}: vocabulary out of scope: ${missingVocabulary.join(", ")}`);
      pushIf(question.validation.grammarInScope === (missingGrammar.length === 0), errors, `${question.id}: grammarInScope flag mismatch`);
      pushIf(question.validation.vocabularyInScope === (missingVocabulary.length === 0), errors, `${question.id}: vocabularyInScope flag mismatch`);
      pushIf(question.validation.translationNatural === true, errors, `${question.id}: translationNatural must be true`);
      pushIf(question.validation.multipleValidAnswersHandled === true, errors, `${question.id}: multipleValidAnswersHandled must be true`);

      validateAnswerShape(question, errors);
    }
  }

  const questions = pools.flatMap(pool => pool.questions);
  pushIf(questions.length === REQUIRED_QUESTION_COUNT, errors, `Expected ${REQUIRED_QUESTION_COUNT} questions, got ${questions.length}`);

  return {
    valid: errors.length === 0,
    errors,
    poolCount: pools.length,
    questionCount: questions.length,
  };
}

function writePart3PoolArtifacts() {
  const pools = buildPart3Pools();
  const result = validatePart3Pools(pools);
  if (!result.valid) {
    throw new Error(`Part 3 validation failed:\n${result.errors.join("\n")}`);
  }

  const catalog = pools.map(({ questions, ...pool }) => ({
    ...pool,
    quantity: questions.length,
  }));
  const questions = buildPart3Questions();

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
  const result = writePart3PoolArtifacts();
  console.log(`Validated ${result.poolCount} Part 3 pools / ${result.questionCount} questions.`);
  console.log(`Wrote ${path.relative(ROOT_DIR, result.catalogPath)}`);
  console.log(`Wrote ${path.relative(ROOT_DIR, result.questionsPath)}`);
}

module.exports = {
  POOL_OUTPUT_PATH,
  QUESTION_OUTPUT_PATH,
  validatePart3Pools,
  writePart3PoolArtifacts,
};
