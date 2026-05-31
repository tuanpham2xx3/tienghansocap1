const fs = require("fs");
const path = require("path");

const ROOT_DIR = path.resolve(__dirname, "../../..");

const PART1_EXAMS_PATH = path.join(ROOT_DIR, "src/data/korean/generated/part1-static-exams.json");
const PART2_EXAMS_PATH = path.join(ROOT_DIR, "src/data/korean/generated/part2/part2-static-exams.json");
const PART3_EXAMS_PATH = path.join(ROOT_DIR, "src/data/korean/generated/part3-static-exams.json");
const PART2_ANSWER_KEYS_PATH = path.join(ROOT_DIR, "src/data/korean/generated/part2/part2-static-answer-keys.json");
const PART3_ANSWER_KEYS_PATH = path.join(ROOT_DIR, "src/data/korean/generated/part3-static-answer-keys.json");

const OFFICIAL_EXAMS_OUTPUT_PATH = path.join(ROOT_DIR, "src/data/korean/generated/official-exams.json");
const OFFICIAL_ANSWER_KEYS_OUTPUT_PATH = path.join(ROOT_DIR, "src/data/korean/generated/official-exam-answer-keys.json");

const OFFICIAL_EXAM_COUNT = 20;
const GENERATED_AT = "2026-05-31T00:00:00.000Z";

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function padExamNumber(value) {
  return String(value).padStart(3, "0");
}

function officialExamId(index) {
  return `OFFICIAL_EXAM_${padExamNumber(index)}`;
}

function partExamId(part, index) {
  return `PART${part}_EXAM_${padExamNumber(index)}`;
}

function rotateIndex(officialIndex, offset, total = OFFICIAL_EXAM_COUNT) {
  return ((officialIndex + offset - 1) % total) + 1;
}

function normalizeTranslationAnswer(value) {
  return String(value)
    .trim()
    .replace(/\s+/g, " ")
    .replace(/h\u01b0\u01a1ng|huong/giu, "HUONG")
    .replace(/tu\u1ea5n|tuan/giu, "TUAN")
    .replace(/t\u00e2m|tam/giu, "TAM");
}

function isAcceptedPart3Translation(userAnswer, answer) {
  const normalizedUserAnswer = normalizeTranslationAnswer(userAnswer);
  const accepted = new Set(
    [answer.sampleAnswer, ...answer.acceptedAnswers].map(normalizeTranslationAnswer),
  );
  return accepted.has(normalizedUserAnswer);
}

function validateSourceData({ part1Exams, part2Exams, part3Exams, part2AnswerKeys, part3AnswerKeys }) {
  const errors = [];

  if (part1Exams.length !== OFFICIAL_EXAM_COUNT) errors.push(`Expected 20 Part 1 exams, got ${part1Exams.length}`);
  if (part2Exams.length !== OFFICIAL_EXAM_COUNT) errors.push(`Expected 20 Part 2 exams, got ${part2Exams.length}`);
  if (part3Exams.length !== OFFICIAL_EXAM_COUNT) errors.push(`Expected 20 Part 3 exams, got ${part3Exams.length}`);
  if (part2AnswerKeys.length !== OFFICIAL_EXAM_COUNT) errors.push(`Expected 20 Part 2 answer keys, got ${part2AnswerKeys.length}`);
  if (part3AnswerKeys.length !== OFFICIAL_EXAM_COUNT) errors.push(`Expected 20 Part 3 answer keys, got ${part3AnswerKeys.length}`);

  const ids = {
    part1: new Set(part1Exams.map(item => item.id)),
    part2: new Set(part2Exams.map(item => item.id)),
    part3: new Set(part3Exams.map(item => item.id)),
    part2AnswerKeys: new Set(part2AnswerKeys.map(item => item.examId)),
    part3AnswerKeys: new Set(part3AnswerKeys.map(item => item.examId)),
  };

  for (let index = 1; index <= OFFICIAL_EXAM_COUNT; index += 1) {
    if (!ids.part1.has(partExamId(1, index))) errors.push(`Missing ${partExamId(1, index)}`);
    if (!ids.part2.has(partExamId(2, index))) errors.push(`Missing ${partExamId(2, index)}`);
    if (!ids.part3.has(partExamId(3, index))) errors.push(`Missing ${partExamId(3, index)}`);
    if (!ids.part2AnswerKeys.has(partExamId(2, index))) errors.push(`Missing Part 2 answer key ${partExamId(2, index)}`);
    if (!ids.part3AnswerKeys.has(partExamId(3, index))) errors.push(`Missing Part 3 answer key ${partExamId(3, index)}`);
  }

  for (const key of part3AnswerKeys) {
    for (const answer of key.answers) {
      if (!answer.sampleAnswer) errors.push(`${key.examId}/${answer.questionId}: sampleAnswer is empty`);
      if (!Array.isArray(answer.acceptedAnswers) || answer.acceptedAnswers.length === 0) {
        errors.push(`${key.examId}/${answer.questionId}: acceptedAnswers is empty`);
      }
      if (!isAcceptedPart3Translation(answer.sampleAnswer, answer)) {
        errors.push(`${key.examId}/${answer.questionId}: sampleAnswer must be included in acceptedAnswers after normalize`);
      }
    }
  }

  if (errors.length > 0) {
    throw new Error(`Cannot generate official exams:\n${errors.join("\n")}`);
  }
}

