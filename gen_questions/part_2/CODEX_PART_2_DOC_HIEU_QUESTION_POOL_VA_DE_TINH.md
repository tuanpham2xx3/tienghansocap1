# CODEX TASK: Tạo Question Pool và Mã Đề Tĩnh cho Part 2 — Đọc hiểu Tiếng Hàn Sơ cấp 1

## 0. Mục tiêu

Triển khai **Part 2: Đọc hiểu** theo mô hình question pool và sinh trước các mã đề tĩnh.

```text
Một mã đề Part 2 = 9 câu
- Dạng 1: Đọc câu/đoạn ngắn, chọn chủ đề đúng: 5 câu
- Dạng 2: Đọc hình/thông tin trực quan, chọn phát biểu không đúng: 2 câu
- Dạng 3: Đọc đoạn văn ngắn, chọn phát biểu đúng: 2 câu
```

Quy tắc chung:

- Không sinh đề runtime theo học viên.
- Không tạo lịch sử/cá nhân hóa theo học viên.
- Mỗi pool có đúng `3` câu biến thể.
- Dùng `correctOptionId`, không lưu đáp án đúng theo vị trí `①/②/③/④`.
- Khi sinh batch mã đề tĩnh, dùng `selectedCount` tạm thời để cân bằng tần suất sử dụng câu.
- Sau khi generate, lưu đề, answer keys và report dưới dạng dữ liệu tĩnh.

---

## 1. Việc Codex cần làm trước khi code

1. Đọc repository hiện tại, xác định stack, convention, thư mục data/seed/test.
2. Kiểm tra Part 1/Part 3 nếu đã được triển khai để tái sử dụng:
   - seeded random;
   - shuffle option theo ID;
   - balanced selection bằng `selectedCount`;
   - overlap calculator;
   - generation report.
3. Không tạo module song song nếu project đã có model `question`, `pool`, `exam`.
4. Không sửa chức năng ngoài phạm vi Part 2.
5. Đọc các nguồn kiến thức đã có nếu tồn tại:

```text
nguphapsc_1-8.json
tuvungsocap_1-8.json
```

6. Tạo thêm scope riêng cho đọc hiểu:

```text
src/data/korean/source/part2-reading-scope.json
```

Scope riêng là bắt buộc vì đề đọc hiểu có thể cần nhãn chủ đề/stimulus/biểu đạt đọc hiểu chưa tồn tại rõ trong hai file Bài 1–8.

---

## 2. Ba dạng câu cần triển khai

### 2.1. Dạng 1: `topic_identification`

Mẫu:

```text
[1~5] Bài đọc sau nói về chủ đề gì?

저는 낚시를 좋아해요. 제 동생은 축구를 좋아해요.

① 취미      ② 시간      ③ 이름      ④ 교통
```

Đặc điểm:

- Đọc 1–2 câu tiếng Hàn.
- Chọn chủ đề bao quát đúng nhất.
- Một mã đề lấy đúng `5` câu dạng này.
- **Không giới hạn ở 5 chủ đề xuất hiện trong đề mẫu**. Pool phải phủ nhiều chủ đề trong phạm vi từ vựng Bài 1–8 và scope được duyệt.

### 2.2. Dạng 2: `visual_incorrect_statement`

Mẫu:

```text
[6~7] Hãy chọn đáp án không đúng.

<Biên lai / thiệp / thực đơn / lịch / thông báo>

① ...
② ...
③ ...
④ ...
```

Ví dụ biên lai:

```text
영수증
2009/08/02/09:30
우유 × 2      1,800원
과자 × 1      1,200원
합계          3,000원
```

Trong các phát biểu, option sai mới là đáp án đúng của câu hỏi.

Đặc điểm:

- Một mã đề lấy đúng `2` câu.
- Stimulus phải lưu bằng `structuredData`, không chỉ bằng ảnh.
- Có thể render asset từ structured data khi build.

### 2.3. Dạng 3: `passage_correct_statement`

Mẫu:

```text
[8~9] Hãy chọn đáp án đúng với nội dung bài đọc.

제인 씨는 지금 한국에 삽니다.
작년까지 영국의 대학교에서 한국어를 공부했습니다.
제인 씨는 한국 사람들하고 한국어로 이야기합니다.

① 제인 씨는 지금 영국에 있습니다.
② 제인 씨는 한국어를 할 수 있습니다.
③ 제인 씨는 작년까지 한국에 살았습니다.
④ 제인 씨는 한국에서 대학교에 다녔습니다.
```

Đặc điểm:

- Đọc đoạn 2–3 câu ngắn.
- Chọn một phát biểu đúng với nội dung.
- Ba đáp án nhiễu sai rõ ràng ở người, thời gian, địa điểm, hoạt động, phủ định hoặc kế hoạch.
- Một mã đề lấy đúng `2` câu.

---

## 3. Scope kiến thức Part 2

### 3.1. File scope

Tạo file:

```text
src/data/korean/source/part2-reading-scope.json
```

File này cần chứa:

```ts
export interface Part2ReadingScope {
  version: string;
  sourceLessons: number[]; // [1,2,3,4,5,6,7,8]
  topicLabels: Array<{
    key: string;
    koreanLabel: string;
    vietnameseMeaning: string;
    allowedVocabulary: string[];
  }>;
  allowedGrammarKeys: string[];
  allowedVocabulary: string[];
  stimulusTypes: Array<{
    key: Part2StimulusType;
    allowedFields: string[];
    allowedVocabulary: string[];
  }>;
  passageFocuses: string[];
}
```

### 3.2. Quy tắc scope

- Import/tham chiếu từ vựng và ngữ pháp có trong Bài 1–8.
- Bổ sung có kiểm soát các nhãn chủ đề, từ/cụm từ hoặc reading pattern cần cho đề đọc hiểu.
- Không cho generator tự thêm từ ngoài scope.
- Nếu pool không thể tạo đủ 3 câu tự nhiên bằng scope đã duyệt, báo lỗi/report để người dùng bổ sung scope.

---

## 4. Catalog pool đầy đủ

### 4.1. Tổng số lượng

| Section | Câu/mã đề | Số pool | Câu/pool | Tổng câu gốc |
|---|---:|---:|---:|---:|
| `topic_identification` | 5 | 14 | 3 | 42 |
| `visual_incorrect_statement` | 2 | 5 | 3 | 15 |
| `passage_correct_statement` | 2 | 6 | 3 | 18 |
| **Tổng** | **9** | **25** |  | **75** |

Full implementation phải tạo:

```text
25 pool × 3 câu = 75 câu hỏi gốc
```

---

## 5. Pool Dạng 1 — Chọn chủ đề đúng

### 5.1. Catalog topic pool

Dạng 1 không được giới hạn ở các chủ đề trong một đề mẫu. Tạo catalog rộng theo Bài 1–8:

| pool_id | targetTopic | Label tiếng Hàn | Nội dung reading |
|---|---|---|---|
| `P2_T1_TOPIC_NATIONALITY` | `NATIONALITY` | `국적` | Quốc tịch/quốc gia |
| `P2_T1_TOPIC_JOB` | `JOB` | `직업` | Nghề nghiệp |
| `P2_T1_TOPIC_SCHOOL` | `SCHOOL` | `학교` | Trường học, cơ sở trường |
| `P2_T1_TOPIC_OBJECT` | `OBJECT` | `물건` | Đồ vật học tập/sinh hoạt |
| `P2_T1_TOPIC_PLACE` | `PLACE` | `장소` | Địa điểm công cộng |
| `P2_T1_TOPIC_DAILY_LIFE` | `DAILY_LIFE` | `일상생활` | Sinh hoạt thường ngày |
| `P2_T1_TOPIC_HOBBY` | `HOBBY` | `취미` | Sở thích, thể thao, giải trí |
| `P2_T1_TOPIC_DATE_DAY` | `DATE_DAY` | `날짜와 요일` | Ngày/tháng/thứ |
| `P2_T1_TOPIC_DAILY_SCHEDULE` | `DAILY_SCHEDULE` | `하루 일과` | Lịch trình trong ngày |
| `P2_T1_TOPIC_WEEKEND` | `WEEKEND` | `주말` | Hoạt động cuối tuần |
| `P2_T1_TOPIC_SHOPPING` | `SHOPPING` | `물건 사기` | Mua đồ, giá, số lượng |
| `P2_T1_TOPIC_FOOD` | `FOOD` | `음식` | Món ăn/gọi món |
| `P2_T1_TOPIC_TASTE` | `TASTE` | `맛` | Ngon, cay, ngọt, đắng... |
| `P2_T1_TOPIC_TIME` | `TIME` | `시간` | Giờ giấc/thời điểm |

