# Part 3 Static Translation Exam Usage

## Files

Static exam sets:

```text
src/data/korean/generated/part3-static-exams.json
```

Answer keys:

```text
src/data/korean/generated/part3-static-answer-keys.json
```

Root question bank:

```text
src/data/korean/pools/part3-questions.json
```

Generation report:

```text
src/data/korean/generated/part3-static-exams-report.json
```

Part 3 scope:

```text
src/data/korean/source/part3-translation-scope.json
```

## Exam Shape

Each Part 3 exam has 8 translation questions:

```text
Questions 1-4: Vietnamese to Korean
Questions 5-8: Korean to Vietnamese
```

Each static exam question stores only display metadata:

```json
{
  "questionId": "P3_VK_01_Q001",
  "poolId": "P3_VK_01",
  "direction": "vi_to_ko",
  "displayOrder": 1
}
```

The full prompt and answer data are stored in `part3-questions.json`.

## Render One Exam

```js
const exams = require("../../../data/korean/generated/part3-static-exams.json");
const questions = require("../../../data/korean/pools/part3-questions.json");

const questionById = new Map(
  questions.map(question => [question.id, question]),
);

const exam = exams.find(item => item.id === "PART3_EXAM_001");

const renderedQuestions = exam.questions
  .sort((a, b) => a.displayOrder - b.displayOrder)
  .map(examQuestion => {
    const question = questionById.get(examQuestion.questionId);

    return {
      displayOrder: examQuestion.displayOrder,
      direction: examQuestion.direction,
      prompt: question.prompt,
    };
  });
```

## Answer Key

Do not send answer keys to the learner view unless the product intentionally shows answers.

```js
const answerKeys = require("../../../data/korean/generated/part3-static-answer-keys.json");

const answerKey = answerKeys.find(item => item.examId === "PART3_EXAM_001");
```

Each answer contains:

```json
{
  "questionId": "P3_VK_01_Q001",
  "displayOrder": 1,
  "direction": "vi_to_ko",
  "sampleAnswer": "오후 8시에 공원에서 같이 산책합시다.",
  "acceptedAnswers": [
    "오후 8시에 공원에서 같이 산책합시다.",
    "오후 8시에 공원에서 함께 산책합시다."
  ],
  "explanationVi": "Dùng -(으)ㅂ시다 để rủ rê cùng làm việc."
}
```

## Grading Note

Part 3 can be graded by normalized string matching against fixed accepted answers.

Use both `sampleAnswer` and every item in `acceptedAnswers`.

Normalize whitespace before comparing:

```js
function normalizeTranslationAnswer(value) {
  return String(value)
    .trim()
    .replace(/\s+/g, " ")
    .replace(/h\u01b0\u01a1ng|huong/giu, "HUONG")
    .replace(/tu\u1ea5n|tuan/giu, "TUAN")
    .replace(/t\u00e2m|tam/giu, "TAM");
}

function isAcceptedTranslation(userAnswer, answer) {
  const normalizedUserAnswer = normalizeTranslationAnswer(userAnswer);
  const accepted = new Set(
    [answer.sampleAnswer, ...answer.acceptedAnswers].map(normalizeTranslationAnswer),
  );

  return accepted.has(normalizedUserAnswer);
}
```

This handles extra spaces, line breaks, and common unaccented Vietnamese person names used in the exams:

```text
Hương = Huong
Tuấn = Tuan
Tâm = Tam
```

Synonyms or equivalent translations must be listed in `acceptedAnswers`. Do not compare only with `sampleAnswer`.

## Regenerate

```bash
node src/features/quiz/part3/generate-static-part3-exams.js
```

This rewrites:

```text
src/data/korean/pools/part3-pool-catalog.json
src/data/korean/pools/part3-questions.json
src/data/korean/generated/part3-static-exams.json
src/data/korean/generated/part3-static-answer-keys.json
src/data/korean/generated/part3-static-exams-report.json
```

## Validate

```bash
node src/features/quiz/part3/validate-part3-pools.js
node src/features/quiz/part3/generate-static-part3-exams.test.js
```