function buildOfficialExams() {
  const source = {
    part1Exams: readJson(PART1_EXAMS_PATH),
    part2Exams: readJson(PART2_EXAMS_PATH),
    part3Exams: readJson(PART3_EXAMS_PATH),
    part2AnswerKeys: readJson(PART2_ANSWER_KEYS_PATH),
    part3AnswerKeys: readJson(PART3_ANSWER_KEYS_PATH),
  };

  validateSourceData(source);

  const officialExams = [];
  const officialAnswerKeys = [];

  for (let officialIndex = 1; officialIndex <= OFFICIAL_EXAM_COUNT; officialIndex += 1) {
    const id = officialExamId(officialIndex);
    const part1Id = partExamId(1, officialIndex);
    const part2Id = partExamId(2, rotateIndex(officialIndex, 1));
    const part3Id = partExamId(3, rotateIndex(officialIndex, 2));

    officialExams.push({
      id,
      title: `Đề chính thức ${padExamNumber(officialIndex)}`,
      generatedAt: GENERATED_AT,
      partExamIds: {
        part1: part1Id,
        part2: part2Id,
        part3: part3Id,
      },
      questionCounts: {
        part1: 10,
        part2: 9,
        part3: 8,
        total: 27,
      },
    });

    officialAnswerKeys.push({
      examId: id,
      parts: {
        part1: {
          examId: part1Id,
          gradingMode: "option_id",
        },
        part2: {
          examId: part2Id,
          gradingMode: "option_id",
          answerKeyRef: "src/data/korean/generated/part2/part2-static-answer-keys.json",
        },
        part3: {
          examId: part3Id,
          gradingMode: "normalized_string_with_accepted_answers",
          answerKeyRef: "src/data/korean/generated/part3-static-answer-keys.json",
          normalization: {
            trim: true,
            collapseWhitespace: true,
            nameAliases: {
              "H\u01b0\u01a1ng": ["Huong"],
              "Tu\u1ea5n": ["Tuan"],
              "T\u00e2m": ["Tam"],
            },
          },
        },
      },
    });
  }

  return { officialExams, officialAnswerKeys };
}

function writeOfficialExamArtifacts() {
  const { officialExams, officialAnswerKeys } = buildOfficialExams();
  fs.mkdirSync(path.dirname(OFFICIAL_EXAMS_OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OFFICIAL_EXAMS_OUTPUT_PATH, `${JSON.stringify(officialExams, null, 2)}\n`, "utf8");
  fs.writeFileSync(OFFICIAL_ANSWER_KEYS_OUTPUT_PATH, `${JSON.stringify(officialAnswerKeys, null, 2)}\n`, "utf8");

  return {
    officialExams,
    officialAnswerKeys,
    examsPath: OFFICIAL_EXAMS_OUTPUT_PATH,
    answerKeysPath: OFFICIAL_ANSWER_KEYS_OUTPUT_PATH,
  };
}

if (require.main === module) {
  const result = writeOfficialExamArtifacts();
  console.log(`Generated ${result.officialExams.length} official exams.`);
  console.log(`Wrote ${path.relative(ROOT_DIR, result.examsPath)}`);
  console.log(`Wrote ${path.relative(ROOT_DIR, result.answerKeysPath)}`);
}

module.exports = {
  OFFICIAL_EXAM_COUNT,
  buildOfficialExams,
  isAcceptedPart3Translation,
  normalizeTranslationAnswer,
  rotateIndex,
  writeOfficialExamArtifacts,
};
