/**
 * Runtime shape reference for Part 3 translation data.
 *
 * @typedef {"vi_to_ko"|"ko_to_vi"} TranslationDirection
 * @typedef {"invitation"|"preference"|"family_job"|"past_activity"|"nationality_qa"|"desire_travel"|"shopping_quantity"|"contrast_description"|"ability_negation"|"reason_request"|"habit_frequency"|"plan_intention"|"location_existence"|"time_schedule"} Part3Skill
 *
 * @typedef {Object} Part3TranslationQuestion
 * @property {string} id
 * @property {3} part
 * @property {string} poolId
 * @property {TranslationDirection} direction
 * @property {Part3Skill} skill
 * @property {string} knowledgeTarget
 * @property {"easy"|"medium"} difficulty
 * @property {string} prompt
 * @property {string} sampleAnswer
 * @property {string[]} acceptedAnswers
 * @property {string[]} grammarUsed
 * @property {string[]} vocabularyUsed
 * @property {string} explanationVi
 * @property {string} semanticGroupId
 * @property {{grammarInScope:boolean,vocabularyInScope:boolean,translationNatural:boolean,multipleValidAnswersHandled:boolean,reviewed:boolean}} validation
 *
 * @typedef {Object} Part3QuestionPool
 * @property {string} id
 * @property {TranslationDirection} direction
 * @property {Part3Skill} skill
 * @property {string} knowledgeTarget
 * @property {Part3TranslationQuestion[]} questions
 */

module.exports = {};
