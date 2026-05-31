const fs = require("fs");
const path = require("path");

const ROOT_DIR = path.resolve(__dirname, "../../../..");
const SOURCE_DIR = path.join(ROOT_DIR, "data");
const GRAMMAR_PATH = path.join(SOURCE_DIR, "nguphapsc_1-8.json");
const VOCABULARY_PATH = path.join(SOURCE_DIR, "tuvungsocap_1-8.json");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function lessonNumberFromText(text) {
  const match = text.match(/Bài\s+(\d+)/i);
  if (!match) return null;
  return Number(match[1]);
}

function normalizeGrammar(value) {
  if (value === "-(으)시-" || value === "(으)ㅂ시다") return "-(으)ㅂ시다";
  if (value === "-겠-" || value === "-겠- <ý định>") return "-겠-";
  if (value === "Giản lược") return "Giản lược ㅡ";
  if (value === "에서 <địa điểm>") return "에서";
  if (value === "에 <thời gian>") return "에 <thời gian>";
  return String(value).trim();
}

function normalizeVocabulary(value) {
  return String(value).trim();
}

function buildKnowledgeIndex() {
  const grammarSource = readJson(GRAMMAR_PATH);
  const vocabularySource = readJson(VOCABULARY_PATH);

  const grammarByLesson = new Map();
  for (const lesson of grammarSource.grammar_list) {
    const lessonNumber = lessonNumberFromText(lesson.lesson);
    if (!lessonNumber) continue;

    const values = new Set();
    for (const item of lesson.grammar ?? []) values.add(normalizeGrammar(item));
    for (const point of lesson.grammar_points ?? []) {
      values.add(normalizeGrammar(point.grammar));
    }

    if (lessonNumber === 3) values.add("에서");
    if (lessonNumber === 7) values.add("Giản lược ㅡ");
    if (lessonNumber === 6) values.delete("-(으)시-");
    if (lessonNumber === 6) values.add("-(으)ㅂ시다");

    grammarByLesson.set(lessonNumber, values);
  }

  const vocabularyByLesson = new Map();
  for (const [lessonName, words] of Object.entries(vocabularySource.data)) {
    const lessonNumber = lessonNumberFromText(lessonName);
    if (!lessonNumber) continue;

    vocabularyByLesson.set(
      lessonNumber,
      new Set(words.map(item => normalizeVocabulary(item.w))),
    );
  }

  function getCumulativeGrammar(targetLesson) {
    const result = new Set();
    for (let lesson = 1; lesson <= targetLesson; lesson += 1) {
      for (const item of grammarByLesson.get(lesson) ?? []) result.add(item);
    }
    return result;
  }

  function getCumulativeVocabulary(targetLesson) {
    const result = new Set();
    for (let lesson = 1; lesson <= targetLesson; lesson += 1) {
      for (const item of vocabularyByLesson.get(lesson) ?? []) result.add(item);
    }
    return result;
  }

  return {
    grammarByLesson,
    vocabularyByLesson,
    getCumulativeGrammar,
    getCumulativeVocabulary,
  };
}

module.exports = {
  buildKnowledgeIndex,
  normalizeGrammar,
  normalizeVocabulary,
  GRAMMAR_PATH,
  VOCABULARY_PATH,
};
