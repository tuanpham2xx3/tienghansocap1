# Part 1 Static Exam Usage

## Files

Generated exam sets:

```text
src/data/korean/generated/part1-static-exams.json
```

Root question bank:

```text
src/data/korean/pools/part1-questions.json
```

Generation quality report:

```text
src/data/korean/generated/part1-static-exams-report.json
```

## Data Relationship

`part1-static-exams.json` stores the 20 fixed exam sets.

Each exam contains 10 selected questions:

```json
{
  "questionId": "P1_L07_01_Q001",
  "poolId": "P1_L07_01",
  "displayOrder": 8,
  "shuffledOptionIds": [
    "P1_L07_01_Q001_OPT_JAN",
    "P1_L07_01_Q001_OPT_GWON",
    "P1_L07_01_Q001_OPT_BYEONG",
    "P1_L07_01_Q001_OPT_KYEOLLE"
  ]
}
```

The full question content and correct answer are stored in `part1-questions.json`.

## Get One Exam

Example with plain Node.js:

```js
const exams = require("../../../data/korean/generated/part1-static-exams.json");
const questions = require("../../../data/korean/pools/part1-questions.json");

const questionById = new Map(
  questions.map(question => [question.id, question]),
);

const exam = exams.find(item => item.id === "PART1_EXAM_001");

const renderedQuestions = exam.questions
  .sort((a, b) => a.displayOrder - b.displayOrder)
  .map(examQuestion => {
    const question = questionById.get(examQuestion.questionId);
    const optionById = new Map(
      question.options.map(option => [option.id, option]),
    );

    return {
      questionId: question.id,
      stem: question.stem,
      options: examQuestion.shuffledOptionIds.map(optionId =>
        optionById.get(optionId),
      ),
    };
  });
```

## Render Options

Do not use option index as the answer.

Use the fixed `shuffledOptionIds` order from the static exam. The UI can add display labels at render time:

```js
const displayLabels = ["①", "②", "③", "④"];

for (const [index, option] of renderedQuestion.options.entries()) {
  console.log(displayLabels[index], option.text);
}
```

## Check Answer

When the learner selects an option, store or submit the selected option id:

```js
const selectedOptionId = "P1_L07_01_Q001_OPT_GWON";
```

Then compare it with the root question's `correctOptionId`:

```js
function isCorrect(question, selectedOptionId) {
  return selectedOptionId === question.correctOptionId;
}
```

Do not check by display label or index:

```text
Wrong: selectedIndex === 1
Wrong: selectedLabel === "②"
Right: selectedOptionId === question.correctOptionId
```

## Regenerate Exam Sets

Run:

```bash
node src/features/quiz/part1/generate-static-part1-exams.js
```

This rewrites:

```text
src/data/korean/pools/part1-pool-catalog.json
src/data/korean/pools/part1-questions.json
src/data/korean/generated/part1-static-exams.json
src/data/korean/generated/part1-static-exams-report.json
```

## Validate

Run:

```bash
node src/features/quiz/part1/validate-part1-pools.js
node src/features/quiz/part1/generate-static-part1-exams.test.js
```
