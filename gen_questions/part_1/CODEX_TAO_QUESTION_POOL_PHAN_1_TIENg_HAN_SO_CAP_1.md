# CODEX TASK: Tạo Question Pool cho Phần 1 — Từ vựng & Ngữ pháp Tiếng Hàn Sơ cấp 1

## 0. Mục tiêu thực hiện

Triển khai **ngân hàng câu hỏi (question pool)** cho:

```text
PHẦN 1: TỪ VỰNG – NGỮ PHÁP
Phạm vi: Tiếng Hàn Sơ cấp 1 — Bài 01 đến Bài 08
Số câu trong một đề được sinh ra: 10 câu
```

Đây là hệ thống tạo **question pool** và sinh trước các **mã đề tĩnh**.

- Question pool là nguồn dữ liệu câu hỏi gốc.
- Mỗi pool chứa đúng 3 câu biến thể.
- Từ các pool, chạy script generate để tạo trước nhiều mã đề tĩnh.
- Mỗi mã đề Phần 1 gồm đúng 10 câu.
- Sau khi đã generate, đề được lưu cố định và không thay đổi theo từng học viên.
- Không cần sinh đề runtime, không cần lưu lịch sử câu hỏi theo học viên và không cần cá nhân hóa lựa chọn câu hỏi.

### Mô hình dữ liệu cần đạt

```text
Phần 1
 └── Bài học
      └── Kiểu câu / Pool kiến thức
           └── 3 câu biến thể
```

- Mỗi `pool` kiểm tra **một trọng tâm kiến thức cụ thể**.
- Mỗi `pool` chứa đúng **3 câu hỏi**.
- Các mã đề được sinh trước ở bước build/seed bằng cách chọn câu từ nhiều pool.
- Trong một mã đề, mỗi pool chỉ được đóng góp tối đa 1 câu.
- Khi sinh nhiều mã đề, cần cân bằng số lần mỗi câu được sử dụng để tránh một câu xuất hiện quá nhiều so với các câu còn lại.
- Sau khi generate, các mã đề được lưu thành dữ liệu tĩnh để ứng dụng sử dụng trực tiếp.

---

## 1. Yêu cầu trước khi code

1. Đọc cấu trúc repository hiện tại trước khi tạo file hoặc sửa code.
2. Tận dụng convention, framework, schema, thư mục data/seed/test hiện có của dự án.
3. Không thay đổi các chức năng không liên quan.
4. Nếu dự án đã có model/entity/schema cho `question`, `quiz`, `answer` hoặc `lesson`, hãy tích hợp theo cấu trúc sẵn có thay vì tạo hệ thống song song.
5. Nếu repository chưa có cấu trúc phù hợp, tạo module/data rõ ràng cho `part1QuestionPools`.
6. Hai file nguồn kiến thức phải được coi là **source of truth**:

```text
nguphapsc_1-8.json
tuvungsocap_1-8.json
```

Nếu file chưa nằm trong repository, yêu cầu người dùng đặt chúng vào thư mục dữ liệu phù hợp trước khi chạy seed/generator, hoặc tạo cấu hình trỏ đến đường dẫn hiện có.

---

## 2. Quy tắc kiến thức bắt buộc

### 2.1. Nguồn dữ liệu duy nhất

Câu hỏi, đáp án đúng và đáp án nhiễu phải chỉ sử dụng:

- Ngữ pháp nằm trong `nguphapsc_1-8.json`.
- Từ gốc/cụm từ/mẫu câu nằm trong `tuvungsocap_1-8.json`.
- Dạng chia hợp lệ của động từ/tính từ theo ngữ pháp đã học.

Ví dụ được phép:

```text
먹다 + -고 싶다      -> 먹고 싶어요
맵다 + -아/어요      -> 매워요
보다 + -았/었-       -> 봤어요
공부하다 + -겠-      -> 공부하겠습니다
```

Ví dụ không được phép:

```text
Dùng 그래서 nếu file nguồn không có.
Dùng -(으)러 가다 nếu file nguồn không có.
Dùng từ mới chỉ vì từ đó phổ biến ở trình độ sơ cấp.
```

### 2.2. Phạm vi tích lũy theo bài

Pool được gắn với `target_lesson` là bài chứa kiến thức trọng tâm cần kiểm tra.

Để câu tự nhiên, câu của bài sau được phép sử dụng kiến thức đã học ở bài trước:

```text
Pool Bài 05:
- target_grammar có thể là 안.
- incidental grammar được phép dùng: 입니다, 을/를, 에서, 에 <thời gian>, -아/어요... vì đã học trước hoặc trong Bài 05.

Pool Bài 08:
- target_grammar có thể là -지 않다.
- Có thể dùng từ/cấu trúc của Bài 01–08 để dựng ngữ cảnh.
```

Quy tắc validation:

```text
target_lesson = N
allowed_grammar = grammar của Bài 01..N
allowed_vocabulary = vocabulary của Bài 01..N
```

