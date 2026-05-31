/**
 * Runtime shape reference for Part 1 question-pool data.
 *
 * This project does not currently have a TypeScript toolchain, so these
 * typedefs document the JSON contract while keeping the scripts runnable with
 * plain Node.js.
 *
 * @typedef {"grammar"|"vocabulary"|"dialogue"|"number_time"|"number_counter"|"vocabulary_dialogue"|"grammar_dialogue"} Part1Skill
 *
 * @typedef {Object} Part1Option
 * @property {string} id
 * @property {string} text
 *
 * @typedef {Object} Part1Question
 * @property {string} id
 * @property {string} poolId
 * @property {number} targetLesson
 * @property {Part1Skill} skill
 * @property {string} knowledgeTarget
 * @property {"easy"|"medium"} difficulty
 * @property {string} stem
 * @property {Part1Option[]} options
 * @property {string} correctOptionId
 * @property {string} correctValue
 * @property {string} explanationVi
 * @property {string[]} grammarUsed
 * @property {string[]} vocabularyUsed
 * @property {{grammarInScope:boolean,vocabularyInScope:boolean,singleCorrectAnswer:boolean,reviewed:boolean}} validation
 *
 * @typedef {Object} Part1QuestionPool
 * @property {string} id
 * @property {number} targetLesson
 * @property {Part1Skill} skill
 * @property {string} knowledgeTarget
 * @property {Part1Question[]} questions
 *
 * @typedef {Object} StaticExamQuestion
 * @property {string} questionId
 * @property {string} poolId
 * @property {number} displayOrder
 * @property {string[]} shuffledOptionIds
 *
 * @typedef {Object} StaticPart1Exam
 * @property {string} id
 * @property {1} part
 * @property {{fromLesson:number,toLesson:number}} scope
 * @property {10} questionCount
 * @property {string} generatedAt
 * @property {string=} generationSeed
 * @property {StaticExamQuestion[]} questions
 */

module.exports = {};