```text
14 pool × 3 câu = 42 câu gốc
```

> Mỗi `koreanLabel` phải được duyệt trong `part2-reading-scope.json` trước khi dùng làm option. Nếu nhãn nào không phù hợp với scope chính thức, gộp hoặc thay nhãn trước khi sinh dữ liệu.

### 5.2. Tránh chủ đề nhập nhằng

| Cặp dễ nhầm | Quy tắc viết reading |
|---|---|
| `음식` / `맛` | `음식`: nhấn tên món/ăn gì; `맛`: nhấn đặc điểm vị giác |
| `일상생활` / `하루 일과` | `하루 일과`: có giờ hoặc trình tự hoạt động; `일상생활`: hành động chung |
| `학교` / `장소` | `학교`: nhấn học tập/cơ sở trường; `장소`: nơi công cộng nói chung |
| `주말` / `취미` | `주말`: nhấn thời gian/kế hoạch cuối tuần; `취미`: nhấn thích hoạt động |

### 5.3. Quy tắc Dạng 1

- Mỗi question có reading text 1–2 câu.
- Correct option là topic label rõ ràng nhất.
- Distractors là topic label khác trong scope.
- Mỗi câu chỉ được hợp lý với một topic.
- Trong cùng một mã đề, 5 câu Dạng 1 phải có 5 `targetTopic` khác nhau.

---

## 6. Pool Dạng 2 — Chọn phát biểu không đúng

### 6.1. Catalog stimulus pool

| pool_id | stimulusType | Nội dung kiểm tra | quantity |
|---|---|---|---:|
| `P2_T2_RECEIPT` | `receipt` | Ngày mua, món đồ, số lượng, giá, tổng tiền | 3 |
| `P2_T2_CARD` | `card` | Người gửi/nhận, dịp, quà tặng, lời nhắn | 3 |
| `P2_T2_MENU` | `menu` | Tên món, giá, số lượng/gọi món | 3 |
| `P2_T2_SCHEDULE` | `schedule` | Thứ, ngày, giờ, hoạt động, địa điểm | 3 |
| `P2_T2_NOTICE` | `notice` | Sự kiện, thời gian, nơi diễn ra | 3 |

```text
5 pool × 3 câu = 15 câu gốc
```

### 6.2. Structured stimulus bắt buộc

```ts
export type Part2StimulusType =
  | "receipt"
  | "card"
  | "menu"
  | "schedule"
  | "notice";

export interface Part2Stimulus {
  id: string;
  type: Part2StimulusType;
  title?: string;
  structuredData: Record<string, unknown>;
  fallbackText: string;
  renderedAssetPath?: string;
}
```

Ví dụ biên lai:

```json
{
  "id": "P2_T2_RECEIPT_Q001_STIMULUS",
  "type": "receipt",
  "title": "영수증",
  "structuredData": {
    "date": "2009/08/02",
    "time": "09:30",
    "items": [
      { "name": "우유", "quantity": 2, "unit": "개", "lineTotal": 1800 },
      { "name": "과자", "quantity": 1, "unit": "개", "lineTotal": 1200 }
    ],
    "grandTotal": 3000,
    "currency": "원"
  },
  "fallbackText": "영수증\n2009/08/02/09:30\n우유 × 2 1,800원\n과자 × 1 1,200원\n합계 3,000원"
}
```

### 6.3. Quy tắc Dạng 2