Ưu tiên dùng từ vựng của chính `target_lesson` để câu thể hiện đúng chủ đề bài học, nhưng không bắt buộc nếu câu cần kiến thức cũ để tự nhiên.

### 2.3. Ngoại lệ dữ liệu Bài 06

Trong file ngữ pháp, Bài 06 có mục chưa thống nhất: danh sách có thể ghi `-(으)시-`, nhưng nội dung giải thích và ví dụ là cấu trúc rủ rê:

```text
(으)ㅂ시다
같이 한국어를 공부합시다.
```

Khi tạo pool Bài 06, chuẩn hóa kiến thức này thành:

```text
-(으)ㅂ시다 // Chúng ta hãy..., cùng ... nhé
```

Không tạo pool kiểm tra `-(으)시-` trong phạm vi hiện tại.

---

## 3. Kiến thức ngữ pháp theo bài

Dùng danh sách này làm catalog định hướng. Khi code, vẫn phải đối chiếu lại file JSON nguồn.

| Bài | Chủ đề | Ngữ pháp trọng tâm |
|---:|---|---|
| 01 | 소개 | `입니다`, `입니까`, `은/는` |
| 02 | 학교 | `여기/거기/저기`, `이것/그것/저것`, `이/가`, `에 있습니다/없습니다`, `이/가 아닙니다` |
| 03 | 일상생활 | `-ㅂ/습니다`, `-ㅂ/습니까`, `을/를`, `에서` chỉ địa điểm diễn ra hành động |
| 04 | 날짜와 요일 | Số từ Hán Hàn, `와/과`, `에` chỉ thời gian |
| 05 | 하루 일과 | Số từ thuần Hàn, định từ số `한/두/세/네/스무`, `-아/어요`, `에 가다`, `안` |
| 06 | 주말 | `-았/었-`, `하고`, `-(으)ㅂ시다` |
| 07 | 물건 사기 | Giản lược `ㅡ`, `은/는` đối chiếu, `-고 싶다` |
| 08 | 음식 | `-겠-` biểu thị ý định, `-지 않다`, `-(으)세요` |

### Các kiến thức tuyệt đối không tự thêm

```text
부터 ~ 까지
에게 / 한테 / 께서
(으)로 chỉ phương tiện
-(으)러 가다
그래서 / 그렇지만 / 그러면
연세 / 성함
Bất kỳ từ vựng hoặc cấu trúc ngoài hai file nguồn
```

---

## 4. Catalog pool cần triển khai

Mỗi pool dưới đây chứa đúng `3` câu hỏi. Tổng cộng:

```text
38 pool × 3 câu = 114 câu hỏi
```

### Bài 01 — 소개

| pool_id | skill | knowledge_target | quantity |
|---|---|---|---:|
| `P1_L01_01` | `grammar` | Chọn `입니다 / 입니까` trong câu giới thiệu hoặc hỏi thông tin | 3 |
| `P1_L01_02` | `grammar` | Điền tiểu từ chủ đề `은/는` | 3 |
| `P1_L01_03` | `vocabulary` | Chọn từ vựng về quốc tịch, nghề nghiệp hoặc ngành học | 3 |

### Bài 02 — 학교

| pool_id | skill | knowledge_target | quantity |
|---|---|---|---:|
| `P1_L02_01` | `grammar` | Chọn `이것 / 그것 / 저것` | 3 |
| `P1_L02_02` | `grammar` | Chọn `여기 / 거기 / 저기` | 3 |
| `P1_L02_03` | `grammar` | Chọn `에 있습니다 / 없습니다` theo ngữ cảnh | 3 |
| `P1_L02_04` | `grammar` | Chọn cấu trúc phủ định danh từ `이/가 아닙니다` | 3 |
| `P1_L02_05` | `vocabulary` | Chọn từ vựng đồ vật hoặc cơ sở vật chất trường học | 3 |

### Bài 03 — 일상생활

| pool_id | skill | knowledge_target | quantity |
|---|---|---|---:|
| `P1_L03_01` | `grammar` | Chọn đuôi trần thuật/nghi vấn `-ㅂ/습니다 / -ㅂ/습니까` | 3 |
| `P1_L03_02` | `grammar` | Điền tiểu từ tân ngữ `을/를` | 3 |
| `P1_L03_03` | `grammar` | Điền `에서` chỉ địa điểm diễn ra hành động | 3 |
| `P1_L03_04` | `vocabulary` | Chọn động từ sinh hoạt phù hợp ngữ cảnh | 3 |
| `P1_L03_05` | `dialogue` | Chọn câu trả lời phù hợp trong hội thoại sinh hoạt hằng ngày | 3 |

### Bài 04 — 날짜와 요일

