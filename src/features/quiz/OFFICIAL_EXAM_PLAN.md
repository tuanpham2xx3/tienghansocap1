# Kế Hoạch Tạo Đề Chính Thức Từ Part 1, 2, 3

## Mục Tiêu

Tạo các **đề thi chính thức** bằng cách ghép cố định các mã đề tĩnh đã generate sẵn của:

- Part 1: Từ vựng - Ngữ pháp
- Part 2: Đọc hiểu
- Part 3: Dịch Hàn - Việt / Việt - Hàn

Không random khi học viên bắt đầu làm bài.

## Nguồn Dữ Liệu

Part 1:

```text
src/data/korean/generated/part1-static-exams.json
```

Part 2:

```text
src/data/korean/generated/part2/part2-static-exams.json
```

Part 3:

```text
src/data/korean/generated/part3-static-exams.json
```

Answer keys:

```text
src/data/korean/generated/part2/part2-static-answer-keys.json
src/data/korean/generated/part3-static-answer-keys.json
```

Part 1 không cần answer key riêng nếu app chấm bằng `correctOptionId` từ:

```text
src/data/korean/pools/part1-questions.json
```

## Output Mong Muốn

Tạo file:

```text
src/data/korean/generated/official-exams.json
src/data/korean/generated/official-exam-answer-keys.json
```

## Cấu Trúc Đề Chính Thức

Mỗi đề chính thức chỉ lưu tham chiếu tới mã đề tĩnh của từng part:

```json
{
  "id": "OFFICIAL_EXAM_001",
  "title": "Đề chính thức 001",
  "parts": {
    "part1ExamId": "PART1_EXAM_001",
    "part2ExamId": "PART2_EXAM_002",
    "part3ExamId": "PART3_EXAM_003"
  }
}
```

Khi render đề, app đọc lần lượt:

1. `PART1_EXAM_001` từ `part1-static-exams.json`
2. `PART2_EXAM_002` từ `part2-static-exams.json`
3. `PART3_EXAM_003` từ `part3-static-exams.json`

## Quy Tắc Ghép Đề

Không random runtime.

Tạo mapping cố định trước, ví dụ:

| Đề chính thức | Part 1 | Part 2 | Part 3 |
|---|---|---|---|
| `OFFICIAL_EXAM_001` | `PART1_EXAM_001` | `PART2_EXAM_002` | `PART3_EXAM_003` |
| `OFFICIAL_EXAM_002` | `PART1_EXAM_002` | `PART2_EXAM_003` | `PART3_EXAM_004` |
| `OFFICIAL_EXAM_003` | `PART1_EXAM_003` | `PART2_EXAM_004` | `PART3_EXAM_005` |

Có thể dùng công thức xoay vòng cố định:

```js
part1Index = officialIndex
part2Index = ((officialIndex + 1 - 1) % 20) + 1
part3Index = ((officialIndex + 2 - 1) % 20) + 1
```

Ví dụ:

```text
OFFICIAL_EXAM_001 = PART1_EXAM_001 + PART2_EXAM_002 + PART3_EXAM_003
OFFICIAL_EXAM_020 = PART1_EXAM_020 + PART2_EXAM_001 + PART3_EXAM_002
```

## Số Lượng

Vì mỗi part hiện có 20 mã đề:

```text
Part 1: 20
Part 2: 20
Part 3: 20
```

Nên tạo mặc định:

```text
20 đề chính thức
```

## Schema Đề Chính Thức

```ts
export interface OfficialExam {
  id: string;
  title: string;
  generatedAt: string;
  partExamIds: {
    part1: string;
    part2: string;
    part3: string;
  };
  questionCounts: {
    part1: 10;
    part2: 9;
    part3: 8;
    total: 27;
  };
}
```

## Schema Answer Key

```ts
export interface OfficialExamAnswerKey {
  examId: string;
  parts: {
    part1: {
      examId: string;
      gradingMode: "option_id";
    };
    part2: {
      examId: string;
      gradingMode: "option_id";
      answerKeyRef: string;
    };
    part3: {
      examId: string;
      gradingMode: "normalized_string_with_accepted_answers";
      answerKeyRef: string;
    };
  };
}
```

Part 3 chấm bằng string cố định sau khi normalize nhẹ:

- Trim đầu/cuối.
- Gộp nhiều khoảng trắng thành một khoảng trắng.
- Không quá khắt khe về khoảng trắng giữa từ/cụm.
- Cho phép tên người viết không dấu: `Hương/Huong`, `Tuấn/Tuan`, `Tâm/Tam`.
- So sánh với `sampleAnswer` và toàn bộ `acceptedAnswers`.
- Các cách diễn đạt đồng nghĩa/tương đương phải được đưa vào `acceptedAnswers`.

Không chỉ so với `sampleAnswer`, vì Part 3 có thể có nhiều bản dịch đúng.

## Validation Bắt Buộc

Script tạo đề chính thức phải kiểm tra:

- Có đủ 20 mã đề Part 1.
- Có đủ 20 mã đề Part 2.
- Có đủ 20 mã đề Part 3.
- Mỗi official exam tham chiếu tới exam id tồn tại.
- Không official exam nào thiếu part.
- `questionCounts.total === 27`.
- Part 3 answer key có `sampleAnswer` và `acceptedAnswers` không rỗng.
- Part 3 grading dùng normalize whitespace và đối chiếu toàn bộ `acceptedAnswers`.
- Không random trong lúc render hoặc lúc học viên bắt đầu làm bài.

## Script Đề Xuất

Tạo:

```text
src/features/quiz/generate-official-exams.js
src/features/quiz/generate-official-exams.test.js
```

Script sẽ:

1. Đọc 3 file static exams.
2. Validate mỗi part có 20 mã đề.
3. Tạo 20 mapping cố định.
4. Xuất `official-exams.json`.
5. Xuất `official-exam-answer-keys.json`.
6. Test lại toàn bộ mapping.

## Không Được Làm

```text
- Không random chọn Part 1/2/3 khi học viên bắt đầu làm bài.
- Không sinh câu mới.
- Không sửa nội dung mã đề part đã generate.
- Không chấm Part 3 chỉ bằng `sampleAnswer`; phải dùng cả `acceptedAnswers`.
- Không coi khác biệt khoảng trắng là sai nếu nội dung sau normalize trùng.
- Không lưu tracking theo học viên.
```
