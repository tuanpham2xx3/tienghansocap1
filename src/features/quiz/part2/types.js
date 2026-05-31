/**
 * Runtime shape reference for Part 2 reading data.
 *
 * @typedef {"topic_identification"|"visual_incorrect_statement"|"passage_correct_statement"} Part2Section
 * @typedef {"choose_topic"|"choose_incorrect_statement"|"choose_correct_statement"} Part2QuestionType
 * @typedef {"receipt"|"card"|"menu"|"schedule"|"notice"} Part2StimulusType
 *
 * @typedef {Object} QuestionOption
 * @property {string} id
 * @property {string} text
 *
 * @typedef {Object} Part2Question
 * @property {string} id
 * @property {2} part
 * @property {Part2Section} section
 * @property {string} poolId
 * @property {Part2QuestionType} questionType
 * @property {"easy"|"medium"} difficulty
 * @property {QuestionOption[]} options
 * @property {string} correctOptionId
 * @property {string} correctValue
 * @property {string[]} grammarUsed
 * @property {string[]} vocabularyUsed
 * @property {string} explanationVi
 * @property {Object} validation
 *
 * @typedef {Object} Part2QuestionPool
 * @property {string} id
 * @property {2} part
 * @property {Part2Section} section
 * @property {string} knowledgeTarget
 * @property {3} quantity
 * @property {Part2Question[]} questions
 */

module.exports = {};