| pool_id | skill | knowledge_target | quantity |
|---|---|---|---:|
| `P1_L04_01` | `number_time` | Số Hán Hàn dùng cho ngày/tháng/năm/số điện thoại/tầng/phút | 3 |
| `P1_L04_02` | `grammar` | Điền `에` chỉ thời gian | 3 |
| `P1_L04_03` | `grammar` | Điền `와/과` nối hai danh từ | 3 |
| `P1_L04_04` | `dialogue` | Hội thoại về ngày, thứ hoặc kế hoạch | 3 |

### Bài 05 — 하루 일과

| pool_id | skill | knowledge_target | quantity |
|---|---|---|---:|
| `P1_L05_01` | `number_time` | Số thuần Hàn khi nói giờ | 3 |
| `P1_L05_02` | `number_counter` | Chọn định từ số `한 / 두 / 세 / 네 / 스무` | 3 |
| `P1_L05_03` | `grammar` | Chọn dạng chia lịch sự `-아/어요` | 3 |
| `P1_L05_04` | `grammar` | Điền `에` trong cấu trúc chỉ địa điểm đến `에 가다` | 3 |
| `P1_L05_05` | `grammar` | Chọn phủ định ngắn `안` | 3 |
| `P1_L05_06` | `dialogue` | Hội thoại về lịch trình hằng ngày | 3 |

### Bài 06 — 주말

| pool_id | skill | knowledge_target | quantity |
|---|---|---|---:|
| `P1_L06_01` | `grammar` | Chọn dạng quá khứ `-았/었-` | 3 |
| `P1_L06_02` | `grammar` | Điền `하고` với nghĩa “và/cùng với” | 3 |
| `P1_L06_03` | `grammar` | Chọn câu rủ rê `-(으)ㅂ시다` | 3 |
| `P1_L06_04` | `vocabulary_dialogue` | Từ vựng hoặc hội thoại về hoạt động cuối tuần | 3 |

### Bài 07 — 물건 사기

| pool_id | skill | knowledge_target | quantity |
|---|---|---|---:|
| `P1_L07_01` | `number_counter` | Chọn đơn vị đếm phù hợp: `개`, `권`, `대`, `마리`, `명`, `병`, `켤레`, `잔`, `장` | 3 |
| `P1_L07_02` | `number_counter` | Số thuần Hàn kết hợp đơn vị đếm trong ngữ cảnh mua hàng | 3 |
| `P1_L07_03` | `grammar` | Chọn cấu trúc mong muốn `-고 싶다` | 3 |
| `P1_L07_04` | `grammar` | Chọn `은/는` mang nghĩa đối chiếu trong so sánh đồ vật/giá cả | 3 |
| `P1_L07_05` | `dialogue` | Hội thoại mua hàng hoặc hỏi giá | 3 |

### Bài 08 — 음식

| pool_id | skill | knowledge_target | quantity |
|---|---|---|---:|
| `P1_L08_01` | `vocabulary` | Chọn tên món ăn phù hợp ngữ cảnh | 3 |
| `P1_L08_02` | `vocabulary` | Chọn tính từ vị giác phù hợp | 3 |
| `P1_L08_03` | `grammar_dialogue` | Chọn cấu trúc ý định `-겠-` trong ngữ cảnh gọi món/quyết định | 3 |
| `P1_L08_04` | `grammar` | Chọn phủ định dài `-지 않다` | 3 |
| `P1_L08_05` | `grammar_dialogue` | Chọn yêu cầu/khuyên nhủ lịch sự `-(으)세요` | 3 |
| `P1_L08_06` | `dialogue` | Hội thoại gọi món hoặc thanh toán trong nhà hàng | 3 |

---

## 5. Thiết kế schema dữ liệu

### 5.1. Nguyên tắc quan trọng về đáp án

**Tuyệt đối không lưu đáp án đúng theo vị trí hiển thị** như:

```json
{
  "correct_answer": "②"
}
```

hoặc:

```json
{
  "correct_index": 1
}
```

Lý do: lựa chọn phải được phép random thứ tự khi sinh đề. Sau khi đảo lựa chọn, số thứ tự/index không còn đúng.

### 5.2. Dùng ID cố định cho option

Mỗi option phải có `id` cố định và `text` hiển thị. Đáp án đúng được lưu bằng `correctOptionId`.

Schema tham khảo theo TypeScript:

