# Part 2 Static Reading Exam Usage

## Files

Static exam sets:

```text
src/data/korean/generated/part2/part2-static-exams.json
```

Answer keys:

```text
src/data/korean/generated/part2/part2-static-answer-keys.json
```

Root question bank:

```text
src/data/korean/pools/part2-questions.json
```

Structured visual stimuli:

```text
src/data/korean/pools/part2-stimuli.json
src/data/korean/generated/part2/stimuli/*.json
```

Generation report:

```text
src/data/korean/generated/part2/part2-static-exams-report.json
```

## Exam Shape

Each Part 2 exam has 9 questions:

```text
Questions 1-5: topic_identification
Questions 6-7: visual_incorrect_statement
Questions 8-9: passage_correct_statement
```

The static exam stores selected question ids and shuffled option ids:

```json
{
  "questionId": "P2_T1_TOPIC_HOBBY_Q001",
  "poolId": "P2_T1_TOPIC_HOBBY",
  "section": "topic_identification",
  "displayOrder": 1,
  "shuffledOptionIds": [
    "P2_T1_TOPIC_HOBBY_Q001_OPT_C",
    "P2_T1_TOPIC_HOBBY_Q001_OPT_A",
    "P2_T1_TOPIC_HOBBY_Q001_OPT_D",
    "P2_T1_TOPIC_HOBBY_Q001_OPT_B"
  ]
}
```

## Render One Exam

```js
const exams = require("../../../data/korean/generated/part2/part2-static-exams.json");
const questions = require("../../../data/korean/pools/part2-questions.json");

const questionById = new Map(
  questions.map(question => [question.id, question]),
);

const exam = exams.find(item => item.id === "PART2_EXAM_001");

const renderedQuestions = exam.questions
  .sort((a, b) => a.displayOrder - b.displayOrder)
  .map(examQuestion => {
    const question = questionById.get(examQuestion.questionId);
    const optionById = new Map(
      question.options.map(option => [option.id, option]),
    );

    return {
      displayOrder: examQuestion.displayOrder,
      section: examQuestion.section,
      readingText: question.readingText,
      prompt: question.prompt,
      stimulus: question.stimulus,
      options: examQuestion.shuffledOptionIds.map(optionId =>
        optionById.get(optionId),
      ),
    };
  });
```

For `visual_incorrect_statement`, render from `question.stimulus.structuredData` or show `question.stimulus.fallbackText`.

## Check Answer

Store or submit the selected option id:

```js
function isCorrect(question, selectedOptionId) {
  return selectedOptionId === question.correctOptionId;
}
```

Do not check by display label or index after shuffling.

## Regenerate

```bash
node src/features/quiz/part2/generate-static-part2-exams.js
```

## Validate

```bash
node src/features/quiz/part2/validate-part2-pools.js
node src/features/quiz/part2/generate-static-part2-exams.test.js
```