- Có đúng 4 phát biểu.
- Có đúng 1 phát biểu sai; `correctOptionId` trỏ đến phát biểu sai.
- Ba phát biểu còn lại phải kiểm chứng là đúng từ `structuredData`.
- Mỗi mã đề lấy 2 câu từ 2 `stimulusType` khác nhau khi đủ dữ liệu.
- Nếu đề hiển thị hình, render asset từ `structuredData`; không nhập dữ liệu ngược từ ảnh.

---

## 7. Pool Dạng 3 — Chọn phát biểu đúng

### 7.1. Catalog passage pool

| pool_id | readingFocus | Nội dung đoạn đọc | quantity |
|---|---|---|---:|
| `P2_T3_PROFILE_LANGUAGE` | `profile_language` | Cá nhân, nơi sống, ngôn ngữ/giao tiếp | 3 |
| `P2_T3_CLASS_ACTIVITY` | `class_activity` | Lớp học, hoạt động, cảm nhận | 3 |
| `P2_T3_GIFT_PLAN` | `gift_plan` | Sinh nhật, chuẩn bị quà, kế hoạch tặng | 3 |
| `P2_T3_DAILY_SCHEDULE` | `daily_schedule` | Lịch trình hằng ngày | 3 |
| `P2_T3_WEEKEND_ACTIVITY` | `weekend_activity` | Hoạt động cuối tuần/quá khứ | 3 |
| `P2_T3_SHOPPING_FOOD` | `shopping_food` | Mua hàng/đồ ăn/số lượng | 3 |

```text
6 pool × 3 câu = 18 câu gốc
```

### 7.2. Quy tắc Dạng 3

- Reading text 2–3 câu ngắn.
- Có đúng 1 phát biểu đúng.
- Distractors sai rõ ràng ở một chi tiết: người, thời gian, nơi chốn, hành động, phủ định/khẳng định hoặc kế hoạch.
- Không tạo câu yêu cầu suy luận vượt quá thông tin đoạn.
- Trong một mã đề, hai câu Dạng 3 phải có `readingFocus` khác nhau.

---

## 8. Schema dữ liệu câu hỏi

### 8.1. Option và base question

```ts
export interface QuestionOption {
  id: string;
  text: string;
}

export type Part2Section =
  | "topic_identification"
  | "visual_incorrect_statement"
  | "passage_correct_statement";

export type Part2QuestionType =
  | "choose_topic"
  | "choose_incorrect_statement"
  | "choose_correct_statement";

export interface BasePart2Question {
  id: string;
  part: 2;
  section: Part2Section;
  poolId: string;
  questionType: Part2QuestionType;
  difficulty: "easy" | "medium";
  options: QuestionOption[]; // Luôn đúng 4 option
  correctOptionId: string;   // ID ổn định, không phải vị trí
  correctValue: string;
  grammarUsed: string[];
  vocabularyUsed: string[];
  explanationVi: string;
  validation: {
    grammarInScope: boolean;
    vocabularyInScope: boolean;
    singleCorrectAnswer: boolean;
    reviewed: boolean;
    topicUnambiguous?: boolean;
    stimulusConsistent?: boolean;
    passageConsistent?: boolean;
    note?: string;
  };
}
```

### 8.2. Dạng 1

```ts
export interface Part2TopicReadingQuestion extends BasePart2Question {
  section: "topic_identification";
  questionType: "choose_topic";
  targetTopic: string;
  readingText: string;
}
```

### 8.3. Dạng 2

```ts
export interface Part2VisualReadingQuestion extends BasePart2Question {
  section: "visual_incorrect_statement";
  questionType: "choose_incorrect_statement";
  stimulusType: Part2StimulusType;
  stimulusId: string;
  prompt: string;
}
```

### 8.4. Dạng 3

```ts
export interface Part2PassageReadingQuestion extends BasePart2Question {
  section: "passage_correct_statement";
  questionType: "choose_correct_statement";
  readingFocus: string;
  readingText: string;
}
```

### 8.5. Union và pool

```ts
export type Part2Question =
  | Part2TopicReadingQuestion
  | Part2VisualReadingQuestion
  | Part2PassageReadingQuestion;

export interface Part2QuestionPool {
  id: string;
  part: 2;
  section: Part2Section;
  knowledgeTarget: string;
  quantity: 3;
  questions: Part2Question[];
}
```