```ts
export type Part1Skill =
  | "grammar"
  | "vocabulary"
  | "dialogue"
  | "number_time"
  | "number_counter"
  | "vocabulary_dialogue"
  | "grammar_dialogue";

export type QuestionType =
  | "fill_blank"
  | "dialogue_fill_blank"
  | "choose_response"
  | "choose_context_word";

export interface QuestionOption {
  id: string; // ID ổn định, không phụ thuộc vị trí hiển thị
  text: string; // Text tiếng Hàn hiển thị cho học viên
}

export interface Part1Question {
  id: string; // Ví dụ: P1_L07_01_Q001
  part: 1;
  targetLesson: number; // 1..8
  lessonTitle: string; // Ví dụ: 물건 사기
  poolId: string; // Ví dụ: P1_L07_01
  questionType: QuestionType;
  skill: Part1Skill;
  knowledgeTarget: string;
  difficulty: "easy" | "medium";
  stem: string; // Câu hỏi tiếng Hàn
  options: QuestionOption[]; // Luôn đúng 4 option
  correctOptionId: string; // Dùng để chấm sau khi shuffle
  correctValue: string; // Dùng để debug/duyệt dữ liệu
  grammarUsed: string[];
  vocabularyUsed: string[]; // Liệt kê dạng từ gốc/cụm nguồn; không cần liệt kê mọi hậu tố sau chia
  explanationVi: string;
  validation: {
    grammarInScope: boolean;
    vocabularyInScope: boolean;
    singleCorrectAnswer: boolean;
    reviewed: boolean;
    note?: string;
  };
}

export interface Part1QuestionPool {
  id: string; // poolId
  part: 1;
  targetLesson: number;
  lessonTitle: string;
  skill: Part1Skill;
  questionType: QuestionType;
  knowledgeTarget: string;
  targetGrammar: string[];
  allowedGrammarThroughLesson: number;
  allowedVocabularyThroughLesson: number;
  quantity: 3;
  questions: Part1Question[];
}
```

Nếu project không dùng TypeScript, ánh xạ cấu trúc này sang schema tương đương của stack hiện tại.

### 5.3. Ví dụ dữ liệu đúng

```json
{
  "id": "P1_L07_01_Q001",
  "part": 1,
  "targetLesson": 7,
  "lessonTitle": "물건 사기",
  "poolId": "P1_L07_01",
  "questionType": "fill_blank",
  "skill": "number_counter",
  "knowledgeTarget": "Chọn đơn vị đếm phù hợp cho danh từ mua sắm",
  "difficulty": "easy",
  "stem": "소설책 두 (      ) 주세요.",
  "options": [
    { "id": "P1_L07_01_Q001_OPT_GWON", "text": "권" },
    { "id": "P1_L07_01_Q001_OPT_BYEONG", "text": "병" },
    { "id": "P1_L07_01_Q001_OPT_JAN", "text": "잔" },
    { "id": "P1_L07_01_Q001_OPT_KYEOLLE", "text": "켤레" }
  ],
  "correctOptionId": "P1_L07_01_Q001_OPT_GWON",
  "correctValue": "권",
  "grammarUsed": ["Định từ số", "-(으)세요"],
  "vocabularyUsed": ["소설책", "권", "병", "잔", "켤레", "주다"],
  "explanationVi": "권 là đơn vị đếm dùng cho sách. 소설책 두 권 주세요 nghĩa là: Cho tôi hai quyển tiểu thuyết.",
  "validation": {
    "grammarInScope": true,
    "vocabularyInScope": true,
    "singleCorrectAnswer": true,
    "reviewed": false
  }
}
```

---

## 6. Quy tắc tạo nội dung câu hỏi

### 6.1. Quy tắc chung

Mỗi pool phải có đúng 3 câu thỏa mãn:

1. Cùng kiểm tra một `knowledgeTarget`.
2. Không phải ba câu giống hệt nhau chỉ thay một danh từ.
3. Mỗi câu có đúng 4 lựa chọn.
4. Chỉ có một lựa chọn đúng.
5. Stem và option hiển thị cho học viên viết bằng tiếng Hàn.
6. Giải thích viết bằng tiếng Việt.
7. Đáp án nhiễu phải hợp lý, cùng nhóm với đáp án đúng khi có thể.
8. Đáp án nhiễu cũng phải nằm trong phạm vi kiến thức được phép.
9. Trong 3 câu của một pool, không để đáp án đúng mặc định luôn nằm cùng một vị trí trong dữ liệu seed. Dù UI sẽ shuffle, dữ liệu gốc vẫn nên dễ duyệt.

### 6.2. Quy tắc đáp án nhiễu

| Kiểu kiểm tra | Đáp án nhiễu nên là |
|---|---|
| Tiểu từ | Các tiểu từ đã học và dễ nhầm |
| Đuôi câu | Các dạng đuôi đã học có hình thức gần nhau |
| Danh từ/từ vựng | Danh từ cùng chủ đề hoặc có thể xuất hiện cùng tình huống |
| Động từ | Động từ cùng ngữ cảnh sinh hoạt |
| Tính từ vị giác | Các tính từ chỉ vị/trạng thái phù hợp phạm vi |
| Đơn vị đếm | Các đơn vị đếm đã học |
| Hội thoại | Các câu phản hồi cùng loại, nhưng chỉ một câu khớp ngữ cảnh |

### 6.3. Quy tắc độ khó

Phần 1 là kiểm tra sơ cấp, do đó:

```text
easy:
- Một ngữ pháp/từ vựng trọng tâm rõ ràng.
- Ngữ cảnh ngắn.
- Đáp án đúng được xác định trực tiếp.

medium:
- Hội thoại 2 lượt.
- Cần hiểu ngữ cảnh trước khi chọn.
- Vẫn chỉ kiểm tra một kiến thức trọng tâm.
```

