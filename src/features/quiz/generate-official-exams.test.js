const assert = require("assert");
const fs = require("fs");
const path = require("path");
const {
  OFFICIAL_EXAM_COUNT,
  buildOfficialExams,
  isAcceptedPart3Translation,
  normalizeTranslationAnswer,
  rotateIndex,
} = require("./generate-official-exams");

const ROOT_DIR = path.resolve(__dirname, "../../..");

function partExamId(part, index) {
  return `PART${part}_EXAM_${String(index).padStart(3, "0")}`;
}

function officialExamId(index) {
  return `OFFICIAL_EXAM_${String(index).padStart(3, "0")}`;
}

function runTests() {
  const { officialExams, officialAnswerKeys } = buildOfficialExams();

  assert.strictEqual(officialExams.length, 20);
  assert.strictEqual(officialAnswerKeys.length, 20);

  const examIds = new Set();
  for (let index = 1; index <= OFFICIAL_EXAM_COUNT; index += 1) {
    const exam = officialExams[index - 1];
    assert.strictEqual(exam.id, officialExamId(index));
    assert.ok(!examIds.has(exam.id), `${exam.id}: duplicate official exam id`);
    examIds.add(exam.id);

    assert.strictEqual(exam.partExamIds.part1, partExamId(1, index));
    assert.strictEqual(exam.partExamIds.part2, partExamId(2, rotateIndex(index, 1)));
    assert.strictEqual(exam.partExamIds.part3, partExamId(3, rotateIndex(index, 2)));
    assert.deepStrictEqual(exam.questionCounts, {
      part1: 10,
      part2: 9,
      part3: 8,
      total: 27,
    });

    const key = officialAnswerKeys[index - 1];
    assert.strictEqual(key.examId, exam.id);
    assert.strictEqual(key.parts.part1.examId, exam.partExamIds.part1);
    assert.strictEqual(key.parts.part1.gradingMode, "option_id");
    assert.strictEqual(key.parts.part2.examId, exam.partExamIds.part2);
    assert.strictEqual(key.parts.part2.gradingMode, "option_id");
    assert.strictEqual(key.parts.part3.examId, exam.partExamIds.part3);
    assert.strictEqual(key.parts.part3.gradingMode, "normalized_string_with_accepted_answers");
    assert.strictEqual(key.parts.part3.normalization.trim, true);
    assert.strictEqual(key.parts.part3.normalization.collapseWhitespace, true);
    assert.deepStrictEqual(key.parts.part3.normalization.nameAliases, {
      "H\u01b0\u01a1ng": ["Huong"],
      "Tu\u1ea5n": ["Tuan"],
      "T\u00e2m": ["Tam"],
    });
  }

  assert.strictEqual(officialExams[0].partExamIds.part1, "PART1_EXAM_001");
  assert.strictEqual(officialExams[0].partExamIds.part2, "PART2_EXAM_002");
  assert.strictEqual(officialExams[0].partExamIds.part3, "PART3_EXAM_003");
  assert.strictEqual(officialExams[19].partExamIds.part1, "PART1_EXAM_020");
  assert.strictEqual(officialExams[19].partExamIds.part2, "PART2_EXAM_001");
  assert.strictEqual(officialExams[19].partExamIds.part3, "PART3_EXAM_002");

  const part3AnswerKeys = JSON.parse(
    fs.readFileSync(path.join(ROOT_DIR, "src/data/korean/generated/part3-static-answer-keys.json"), "utf8"),
  );
  const sampleAnswer = part3AnswerKeys[0].answers[0];
  assert.strictEqual(isAcceptedPart3Translation(`  ${sampleAnswer.sampleAnswer}  `, sampleAnswer), true);
  assert.strictEqual(
    isAcceptedPart3Translation(sampleAnswer.sampleAnswer.replace(/\s+/g, "   "), sampleAnswer),
    true,
  );
  assert.strictEqual(normalizeTranslationAnswer(" a   b \n c "), "a b c");

  assert.strictEqual(
    isAcceptedPart3Translation("Ch\u1ecb Huong la giao vien.", {
      sampleAnswer: "Ch\u1ecb H\u01b0\u01a1ng la giao vien.",
      acceptedAnswers: [],
    }),
    true,
  );
  assert.strictEqual(
    isAcceptedPart3Translation("Anh Tuan den truong.", {
      sampleAnswer: "Anh Tu\u1ea5n den truong.",
      acceptedAnswers: [],
    }),
    true,
  );
  assert.strictEqual(
    isAcceptedPart3Translation("Tam hoc tieng Han.", {
      sampleAnswer: "T\u00e2m hoc tieng Han.",
      acceptedAnswers: [],
    }),
    true,
  );
}

if (require.main === module) {
  runTests();
  console.log("Official exam tests passed.");
}

module.exports = { runTests };