### 8.6. Quy tắc đáp án

Tuyệt đối không lưu:

```ts
correctIndex
correctAnswerPosition
correctAnswer: "②"
```

Phải lưu:

```ts
correctOptionId
correctValue
```

Khi shuffle option, `correctOptionId` giữ nguyên.

---

## 9. Ví dụ question data

### 9.1. Dạng 1

```json
{
  "id": "P2_T1_TOPIC_HOBBY_Q001",
  "part": 2,
  "section": "topic_identification",
  "poolId": "P2_T1_TOPIC_HOBBY",
  "questionType": "choose_topic",
  "difficulty": "easy",
  "targetTopic": "HOBBY",
  "readingText": "저는 영화를 좋아해요. 주말에 친구하고 영화를 봐요.",
  "options": [
    { "id": "P2_T1_TOPIC_HOBBY_Q001_OPT_HOBBY", "text": "취미" },
    { "id": "P2_T1_TOPIC_HOBBY_Q001_OPT_JOB", "text": "직업" },
    { "id": "P2_T1_TOPIC_HOBBY_Q001_OPT_TIME", "text": "시간" },
    { "id": "P2_T1_TOPIC_HOBBY_Q001_OPT_PLACE", "text": "장소" }
  ],
  "correctOptionId": "P2_T1_TOPIC_HOBBY_Q001_OPT_HOBBY",
  "correctValue": "취미",
  "grammarUsed": ["INFORMAL_POLITE_PRESENT", "OBJECT_PARTICLE", "NOUN_CONNECTOR"],
  "vocabularyUsed": ["영화", "좋아하다", "주말", "친구", "보다"],
  "explanationVi": "Đoạn nói về việc thích xem phim, nên chủ đề đúng là sở thích.",
  "validation": {
    "grammarInScope": true,
    "vocabularyInScope": true,
    "singleCorrectAnswer": true,
    "topicUnambiguous": true,
    "reviewed": false
  }
}
```

### 9.2. Dạng 2

```json
{
  "id": "P2_T2_RECEIPT_Q001",
  "part": 2,
  "section": "visual_incorrect_statement",
  "poolId": "P2_T2_RECEIPT",
  "questionType": "choose_incorrect_statement",
  "difficulty": "medium",
  "stimulusType": "receipt",
  "stimulusId": "P2_T2_RECEIPT_Q001_STIMULUS",
  "prompt": "다음 내용과 다른 것을 고르세요.",
  "options": [
    { "id": "P2_T2_RECEIPT_Q001_OPT_TOTAL", "text": "모두 3,000원입니다." },
    { "id": "P2_T2_RECEIPT_Q001_OPT_DATE", "text": "8월 2일에 샀습니다." },
    { "id": "P2_T2_RECEIPT_Q001_OPT_SNACK", "text": "과자를 한 개 샀습니다." },
    { "id": "P2_T2_RECEIPT_Q001_OPT_MILK", "text": "우유 한 개는 1,800원입니다." }
  ],
  "correctOptionId": "P2_T2_RECEIPT_Q001_OPT_MILK",
  "correctValue": "우유 한 개는 1,800원입니다.",
  "grammarUsed": ["FORMAL_PRESENT", "PAST_TENSE", "TIME_PARTICLE", "COUNTER_NUMBER"],
  "vocabularyUsed": ["영수증", "우유", "과자", "사다", "원", "모두", "월", "일", "개"],
  "explanationVi": "Biên lai ghi hai phần sữa có tổng giá 1.800 won, không phải một phần sữa giá 1.800 won.",
  "validation": {
    "grammarInScope": true,
    "vocabularyInScope": true,
    "singleCorrectAnswer": true,
    "stimulusConsistent": true,
    "reviewed": false
  }
}
```

### 9.3. Dạng 3