Không tạo câu đánh đố, câu có nhiều cách giải thích hoặc cần kiến thức ngoài bài.

---

## 7. Sinh các mã đề tĩnh, mỗi đề gồm 10 câu

### 7.1. Mục tiêu

Không tạo đề động khi học viên bắt đầu làm bài.

Thay vào đó, triển khai một script hoặc seed command để:

1. Đọc toàn bộ question pool hợp lệ.
2. Sinh trước đúng **20 mã đề tĩnh** cho Phần 1.
3. Mỗi mã đề Phần 1 có đúng 10 câu.
4. Shuffle thứ tự câu hỏi và thứ tự lựa chọn ngay trong quá trình generate.
5. Lưu kết quả thành dữ liệu đề tĩnh.
6. Xuất báo cáo kiểm tra độ phủ câu hỏi và mức độ trùng lặp giữa các mã đề.

Ví dụ cấu hình:

```ts
export interface StaticExamGenerationConfig {
  part: 1;
  examSetCount: number; // Yêu cầu Part 1: 20 mã đề
  lessonQuota: Record<number, number>;
  maxSharedQuestionRatio: number; // Mặc định: 0.4
  randomSeed?: string; // Cho phép tái lập kết quả generate
}

export const PART1_FULL_SCOPE_CONFIG: StaticExamGenerationConfig = {
  part: 1,
  examSetCount: 20,
  lessonQuota: {
    1: 1,
    2: 1,
    3: 1,
    4: 1,
    5: 2,
    6: 1,
    7: 1,
    8: 2,
  },
  maxSharedQuestionRatio: 0.4,
  randomSeed: "part1-v1",
};
```

### 7.2. Điều kiện câu đủ chuẩn để đưa vào mã đề

Chỉ được chọn câu có:

```ts
question.validation.grammarInScope === true
question.validation.vocabularyInScope === true
question.validation.singleCorrectAnswer === true
```

Nếu dự án có bước duyệt thủ công, có thể yêu cầu thêm:

```ts
question.validation.reviewed === true
```

trước khi generate bộ đề dùng chính thức.

### 7.3. Blueprint mã đề tổng hợp Bài 01–08

Mỗi mã đề Phần 1 gồm đúng 10 câu, theo quota:

| Bài | Số câu lấy |
|---:|---:|
| Bài 01 | 1 |
| Bài 02 | 1 |
| Bài 03 | 1 |
| Bài 04 | 1 |
| Bài 05 | 2 |
| Bài 06 | 1 |
| Bài 07 | 1 |
| Bài 08 | 2 |
| **Tổng** | **10** |

### 7.4. Quy tắc lựa chọn câu khi generate mã đề

1. Với mỗi lesson quota, chọn các pool khác nhau trước.
2. Trong một mã đề, mỗi `poolId` chỉ được đóng góp tối đa 1 câu.
3. Trong pool được chọn, không random thuần túy một câu bất kỳ. Ưu tiên câu đang có số lần được chọn thấp hơn trong toàn bộ batch mã đề đang generate.
4. Nếu nhiều câu trong pool có cùng số lần được chọn, chọn ngẫu nhiên trong nhóm đó.
5. Nếu số pool hợp lệ của một bài không đủ quota, throw/return lỗi rõ ràng; không âm thầm lấy lặp pool.
6. Không để một mã đề có quá nhiều câu cùng skill nếu có pool thay thế phù hợp.
7. Khi sinh nhiều mã đề, độ trùng câu giữa hai mã đề bất kỳ không vượt quá `maxSharedQuestionRatio` nếu nguồn dữ liệu cho phép.
8. Bộ đếm số lần câu được chọn chỉ phục vụ quá trình generate và báo cáo chất lượng bộ đề tĩnh; không liên quan đến học viên.

### 7.5. Theo dõi tần suất câu hỏi trong quá trình generate

Không lưu thống kê người học và không cần bảng runtime usage trong database.

Trong lúc script sinh các mã đề tĩnh, tạo một bộ đếm tạm theo `questionId`:

```ts
export interface QuestionSelectionCount {
  questionId: string;
  selectedCount: number;
  selectedInExamIds: string[];
}

const selectionCounts = new Map<string, QuestionSelectionCount>();
```

Mỗi lần một câu được đưa vào mã đề chính thức đang generate:

```ts
function markQuestionSelected(questionId: string, examId: string): void {
  const current = selectionCounts.get(questionId) ?? {
    questionId,
    selectedCount: 0,
    selectedInExamIds: [],
  };

  current.selectedCount += 1;
  current.selectedInExamIds.push(examId);

  selectionCounts.set(questionId, current);
}
```

Khi cần chọn một câu trong pool:

```ts
function selectBalancedQuestion(
  questions: Part1Question[],
  selectionCounts: Map<string, QuestionSelectionCount>,
  random: () => number,
): Part1Question {
  const validQuestions = questions.filter(isValidQuestion);

  if (validQuestions.length === 0) {
    throw new Error("Pool không có câu hợp lệ để generate đề.");
  }

  const minimumSelectedCount = Math.min(
    ...validQuestions.map(question =>
      selectionCounts.get(question.id)?.selectedCount ?? 0
    ),
  );

  const leastUsedQuestions = validQuestions.filter(question => {
    const selectedCount =
      selectionCounts.get(question.id)?.selectedCount ?? 0;

    return selectedCount === minimumSelectedCount;
  });

  return sampleOne(leastUsedQuestions, random);
}
```

Mục tiêu:

- Trong cùng một pool có 3 câu, các câu được sử dụng tương đối đều.
- Tránh trường hợp một câu xuất hiện trong nhiều mã đề hơn hẳn hai câu còn lại.
- Vẫn giữ yếu tố random khi nhiều câu có mức sử dụng bằng nhau.

### 7.6. Cấu trúc dữ liệu mã đề tĩnh

Mỗi mã đề sau khi generate phải lưu câu đã chọn và thứ tự option đã shuffle.

```ts
export interface StaticPart1Exam {
  id: string; // Ví dụ: PART1_EXAM_001
  part: 1;
  scope: {
    fromLesson: number;
    toLesson: number;
  };
  questionCount: 10;
  generatedAt: string;
  generationSeed?: string;
  questions: StaticExamQuestion[];
}

export interface StaticExamQuestion {
  questionId: string;
  poolId: string;
  displayOrder: number;
  shuffledOptionIds: string[];
}
```

Ví dụ:

```json
{
  "id": "PART1_EXAM_001",
  "part": 1,
  "scope": {
    "fromLesson": 1,
    "toLesson": 8
  },
  "questionCount": 10,
  "generatedAt": "2026-05-31T00:00:00.000Z",
  "generationSeed": "part1-v1",
  "questions": [
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
  ]
}
```

Đáp án đúng vẫn được xác định từ câu hỏi gốc:

```ts
selectedOptionId === question.correctOptionId
```

Không lưu đáp án đúng theo vị trí sau khi shuffle.

### 7.7. Shuffle lựa chọn trong mã đề tĩnh

Shuffle chỉ thực hiện tại lúc generate mã đề tĩnh.

```ts
function createStaticExamQuestion(
  question: Part1Question,
  displayOrder: number,
  random: () => number,
): StaticExamQuestion {
  return {
    questionId: question.id,
    poolId: question.poolId,
    displayOrder,
    shuffledOptionIds: shuffle(
      question.options.map(option => option.id),
      random,
    ),
  };
}
```

Khi render đề, lấy nội dung option theo thứ tự `shuffledOptionIds`.

UI tự hiển thị nhãn:

```ts
const displayLabels = ["①", "②", "③", "④"];
```

### 7.8. Kiểm tra độ trùng giữa các mã đề

Khi generate mã đề mới, so sánh với các mã đề đã tạo trong cùng batch.

```ts
function calculateSharedQuestionRatio(
  examA: StaticPart1Exam,
  examB: StaticPart1Exam,
): number {
  const idsA = new Set(examA.questions.map(item => item.questionId));
  const sharedCount = examB.questions.filter(item =>
    idsA.has(item.questionId),
  ).length;

  return sharedCount / examA.questionCount;
}
```

Quy tắc:

```ts
calculateSharedQuestionRatio(newExam, existingExam)
  <= config.maxSharedQuestionRatio
```

Với đề 10 câu và giới hạn `0.4`, hai mã đề chỉ nên trùng tối đa 4 câu.

Nếu không thể thỏa điều kiện sau một số lần retry hợp lý, script phải:

- Báo rõ không đủ dữ liệu để đạt mức trùng mong muốn.
- Cho phép người phát triển tăng số pool/câu hoặc nới giới hạn.
- Không âm thầm sinh bộ đề có chất lượng thấp hơn cấu hình.

### 7.9. Generation report

Sau khi sinh xong các mã đề tĩnh, xuất báo cáo để kiểm tra chất lượng phân bố:

```ts
export interface StaticExamGenerationReport {
  examSetCount: number;
  totalSelectedQuestionSlots: number;
  uniqueQuestionsUsed: number;
  unusedQuestionIds: string[];
  questionSelectionCounts: Array<{
    questionId: string;
    poolId: string;
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
}
```

Report cần giúp kiểm tra:

- Câu nào chưa từng được dùng trong bất kỳ mã đề nào.
- Câu nào xuất hiện nhiều nhất.
- Mức chênh lệch số lần xuất hiện giữa các câu trong cùng pool.
- Cặp mã đề nào trùng câu quá giới hạn.

Có thể lưu kết quả dưới dạng:

```text
generated/
  part1-static-exams.json
  part1-static-exams-report.json
```

---

## 8. Validation bắt buộc

### 8.1. Validation dữ liệu tĩnh

Cần viết validator/test để kiểm tra:

```text
- Có đúng 38 pool.
- Mỗi pool có đúng 3 câu.
- Tổng số câu là 114.
- Không trùng question.id.
- Không trùng pool.id.
- Mỗi câu có đúng 4 options.
- Không trùng option.id trong một câu.
- Không trùng option.text trong một câu.
- correctOptionId tồn tại trong options của chính câu đó.
- correctValue khớp text của option đúng.
- stem không rỗng.
- explanationVi không rỗng.
- targetLesson nằm trong 1..8.
- Chỉ câu validation hợp lệ mới được đưa vào logic tạo đề.
```

### 8.2. Validation phạm vi kiến thức

Không nên cố tokenize tiếng Hàn rồi suy ngược toàn bộ từ gốc bằng regex đơn giản, vì từ đã chia có thể thay đổi hình thức (`보다 -> 봤어요`, `맵다 -> 매워요`).

Thay vào đó:

1. Parse hai file nguồn thành các set:
   - `allowedGrammarByLesson`
   - `allowedVocabularyLemmaByLesson`
2. Mỗi câu lưu rõ metadata:
   - `grammarUsed`
   - `vocabularyUsed` ở dạng từ gốc/cụm nguồn
3. Validator kiểm tra metadata này có nằm trong set tích lũy đến `targetLesson` hay không.
4. Duyệt thủ công lần cuối cho tính tự nhiên và trường hợp chia bất quy tắc.

Pseudo-code:

```ts
function validateScope(question: Part1Question, knowledge: KnowledgeIndex) {
  const allowedGrammar = knowledge.getCumulativeGrammar(question.targetLesson);
  const allowedVocabulary = knowledge.getCumulativeVocabulary(question.targetLesson);

  const grammarInScope = question.grammarUsed.every(item =>
    allowedGrammar.has(normalizeGrammar(item))
  );

  const vocabularyInScope = question.vocabularyUsed.every(item =>
    allowedVocabulary.has(normalizeVocabulary(item))
  );

  return { grammarInScope, vocabularyInScope };
}
```

### 8.3. Unit tests cho logic sinh mã đề tĩnh

Viết test đảm bảo:

```text
- Script generate đúng **20 mã đề** theo config Part 1.
- Mỗi mã đề có đúng 10 câu.
- Mỗi mã đề tuân thủ lesson quota.
- Không có hai câu cùng poolId trong một mã đề.
- Chỉ chọn câu validation hợp lệ.
- Option được shuffle nhưng correctOptionId của câu gốc vẫn chấm đúng.
- Mỗi mã đề lưu đúng shuffledOptionIds.
- Không có shuffledOptionIds thiếu hoặc trùng option.
- Độ trùng câu giữa hai mã đề không vượt maxSharedQuestionRatio nếu dữ liệu đủ.
- Logic cân bằng ưu tiên câu có selectedCount thấp hơn.
- Report thống kê đúng số lần từng câu được chọn.
- Với randomSeed cố định, kết quả generate có thể tái lập.
```

Không viết logic hoặc test liên quan đến:

```text
- userId
- lịch sử học viên đã gặp câu nào
- seenCount theo học viên
- adaptive learning
- sinh đề runtime theo từng lượt làm bài
```

---

## 9. File/module đầu ra mong muốn

Tùy convention dự án, triển khai cấu trúc tương đương với:

```text
src/
  data/
    korean/
      source/
        nguphapsc_1-8.json
        tuvungsocap_1-8.json
      pools/
        part1-pool-catalog.ts        // Hoặc .json: catalog 38 pool
        part1-questions.ts           // Hoặc .json: 114 câu gốc
      generated/
        part1-static-exams.json      // Các mã đề tĩnh đã sinh
        part1-static-exams-report.json // Báo cáo cân bằng/trùng lặp
  features/
    quiz/
      part1/
        types.ts
        knowledge-index.ts
        validate-part1-pools.ts
        generate-static-part1-exams.ts
        generate-static-part1-exams.test.ts
```

Nếu project đã có ORM/database:

```text
- Có thể seed catalog pool, 114 câu hỏi gốc và các mã đề tĩnh đã generate.
- Mã đề lưu danh sách questionId và shuffledOptionIds cố định.
- Không tạo bảng lịch sử câu hỏi theo học viên.
- Không tạo bảng runtime usage statistics nếu ứng dụng chỉ sử dụng đề tĩnh.
- Báo cáo cân bằng câu hỏi có thể lưu dạng JSON build artifact hoặc seed metadata.
```

---

## 10. Checklist thực thi cho Codex

Thực hiện theo thứ tự:

### Phase 1 — Khảo sát và thiết kế

- [ ] Đọc repository và xác định stack/config hiện tại.
- [ ] Tìm model/schema question/quiz có sẵn.
- [ ] Xác định vị trí hai file nguồn hoặc thêm cơ chế load file.
- [ ] Tạo type/schema cần thiết mà không phá convention dự án.