```json
{
  "id": "P2_T3_CLASS_ACTIVITY_Q001",
  "part": 2,
  "section": "passage_correct_statement",
  "poolId": "P2_T3_CLASS_ACTIVITY",
  "questionType": "choose_correct_statement",
  "difficulty": "medium",
  "readingFocus": "class_activity",
  "readingText": "저는 화요일 저녁에 K-POP 수업에 갑니다. 거기에서 한국 노래를 부르고 춤을 배웁니다. 잘 못하지만 재미있습니다.",
  "options": [
    { "id": "P2_T3_CLASS_ACTIVITY_Q001_OPT_FUN", "text": "저는 수업이 재미있습니다." },
    { "id": "P2_T3_CLASS_ACTIVITY_Q001_OPT_DANCE", "text": "저는 한국 춤을 잘 춥니다." },
    { "id": "P2_T3_CLASS_ACTIVITY_Q001_OPT_MORNING", "text": "저는 오전에 수업에 갑니다." },
    { "id": "P2_T3_CLASS_ACTIVITY_Q001_OPT_TEACH", "text": "저는 한국 노래를 가르칩니다." }
  ],
  "correctOptionId": "P2_T3_CLASS_ACTIVITY_Q001_OPT_FUN",
  "correctValue": "저는 수업이 재미있습니다.",
  "grammarUsed": ["INFORMAL_POLITE_PRESENT", "TIME_PARTICLE", "CONTRAST_CONNECTIVE"],
  "vocabularyUsed": ["화요일", "저녁", "수업", "가다", "한국", "노래", "춤", "배우다", "재미있다"],
  "explanationVi": "Đoạn nói người viết không giỏi nhưng thấy lớp học thú vị.",
  "validation": {
    "grammarInScope": true,
    "vocabularyInScope": true,
    "singleCorrectAnswer": true,
    "passageConsistent": true,
    "reviewed": false
  }
}
```

---

## 10. Sinh mã đề tĩnh

### 10.1. Config

```ts
export interface StaticPart2ExamGenerationConfig {
  part: 2;
  examSetCount: number;
  questionCount: 9;
  sectionQuota: {
    topic_identification: 5;
    visual_incorrect_statement: 2;
    passage_correct_statement: 2;
  };
  maxSharedQuestionRatio: number;
  randomSeed?: string;
}

export const PART2_STATIC_EXAM_CONFIG: StaticPart2ExamGenerationConfig = {
  part: 2,
  examSetCount: 10,
  questionCount: 9,
  sectionQuota: {
    topic_identification: 5,
    visual_incorrect_statement: 2,
    passage_correct_statement: 2
  },
  maxSharedQuestionRatio: 1 / 3,
  randomSeed: "part2-v1"
};
```

### 10.2. Thứ tự section trong đề

Không trộn ba dạng khi render đề:

| Vị trí câu | Section |
|---:|---|
| 1–5 | `topic_identification` |
| 6–7 | `visual_incorrect_statement` |
| 8–9 | `passage_correct_statement` |

Chỉ shuffle câu bên trong từng section.

### 10.3. Quy tắc lựa chọn

#### Dạng 1

- Chọn đúng 5 pool.
- `targetTopic` của 5 pool phải khác nhau.
- Mỗi pool tối đa 1 câu/đề.
- Ưu tiên câu có `selectedCount` thấp hơn.

#### Dạng 2

- Chọn đúng 2 pool.
- `stimulusType` khác nhau khi còn đủ lựa chọn.
- Mỗi pool tối đa 1 câu/đề.
- Stimulus phải validate được và render/fallback được.

#### Dạng 3

- Chọn đúng 2 pool.
- `readingFocus` khác nhau.
- Mỗi pool tối đa 1 câu/đề.

#### Toàn đề

- Đúng 9 câu.
- Chỉ chọn câu validation hợp lệ.
- Shuffle options tại bước generate; lưu `shuffledOptionIds`.
- Giới hạn overlap giữa các mã đề theo config.
- Nếu không đủ dữ liệu để đạt constraint, throw/report lỗi rõ ràng.

---

## 11. Balanced selection và static exam schema

### 11.1. Bộ đếm tạm khi generate

```ts
export interface Part2QuestionSelectionCount {
  questionId: string;
  selectedCount: number;
  selectedInExamIds: string[];
}
```

Chọn câu ít được dùng nhất trong pool; nếu bằng nhau thì random bằng seed.