### Phase 2 — Knowledge index

- [ ] Parse `nguphapsc_1-8.json`.
- [ ] Parse `tuvungsocap_1-8.json`.
- [ ] Chuẩn hóa ngoại lệ Bài 06: `-(으)ㅂ시다`.
- [ ] Tạo lookup kiến thức tích lũy theo lesson.

### Phase 3 — Pool catalog và dữ liệu câu hỏi

- [ ] Tạo đủ 38 pool theo catalog mục 4.
- [ ] Mỗi pool có đúng 3 câu.
- [ ] Mỗi câu có `correctOptionId`, không có answer index.
- [ ] Tổng dữ liệu đạt 114 câu.
- [ ] Gắn metadata `grammarUsed`, `vocabularyUsed`, `validation`.

### Phase 4 — Validation

- [ ] Viết validator cấu trúc pool/question.
- [ ] Viết validator phạm vi dựa trên metadata và knowledge index.
- [ ] Report rõ câu nào lỗi nếu phát hiện từ/ngữ pháp ngoài scope.
- [ ] Không cho câu invalid tham gia tạo đề.

### Phase 5 — Sinh mã đề tĩnh và shuffle

- [ ] Implement script generate đúng 20 mã đề tĩnh Phần 1 theo config.
- [ ] Mỗi mã đề có đúng 10 câu theo lesson quota.
- [ ] Mỗi pool tối đa 1 câu trong một mã đề.
- [ ] Khi chọn câu trong pool, ưu tiên câu có `selectedCount` thấp hơn trong batch generate.
- [ ] Shuffle thứ tự câu hỏi trong từng mã đề.
- [ ] Shuffle options tại thời điểm generate và lưu `shuffledOptionIds`.
- [ ] Chấm đáp án bằng `correctOptionId`, không chấm bằng vị trí hiển thị.
- [ ] Kiểm tra độ trùng giữa các mã đề theo `maxSharedQuestionRatio`.
- [ ] Xuất file dữ liệu mã đề tĩnh.

### Phase 6 — Test và generation report

- [ ] Unit test validator câu hỏi và pool.
- [ ] Unit test logic generate mã đề tĩnh.
- [ ] Unit test cân bằng `selectedCount`.
- [ ] Unit test giới hạn trùng lặp giữa các mã đề.
- [ ] Unit test chấm điểm sau khi options đã được shuffle cố định.
- [ ] Unit test tái lập kết quả với `randomSeed`.
- [ ] Xuất `part1-static-exams-report.json`.
- [ ] Report câu chưa được dùng, câu dùng nhiều nhất và overlap giữa các mã đề.
- [ ] Chạy lint/typecheck/test theo package scripts hiện có.
- [ ] Tóm tắt file đã tạo/sửa và các giả định còn lại.

---

## 11. Không được làm

```text
- Không hardcode đáp án đúng bằng vị trí ①/②/③/④.
- Không chấm dựa trên index sau khi shuffle options.
- Không sinh đề runtime mỗi khi học viên bắt đầu làm bài.
- Không tạo logic cá nhân hóa theo học viên.
- Không lưu user question history, seenCount hoặc lastSeenAt.
- Không dùng ngữ pháp/từ vựng ngoài hai file nguồn.
- Không silently pass các câu không validate được.
- Không tạo câu có nhiều hơn một đáp án hợp lý.
- Không tạo ba câu trong pool trùng máy móc chỉ thay đúng một từ.
- Không để một câu bị chọn quá nhiều trong batch generate nếu vẫn còn câu cùng pool ít được sử dụng hơn.
- Không sinh bộ mã đề có mức trùng vượt cấu hình mà không báo lỗi hoặc cảnh báo rõ ràng.
- Không tự thêm pool vượt phạm vi mà chưa được người dùng duyệt.
```

---

## 12. Tiêu chí hoàn thành

Task được xem là hoàn thành khi:

1. Project có model/schema hỗ trợ pool và question với đáp án định danh bằng `correctOptionId`.
2. Có catalog **38 pool** và dữ liệu đủ **114 câu** hoặc seed tương đương.
3. Có logic validate phạm vi từ hai file JSON nguồn.
4. Có script sinh trước đúng **20 mã đề tĩnh** Phần 1, mỗi đề đúng **10 câu** theo lesson quota.
5. Các mã đề lưu cố định `questionId`, `displayOrder` và `shuffledOptionIds`.
6. Có logic cân bằng số lần câu được chọn trong quá trình generate batch mã đề.
7. Có report kiểm tra độ phủ câu hỏi và độ trùng giữa các mã đề.
8. Có test chứng minh shuffle options không làm sai đáp án.
9. Không có logic hoặc dữ liệu theo dõi lịch sử câu hỏi của từng học viên.
10. Không có câu sử dụng kiến thức ngoài Bài 01–08.
11. Code chạy qua lint/typecheck/test hiện có của dự án.