```ts
function selectBalancedPart2Question<T extends Part2Question>(
  candidates: T[],
  counts: Map<string, Part2QuestionSelectionCount>,
  random: () => number,
): T {
  const valid = candidates.filter(isValidPart2Question);
  if (!valid.length) throw new Error("Pool Part 2 không có câu hợp lệ.");

  const minCount = Math.min(
    ...valid.map(q => counts.get(q.id)?.selectedCount ?? 0)
  );

  return sampleOne(
    valid.filter(q => (counts.get(q.id)?.selectedCount ?? 0) === minCount),
    random
  );
}
```

### 11.2. Mã đề tĩnh

```ts
export interface StaticPart2Exam {
  id: string;
  part: 2;
  questionCount: 9;
  generatedAt: string;
  generationSeed?: string;
  questions: StaticPart2ExamQuestion[];
}

export interface StaticPart2ExamQuestion {
  questionId: string;
  poolId: string;
  section: Part2Section;
  displayOrder: number;
  shuffledOptionIds: string[];
  stimulusAssetPath?: string;
}
```

### 11.3. Chấm đáp án

```ts
function isCorrect(question: Part2Question, selectedOptionId: string): boolean {
  return selectedOptionId === question.correctOptionId;
}
```

Không chấm bằng vị trí hiển thị sau shuffle.

---

## 12. Generation report

```ts
export interface StaticPart2GenerationReport {
  examSetCount: number;
  totalSelectedQuestionSlots: number;
  uniqueQuestionsUsed: number;
  unusedQuestionIds: string[];
  questionSelectionCounts: Array<{
    questionId: string;
    poolId: string;
    section: Part2Section;
    selectedCount: number;
    selectedInExamIds: string[];
  }>;
  examOverlapChecks: Array<{
    examIdA: string;
    examIdB: string;
    sharedQuestionCount: number;
    sharedQuestionRatio: number;
    passed: boolean;
  }>;
  sectionCoverageChecks: Array<{
    examId: string;
    topicIdentificationCount: number;
    visualIncorrectStatementCount: number;
    passageCorrectStatementCount: number;
    distinctTargetTopicPassed: boolean;
    distinctStimulusTypePassed: boolean;
    distinctReadingFocusPassed: boolean;
  }>;
}
```

Report phải thể hiện:

- Số mã đề đã tạo.
- Mỗi đề có đúng `5 + 2 + 2` hay không.
- Tần suất dùng của từng câu.
- Câu chưa được dùng.
- Overlap giữa các mã đề.
- Vi phạm lặp `targetTopic`, `stimulusType`, `readingFocus`.

---

## 13. Validation và tests

### 13.1. Validation data

Kiểm tra:

```text
- Có đúng 25 pool và 75 câu gốc khi triển khai full.
- Mỗi pool có đúng 3 câu.
- Không trùng poolId/questionId.
- Mỗi câu có đúng 4 options.
- Không trùng option.id hoặc option.text trong cùng câu.
- correctOptionId tồn tại và correctValue khớp text đúng.
- grammarUsed/vocabularyUsed nằm trong part2-reading-scope.json.
- Dạng 1 có targetTopic hợp lệ và không nhập nhằng.
- Dạng 2 có stimulus structuredData hợp lệ và đúng một statement sai.
- Dạng 3 có đúng một statement đúng.
```

### 13.2. Tests generator

Kiểm tra:

```text
- Sinh đúng số mã đề theo config.
- Mỗi mã đề đúng 9 câu.
- Mỗi mã đề đúng 5 câu Dạng 1, 2 câu Dạng 2, 2 câu Dạng 3.
- Dạng 1 không lặp targetTopic trong cùng đề.
- Dạng 2 không lặp stimulusType nếu đủ dữ liệu.
- Dạng 3 không lặp readingFocus.
- Không lấy câu invalid.
- Shuffle options không ảnh hưởng correctOptionId.
- Balanced selection ưu tiên câu selectedCount thấp hơn.
- Overlap không vượt cấu hình nếu dữ liệu đủ.
- Seed cố định sinh output tái lập.
- Report thống kê chính xác.
```

---

## 14. File/module đầu ra mong muốn

```text
src/
  data/
    korean/
      source/
        nguphapsc_1-8.json
        tuvungsocap_1-8.json
        part2-reading-scope.json
      pools/
        part2-pool-catalog.ts
        part2-questions.ts
        part2-stimuli.ts
      generated/
        part2/
          stimuli/
          part2-static-exams.json
          part2-static-answer-keys.json
          part2-static-exams-report.json
  features/
    quiz/
      part2/
        types.ts
        part2-knowledge-scope.ts
        validate-part2-pools.ts
        render-part2-stimuli.ts
        generate-static-part2-exams.ts
        generate-static-part2-exams.test.ts
```

---

## 15. Checklist Codex

### Phase 1 — Khảo sát

- [ ] Đọc repository và convention hiện có.
- [ ] Tìm utility có thể reuse từ Part 1/Part 3.
- [ ] Xác định nơi đặt scope, pool, generated data, tests.

### Phase 2 — Scope và types

- [ ] Tạo `part2-reading-scope.json`.
- [ ] Dùng nguồn Bài 1–8 và bổ sung reading label có kiểm soát.
- [ ] Tạo schema/type cho 3 section.
- [ ] Đảm bảo đáp án dùng `correctOptionId`.

### Phase 3 — Data

- [ ] Tạo 14 pool Dạng 1 = 42 câu.
- [ ] Tạo 5 pool Dạng 2 = 15 câu và structured stimuli.
- [ ] Tạo 6 pool Dạng 3 = 18 câu.
- [ ] Tổng đúng 25 pool/75 câu.
- [ ] Gắn metadata/validation, mặc định `reviewed: false`.

### Phase 4 — Validation

- [ ] Validate scope.
- [ ] Validate topic ambiguity.
- [ ] Validate structured stimuli/statements Dạng 2.
- [ ] Validate passage/đáp án đúng duy nhất Dạng 3.

### Phase 5 — Generate static exams

- [ ] Generate đề theo quota 5 + 2 + 2.
- [ ] Giữ thứ tự section.
- [ ] Shuffle options và lưu option IDs.
- [ ] Cân bằng `selectedCount`.
- [ ] Kiểm tra overlap.
- [ ] Xuất đề, đáp án và report.

### Phase 6 — Test

- [ ] Test validator.
- [ ] Test quota.
- [ ] Test option shuffle/chấm điểm.
- [ ] Test balanced selection và overlap.
- [ ] Test deterministic seed.
- [ ] Chạy lint/typecheck/test hiện có.

---

## 16. Không được làm

```text
- Không giới hạn Dạng 1 ở 5 chủ đề của đề mẫu.
- Không hiểu quota câu trong đề là số pool.
- Không hardcode đáp án theo ①/②/③/④ hoặc index.
- Không chấm theo vị trí sau shuffle.
- Không lưu stimulus Dạng 2 chỉ bằng ảnh, thiếu structuredData.
- Không tạo câu Dạng 1 có hai chủ đề cùng hợp lý.
- Không tạo Dạng 2 có hơn một phát biểu sai hoặc không xác minh được.
- Không tạo Dạng 3 có hơn một phát biểu đúng.
- Không dùng grammar/từ vựng ngoài scope.
- Không sinh đề runtime hoặc tracking theo học viên.
- Không âm thầm bỏ qua lỗi validation/overlap/thiếu dữ liệu.
```

---

## 17. Tiêu chí hoàn thành

Task hoàn thành khi:

1. Có `part2-reading-scope.json`.
2. Có schema cho cả 3 dạng đọc hiểu.
3. Có đầy đủ **25 pool / 75 câu gốc**.
4. Có structured stimuli cho Dạng 2.
5. Có validator phạm vi và tính duy nhất của đáp án.
6. Có generator mã đề tĩnh đúng **9 câu = 5 + 2 + 2**.
7. Có shuffle option an toàn bằng `correctOptionId`.
8. Có cân bằng `selectedCount` và overlap validation.
9. Có static answer keys và generation report.
10. Không có tracking học viên hoặc sinh đề runtime.
11. Code chạy qua lint/typecheck/test hiện có của repository.
