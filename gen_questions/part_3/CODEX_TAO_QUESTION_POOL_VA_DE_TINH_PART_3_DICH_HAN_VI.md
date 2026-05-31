# CODEX TASK: Triển khai Question Pool và Mã Đề Tĩnh cho Part 3 — Dịch Hàn ↔ Việt

## 0. Mục tiêu

Triển khai dữ liệu và logic generate cho:

```text
PART 3: DỊCH TIẾNG HÀN SANG TIẾNG VIỆT VÀ NGƯỢC LẠI
Tổng số câu trong mỗi mã đề: 8 câu
Hình thức: Tự luận dịch câu
```

Yêu cầu tổng thể:

- Tạo **question pool** theo từng dạng câu/tình huống giao tiếp.
- Mỗi pool có đúng **3 câu biến thể**.
- Từ các pool, chạy script generate để tạo trước nhiều **mã đề tĩnh**.
- Mỗi mã đề Part 3 có đúng **8 câu**:
  - `4` câu Việt → Hàn (`vi_to_ko`)
  - `4` câu Hàn → Việt (`ko_to_vi`)
- Không sinh đề runtime theo học viên.
- Không lưu lịch sử học viên hoặc dữ liệu cá nhân hóa.
- Trong lúc generate batch mã đề, dùng bộ đếm tạm để cân bằng số lần các câu được chọn.
- Xuất answer key đi kèm từng mã đề.

---

## 1. Yêu cầu trước khi code

1. Đọc toàn bộ repository hiện tại trước khi tạo/sửa file.
2. Kiểm tra cấu trúc đã triển khai cho Part 1: types/schema, pool catalog, static exam generator, validation, seeded random/shuffle và generation report.
3. Tái sử dụng convention và utility chung của Part 1 nếu đã có, đặc biệt:
   - seeded random;
   - chọn cân bằng theo `selectedCount`;
   - giới hạn overlap giữa các mã đề;
   - output folder cho dữ liệu generated.
4. Không tạo logic theo dõi câu hỏi theo học viên.
5. Không thay đổi code ngoài phạm vi cần thiết cho Part 3.
6. Nếu dự án đã có model chung cho `exam`, `part`, `question`, `pool`, hãy mở rộng model hiện có thay vì dựng hệ thống song song.

---

## 2. Khác biệt bắt buộc giữa Part 1 và Part 3

| Nội dung | Part 1 | Part 3 |
|---|---|---|
| Hình thức | Trắc nghiệm 4 lựa chọn | Tự luận dịch câu |
| Dữ liệu đáp án | `options`, `correctOptionId` | `sampleAnswer`, `acceptedAnswers` |
| Shuffle đáp án | Có shuffle options | Không có options để shuffle |
| Shuffle câu hỏi | Có | Có |
| Chấm tự động tuyệt đối | Có thể chấm bằng option ID | Không mặc định chấm bằng khớp chuỗi |
| Số câu/mã đề | 10 | 8 |
| Hướng kỹ năng | Từ vựng/ngữ pháp | `vi_to_ko` và `ko_to_vi` |

Part 3 **không được** dùng schema trắc nghiệm:

```ts
// KHÔNG dùng cho Part 3
interface WrongPart3Question {
  options: string[];
  correctOptionId: string;
}
```

Part 3 phải lưu bản dịch mẫu và các bản dịch tương đương được chấp nhận:

```ts
interface TranslationAnswerData {
  sampleAnswer: string;
  acceptedAnswers: string[];
}
```

Nếu ứng dụng chỉ xuất đề tĩnh/in đề, các field trên dùng để tạo **đáp án tham khảo**. Nếu sau này có nhập tự do trên giao diện, không tự động kết luận sai chỉ vì người học viết khác chuỗi đáp án mẫu; cần cơ chế grading riêng hoặc duyệt thủ công.

---

## 3. Phạm vi kiến thức Part 3

### 3.1. Source of truth riêng cho Part 3

Part 3 được xây dựng dựa trên các mẫu câu và từ/ngữ pháp đã được duyệt trong đặc tả này. **Không validate Part 3 chỉ bằng hai file JSON của Part 1/Bài 01–08**, vì các mẫu dịch Part 3 có thêm từ hoặc cấu trúc như:

```text
의사, 어머니, 가족, 만들다, 김치, 베트남어, 농구, 낚시하다
-(으)ㄹ 수 있다/없다, -지만, -아서/어서, 더, 번
```

Nếu repository hiện chỉ có file nguồn Part 1, tạo thêm:

```text
src/data/korean/source/part3-translation-scope.json
```

File scope này phải lưu catalog grammar, vocabulary và các nhóm tình huống được phép dùng cho Part 3.

### 3.2. Nhóm tình huống được phép dùng

| Skill key | Nhóm tình huống | Ví dụ nội dung |
|---|---|---|
| `invitation` | Rủ rê cùng thực hiện hoạt động | Cùng đi dạo ở công viên / cùng học ở thư viện lúc 8 giờ tối |
| `preference` | Sở thích | Thích tiếng Hàn và tiếng Việt / thích nghe nhạc |
| `family_job` | Người thân và nghề nghiệp | Bố là bác sĩ, làm việc ở bệnh viện |
| `past_activity` | Hoạt động đã làm | Đã làm kim chi với bạn / đã ăn đồ Hàn với gia đình |
| `nationality_qa` | Hỏi đáp quốc tịch | Có phải người Mỹ không? Không, là người Pháp |
| `desire_travel` | Mong muốn đi du lịch | Mẹ muốn đi du lịch Thái Lan |
| `shopping_quantity` | Mua/gọi món, số lượng, giá | Mua ba con cá / cho hai cơm trộn và Cola |
| `contrast_description` | Đối chiếu tính chất | Táo rẻ, xoài đắt / đồ ăn ngon nhưng cay |
| `ability_negation` | Khả năng và phủ định | Có thể lái xe không? Không thể lái xe |
| `reason_request` | Lý do và yêu cầu thêm | Vì kim chi cay nên không ăn được; cho thêm cơm |
| `habit_frequency` | Thói quen/tần suất | Cuối tuần thường nghe nhạc / một tháng ăn hai lần |
| `plan_intention` | Kế hoạch/ý định | Cuối tuần sau định chơi bóng rổ và câu cá |
| `location_existence` | Vị trí/sự tồn tại | Nhà vệ sinh ở đâu? Ở tầng 2 |
| `time_schedule` | Lịch trình/thời gian | Lớp tiếng Hàn kết thúc lúc 5 giờ chiều |

### 3.3. Ngữ pháp/biểu đạt được phép làm trọng tâm

Dùng các key chuẩn hóa sau trong `part3-translation-scope.json` và metadata câu hỏi:

| Grammar key | Mô tả | Ví dụ |
|---|---|---|
| `FORMAL_PRESENT` | `-ㅂ/습니다`, `-ㅂ/습니까` | `좋아합니다`, `입니까?` |
| `INFORMAL_POLITE_PRESENT` | `-아/어요` | `좋아해요`, `끝나요` |
| `COPULA` | `이다` → `입니다`, `이에요/예요` | `의사입니다` |
| `TOPIC_PARTICLE` | `은/는` | `사과는 싸요` |
| `OBJECT_PARTICLE` | `을/를` | `음악을 들어요` |
| `TIME_PARTICLE` | `에` chỉ thời gian | `오후 8시에` |
| `ACTION_LOCATION_PARTICLE` | `에서` chỉ nơi hành động xảy ra | `도서관에서 공부해요` |
| `NOUN_CONNECTOR` | `와/과`, `하고` | `한국어와 베트남어` |
| `PAST_TENSE` | `-았/었-` | `만들었어요`, `먹었습니다` |
| `INVITATION_FORMAL` | `-(으)ㅂ시다` | `산책합시다` |
| `DESIRE_FIRST_PERSON` | `-고 싶다` | `사고 싶어요` |
| `DESIRE_THIRD_PERSON` | `-고 싶어하다` | `가고 싶어해요` |
| `COUNTER_NUMBER` | Số thuần Hàn + đơn vị đếm | `세 마리`, `두 개` |
| `INTENTION` | `-겠-` | `드시겠어요`, `하겠습니다` |
| `POLITE_REQUEST` | `-(으)세요`, `주세요` | `주세요` |
| `ABILITY` | `-(으)ㄹ 수 있다/없다` | `운전할 수 없어요` |
| `CONTRAST_CONNECTIVE` | `-지만` | `맛있지만 매워요` |
| `REASON_CONNECTIVE` | `-아서/어서` | `매워서 먹을 수 없어요` |
| `EXISTENCE_LOCATION` | `에 있다/없다` | `화장실이 2층에 있어요` |
| `FREQUENCY_EXPRESSION` | Tần suất | `한 달에 두 번`, `자주` |

### 3.4. Từ vựng tối thiểu được phép dùng

Lưu dạng lemma/cụm chuẩn hóa trong scope file. Có thể bổ sung biến thể lịch sự hoặc cách viết đã có trong repository, nhưng không tự mở rộng chủ đề.

#### Người và quan hệ

```text
저, 우리, 남 씨, 친구, 아버지, 아빠, 어머니, 엄마, 가족, 흐엉 씨
```

Với tên riêng Việt Nam, chọn một convention nhất quán, ví dụ `남 씨`, `흐엉 씨`; không trộn `Nam 씨` và `남 씨` trong dữ liệu chính nếu không có lý do.

#### Quốc gia, ngôn ngữ, nghề nghiệp

```text
한국어, 베트남어, 미국 사람, 프랑스 사람, 태국, 의사
```

#### Địa điểm

```text
공원, 도서관, 집, 병원, 다낭 병원, 식당, 방, 화장실, 2층
```

#### Hoạt động

```text
산책하다, 공부하다, 좋아하다, 일하다, 만들다, 여행하다, 여행을 가다,
사다, 먹다, 듣다, 등산하다, 농구를 하다, 낚시하다, 운전하다, 끝나다
```

#### Đồ ăn, đồ uống, đồ vật

```text
김치, 밥, 비빔밥, 김치찌개, 콜라, 생선, 한국 음식, 한식, 음악, 수업
```

#### Tính từ/trạng từ/biểu đạt bổ trợ

```text
싸다, 비싸다, 맛있다, 맵다, 같이, 함께, 자주, 더, 모두
```

#### Thời gian, số lượng, tiền

```text
오늘, 이번 주, 지난주, 다음 주말, 일요일, 주말, 저녁, 오후, 시,
한 달, 번, 마리, 개, 천, 만, 동
```

### 3.5. Câu mẫu tham chiếu

Các câu dưới đây là mẫu để tạo câu tương tự. Không tạo ba biến thể chỉ bằng đổi tên người hoặc thay một danh từ máy móc.

#### Việt → Hàn: mẫu đã duyệt

```text
1. Chúng ta cùng đi dạo ở công viên lúc 8 giờ tối nhé?
   → 오후 8시에 공원에서 같이 산책합시다.

2. Nam thích tiếng Hàn và tiếng Việt.
   → 남 씨는 한국어와 베트남어를 좋아합니다.
   → 남 씨는 한국어하고 베트남어를 좋아해요.

3. Bố của tôi là bác sĩ. Ông ấy làm việc ở bệnh viện Đà Nẵng.
   → 제 아버지는 의사입니다. 다낭 병원에서 일합니다.

4. Chủ nhật tuần này tôi đã làm kim chi với bạn ở nhà.
   → 이번 주 일요일에 저는 친구와 같이 집에서 김치를 만들었습니다.
   → 이번 주 일요일에 저는 친구하고 같이 집에서 김치를 만들었어요.

5. Anh có phải là người Mỹ không? Không, tôi là người Pháp.
   → 미국 사람입니까? 아니요, 저는 프랑스 사람입니다.
   → 미국 사람이에요? 아니요, 저는 프랑스 사람이에요.

6. Mẹ tôi muốn đi du lịch Thái Lan.
   → 제 어머니는 태국에 여행을 가고 싶어합니다.
   → 우리 엄마는 태국에 여행을 가고 싶어해요.

7. Tôi muốn mua 3 con cá. Tất cả là bao nhiêu tiền? 120.000 đồng nhé!
   → 저는 생선 세 마리를 사고 싶어요. 모두 얼마예요? 십이만 동이에요.

8. Quả táo thì rẻ. Quả xoài thì đắt.
   → 사과는 싸요. 망고는 비싸요.

9. Tuần trước Nam đã ăn đồ ăn Hàn Quốc cùng với gia đình ở nhà hàng.
   → 남 씨는 지난주에 식당에서 가족과 같이 한국 음식을 먹었습니다.
   → 남 씨는 지난주에 가족하고 같이 식당에서 한식을 먹었어요.

10. Lớp học tiếng Hàn kết thúc lúc 5 giờ chiều.
    → 한국어 수업은 오후 다섯 시에 끝나요.
```

#### Mẫu nội dung bổ sung để tạo pool dịch

```text
1. Chúng mình cùng học bài ở thư viện lúc 8 giờ tối nhé?
2. Hãy cho tôi hai cơm trộn và một canh kim chi. Cho tôi một chai Cola nữa.
3. Chị Hương có thể lái xe không? Không, tôi không thể lái xe.
4. Vì kim chi cay nên không thể ăn. Hãy cho tôi thêm một chút cơm.
5. Tôi thích nghe nhạc. Cuối tuần tôi thường nghe nhạc ở trong phòng.
6. Vào cuối tuần tôi thường xuyên leo núi cùng những người bạn.
7. Cuối tuần sau tôi định chơi bóng rổ. Tôi cũng định câu cá cùng những người bạn.
8. Nhà vệ sinh ở đâu ạ? Ở gần đây có nhà vệ sinh không? Nhà vệ sinh ở tầng 2.
9. Đồ ăn Hàn Quốc ngon nhưng cay. Một tháng tôi ăn đồ Hàn hai lần.
```

Chỉ tạo bản dịch tiếng Hàn cho các mẫu bổ sung sau khi các từ và grammar cần thiết đã được đưa vào `part3-translation-scope.json`.

---

## 4. Catalog pool cần triển khai

### 4.1. Nguyên tắc

- Mỗi pool đại diện cho một **tình huống dịch + cấu trúc trọng tâm**, không tách vụn theo từng tiểu từ.
- Mỗi pool có đúng `3` câu biến thể.
- Có hai hướng dịch độc lập:
  - `VK`: Việt → Hàn.
  - `KV`: Hàn → Việt.
- Không chỉ lấy một câu rồi đảo hướng dịch thành hai pool giống nhau; nội dung giữa hai hướng cần đa dạng nhưng vẫn trong phạm vi.

### 4.2. Pool Việt → Hàn (`vi_to_ko`)

| pool_id | skill | knowledge_target | quantity |
|---|---|---|---:|
| `P3_VK_01` | `invitation` | Dịch câu rủ rê cùng làm hoạt động tại nơi/thời gian xác định với `-(으)ㅂ시다` | 3 |
| `P3_VK_02` | `preference` | Dịch câu sở thích với `좋아하다`, `을/를`, `와/과` hoặc `하고` | 3 |
| `P3_VK_03` | `family_job` | Dịch câu giới thiệu người thân, nghề nghiệp và nơi làm việc | 3 |
| `P3_VK_04` | `past_activity` | Dịch hoạt động quá khứ với bạn/gia đình tại địa điểm | 3 |
| `P3_VK_05` | `nationality_qa` | Dịch hội thoại hỏi/đáp quốc tịch | 3 |
| `P3_VK_06` | `desire_travel` | Dịch mong muốn của người thứ ba với `-고 싶어하다` | 3 |
| `P3_VK_07` | `shopping_quantity` | Dịch câu muốn mua/gọi món có số lượng hoặc hỏi giá | 3 |
| `P3_VK_08` | `contrast_description` | Dịch câu đối chiếu tính chất/đồ ăn với `은/는` hoặc `-지만` | 3 |
| `P3_VK_09` | `ability_negation` | Dịch hỏi đáp khả năng và phủ định với `-(으)ㄹ 수 있다/없다` | 3 |
| `P3_VK_10` | `reason_request` | Dịch lý do và yêu cầu thêm với `-아서/어서`, `주세요` | 3 |
| `P3_VK_11` | `habit_frequency` | Dịch sở thích/thói quen/tần suất hoạt động | 3 |
| `P3_VK_12` | `plan_intention` | Dịch kế hoạch cuối tuần với biểu đạt ý định trong scope | 3 |
| `P3_VK_13` | `location_existence` | Dịch hỏi đáp vị trí với `에 있다/없다` | 3 |
| `P3_VK_14` | `time_schedule` | Dịch câu lịch trình tại thời điểm cụ thể | 3 |

```text
14 pool × 3 câu = 42 câu Việt → Hàn
```

### 4.3. Pool Hàn → Việt (`ko_to_vi`)

| pool_id | skill | knowledge_target | quantity |
|---|---|---|---:|
| `P3_KV_01` | `invitation` | Hiểu và dịch câu rủ rê `-(으)ㅂ시다` | 3 |
| `P3_KV_02` | `preference` | Hiểu và dịch câu sở thích | 3 |
| `P3_KV_03` | `family_job` | Hiểu và dịch giới thiệu người thân/nghề nghiệp/nơi làm việc | 3 |
| `P3_KV_04` | `past_activity` | Hiểu và dịch hoạt động trong quá khứ | 3 |
| `P3_KV_05` | `nationality_qa` | Hiểu và dịch hội thoại quốc tịch | 3 |
| `P3_KV_06` | `desire_travel` | Hiểu và dịch mong muốn của người thứ ba | 3 |
| `P3_KV_07` | `shopping_quantity` | Hiểu và dịch câu mua/gọi món, số lượng hoặc giá | 3 |
| `P3_KV_08` | `contrast_description` | Hiểu và dịch câu đối chiếu/tương phản tính chất | 3 |
| `P3_KV_09` | `ability_negation` | Hiểu và dịch khả năng/phủ định | 3 |
| `P3_KV_10` | `reason_request` | Hiểu và dịch câu nêu lý do/yêu cầu thêm | 3 |
| `P3_KV_11` | `habit_frequency` | Hiểu và dịch thói quen/tần suất | 3 |
| `P3_KV_12` | `plan_intention` | Hiểu và dịch kế hoạch/ý định cuối tuần | 3 |
| `P3_KV_13` | `location_existence` | Hiểu và dịch vị trí/sự tồn tại | 3 |
| `P3_KV_14` | `time_schedule` | Hiểu và dịch lịch trình/thời gian | 3 |

```text
14 pool × 3 câu = 42 câu Hàn → Việt
```

### 4.4. Tổng quy mô đầy đủ

```text
28 pool × 3 câu = 84 câu hỏi gốc Part 3
```

### 4.5. MVP nếu chưa muốn làm đủ ngay

Chỉ triển khai 8 pool core ở mỗi hướng:

```text
invitation, preference, family_job, past_activity,
shopping_quantity, contrast_description, location_existence, time_schedule
```

```text
16 pool × 3 câu = 48 câu hỏi gốc Part 3
```

Nếu task yêu cầu đầy đủ, triển khai catalog 28 pool/84 câu; không tự chuyển sang MVP khi chưa được yêu cầu.

---

## 5. Schema dữ liệu

### 5.1. Types

```ts
export type TranslationDirection = "vi_to_ko" | "ko_to_vi";

export type Part3Skill =
  | "invitation"
  | "preference"
  | "family_job"
  | "past_activity"
  | "nationality_qa"
  | "desire_travel"
  | "shopping_quantity"
  | "contrast_description"
  | "ability_negation"
  | "reason_request"
  | "habit_frequency"
  | "plan_intention"
  | "location_existence"
  | "time_schedule";

export type TranslationDifficulty = "easy" | "medium";

export interface Part3TranslationQuestion {
  id: string; // Ví dụ: P3_VK_01_Q001
  part: 3;
  poolId: string;
  direction: TranslationDirection;
  skill: Part3Skill;
  knowledgeTarget: string;
  difficulty: TranslationDifficulty;
  semanticGroupId?: string; // Tránh lấy hai chiều của cùng nội dung trong một đề

  /** vi_to_ko: prompt tiếng Việt; ko_to_vi: prompt tiếng Hàn. */
  prompt: string;

  /** Đáp án tham khảo chính, không dùng để exact-string grade. */
  sampleAnswer: string;

  /** Các bản dịch đúng và tự nhiên khác nằm trong scope. */
  acceptedAnswers: string[];

  /** Grammar trọng tâm câu muốn đánh giá. */
  targetGrammar: string[];

  /** Tất cả grammar xuất hiện trong phần tiếng Hàn, dùng key chuẩn hóa. */
  grammarUsed: string[];

  /** Lemma/cụm từ nguồn xuất hiện trong câu. */
  vocabularyUsed: string[];

  explanationVi: string;

  validation: {
    grammarInScope: boolean;
    vocabularyInScope: boolean;
    translationNatural: boolean;
    multipleValidAnswersHandled: boolean;
    reviewed: boolean;
    note?: string;
  };
}

export interface Part3QuestionPool {
  id: string;
  part: 3;
  direction: TranslationDirection;
  skill: Part3Skill;
  knowledgeTarget: string;
  targetGrammar: string[];
  quantity: 3;
  questions: Part3TranslationQuestion[];
}
```

### 5.2. Không dùng answer index/option

Part 3 không được có các field:

```ts
options
correctOptionId
correctIndex
correctAnswerPosition
shuffledOptionIds
```

---

## 6. Ví dụ dữ liệu câu hỏi

### 6.1. Việt → Hàn

```json
{
  "id": "P3_VK_01_Q001",
  "part": 3,
  "poolId": "P3_VK_01",
  "direction": "vi_to_ko",
  "skill": "invitation",
  "knowledgeTarget": "Dịch câu rủ rê cùng thực hiện hoạt động tại thời gian và địa điểm xác định",
  "difficulty": "medium",
  "semanticGroupId": "P3_SEM_INVITE_PARK_8PM",
  "prompt": "Chúng ta cùng đi dạo ở công viên lúc 8 giờ tối nhé?",
  "sampleAnswer": "오후 8시에 공원에서 같이 산책합시다.",
  "acceptedAnswers": [
    "오후 8시에 공원에서 같이 산책합시다.",
    "저녁 8시에 공원에서 같이 산책합시다.",
    "오후 8시에 공원에서 함께 산책합시다."
  ],
  "targetGrammar": ["INVITATION_FORMAL"],
  "grammarUsed": [
    "INVITATION_FORMAL",
    "TIME_PARTICLE",
    "ACTION_LOCATION_PARTICLE"
  ],
  "vocabularyUsed": ["오후", "저녁", "시", "공원", "같이", "함께", "산책하다"],
  "explanationVi": "Câu rủ rê dùng -(으)ㅂ시다. Thời điểm dùng 에; địa điểm diễn ra hành động dùng 에서.",
  "validation": {
    "grammarInScope": true,
    "vocabularyInScope": true,
    "translationNatural": true,
    "multipleValidAnswersHandled": true,
    "reviewed": false
  }
}
```

### 6.2. Hàn → Việt

```json
{
  "id": "P3_KV_14_Q001",
  "part": 3,
  "poolId": "P3_KV_14",
  "direction": "ko_to_vi",
  "skill": "time_schedule",
  "knowledgeTarget": "Dịch câu nói về lịch trình kết thúc tại thời điểm cụ thể",
  "difficulty": "easy",
  "prompt": "한국어 수업은 오후 다섯 시에 끝나요.",
  "sampleAnswer": "Lớp học tiếng Hàn kết thúc lúc 5 giờ chiều.",
  "acceptedAnswers": [
    "Lớp học tiếng Hàn kết thúc lúc 5 giờ chiều.",
    "Buổi học tiếng Hàn kết thúc vào lúc 5 giờ chiều."
  ],
  "targetGrammar": ["TIME_PARTICLE", "INFORMAL_POLITE_PRESENT"],
  "grammarUsed": ["TOPIC_PARTICLE", "TIME_PARTICLE", "INFORMAL_POLITE_PRESENT"],
  "vocabularyUsed": ["한국어", "수업", "오후", "시", "끝나다"],
  "explanationVi": "오후 다섯 시에 nghĩa là lúc 5 giờ chiều; 끝나요 nghĩa là kết thúc.",
  "validation": {
    "grammarInScope": true,
    "vocabularyInScope": true,
    "translationNatural": true,
    "multipleValidAnswersHandled": true,
    "reviewed": false
  }
}
```

---

## 7. Quy tắc tạo 3 câu trong mỗi pool

1. Tạo đúng `3` câu cho mỗi pool.
2. Cả 3 câu phải cùng kiểm tra `knowledgeTarget`.
3. Ba câu phải khác nhau hợp lý về nội dung/tình huống, không chỉ đổi tên hoặc đổi một danh từ trong một template.
4. Prompt và đáp án không được chứa ngữ pháp/từ vựng ngoài `part3-translation-scope.json`.
5. Với `vi_to_ko`:
   - `prompt` là tiếng Việt;
   - `sampleAnswer` và `acceptedAnswers` là tiếng Hàn.
6. Với `ko_to_vi`:
   - `prompt` là tiếng Hàn;
   - `sampleAnswer` và `acceptedAnswers` là tiếng Việt.
7. Mỗi câu phải có ít nhất một `sampleAnswer`.
8. Nếu có nhiều cách dịch tự nhiên trong phạm vi, đưa vào `acceptedAnswers`.
9. Không thêm accepted answer dùng grammar/từ vựng ngoài phạm vi chỉ vì câu đó đúng ngoài đời.
10. `explanationVi` nêu ngắn gọn cấu trúc chính và ý nghĩa từ/cụm quan trọng.
11. Câu hỏi giới hạn ở câu đơn, hai câu ngắn hoặc hội thoại tối đa 2 lượt.
12. Không tạo câu mơ hồ dẫn đến quá nhiều bản dịch hợp lý ngoài phạm vi.

---

## 8. Sinh mã đề tĩnh Part 3

### 8.1. Cấu hình generate

```ts
export interface StaticPart3ExamGenerationConfig {
  part: 3;
  examSetCount: number; // Ví dụ: 10 mã đề
  questionCount: 8;
  directionQuota: {
    vi_to_ko: 4;
    ko_to_vi: 4;
  };
  maxSharedQuestionRatio: number; // Mặc định 0.375 = tối đa 3/8 câu trùng
  randomSeed?: string;
}

export const PART3_STATIC_EXAM_CONFIG: StaticPart3ExamGenerationConfig = {
  part: 3,
  examSetCount: 10,
  questionCount: 8,
  directionQuota: {
    vi_to_ko: 4,
    ko_to_vi: 4,
  },
  maxSharedQuestionRatio: 0.375,
  randomSeed: "part3-v1",
};
```

### 8.2. Blueprint mã đề

Mỗi mã đề có đúng:

| Hướng dịch | Số câu |
|---|---:|
| Việt → Hàn (`vi_to_ko`) | 4 |
| Hàn → Việt (`ko_to_vi`) | 4 |
| **Tổng** | **8** |

Nên bảo đảm mỗi mã đề có độ phủ nội dung:

| Nhóm kỹ năng | Yêu cầu |
|---|---|
| Hoạt động/giao tiếp đời sống | Ít nhất 2 câu |
| Thời gian/địa điểm/quá khứ | Ít nhất 1 câu |
| Mong muốn/yêu cầu/ý định/rủ rê | Ít nhất 1 câu |
| Mua hàng/đồ ăn hoặc mô tả tính chất | Ít nhất 1 câu |

### 8.3. Quy tắc lựa chọn pool và câu

1. Chỉ lấy câu có validation hợp lệ:

```ts
question.validation.grammarInScope === true
question.validation.vocabularyInScope === true
question.validation.translationNatural === true
question.validation.multipleValidAnswersHandled === true
```

Khi tạo bộ đề chính thức đã duyệt, yêu cầu thêm:

```ts
question.validation.reviewed === true
```

2. Mỗi mã đề chỉ lấy tối đa `1` câu từ cùng một `poolId`.
3. Một mã đề không được dùng đồng thời hai câu là bản dịch trực tiếp của cùng một thông điệp ở hai hướng. Dùng `semanticGroupId` để kiểm tra.
4. Với mỗi hướng dịch, chọn các pool khác nhau trước rồi chọn câu trong pool.
5. Khi chọn câu trong pool, ưu tiên câu có `selectedCount` thấp hơn trong toàn batch mã đề đang generate.
6. Nếu các câu có cùng `selectedCount`, chọn ngẫu nhiên bằng seeded random.
7. Nếu không đủ pool/câu hợp lệ để đạt quota hoặc coverage, throw/return lỗi rõ ràng.
8. Khi sinh nhiều mã đề, giới hạn overlap giữa hai mã đề bất kỳ theo `maxSharedQuestionRatio`.

### 8.4. Chống chọn hai chiều của cùng nội dung

Ví dụ gắn cùng group cho hai câu tương ứng:

```ts
{
  id: "P3_VK_01_Q001",
  semanticGroupId: "P3_SEM_INVITE_PARK_8PM"
}

{
  id: "P3_KV_01_Q001",
  semanticGroupId: "P3_SEM_INVITE_PARK_8PM"
}
```

Trong một mã đề, không chọn hai câu có cùng `semanticGroupId`.

---

## 9. Theo dõi cân bằng khi generate mã đề tĩnh

Không tạo thông tin học viên và không lưu runtime usage theo người dùng.

Trong script generate batch mã đề, dùng bộ đếm tạm:

```ts
export interface Part3QuestionSelectionCount {
  questionId: string;
  selectedCount: number;
  selectedInExamIds: string[];
}
```

Hàm chọn cân bằng:

```ts
function selectBalancedPart3Question(
  candidates: Part3TranslationQuestion[],
  counts: Map<string, Part3QuestionSelectionCount>,
  random: () => number,
): Part3TranslationQuestion {
  const valid = candidates.filter(isValidPart3Question);

  if (valid.length === 0) {
    throw new Error("Part 3 pool không có câu hợp lệ để generate đề.");
  }

  const minCount = Math.min(
    ...valid.map(question => counts.get(question.id)?.selectedCount ?? 0),
  );

  const leastUsed = valid.filter(
    question => (counts.get(question.id)?.selectedCount ?? 0) === minCount,
  );

  return sampleOne(leastUsed, random);
}
```

Mỗi khi một câu được chọn vào mã đề đã chấp nhận:

```ts
function markPart3QuestionSelected(
  questionId: string,
  examId: string,
  counts: Map<string, Part3QuestionSelectionCount>,
): void {
  const stat = counts.get(questionId) ?? {
    questionId,
    selectedCount: 0,
    selectedInExamIds: [],
  };

  stat.selectedCount += 1;
  stat.selectedInExamIds.push(examId);
  counts.set(questionId, stat);
}
```

Không tăng `selectedCount` cho candidate exam bị reject do vi phạm overlap hoặc coverage.

---

## 10. Cấu trúc mã đề tĩnh và answer key

### 10.1. Static exam

```ts
export interface StaticPart3Exam {
  id: string; // Ví dụ: PART3_EXAM_001
  part: 3;
  questionCount: 8;
  directionQuota: {
    vi_to_ko: 4;
    ko_to_vi: 4;
  };
  generatedAt: string;
  generationSeed?: string;
  questions: StaticPart3ExamQuestion[];
}

export interface StaticPart3ExamQuestion {
  questionId: string;
  poolId: string;
  direction: TranslationDirection;
  displayOrder: number;
}
```

Không lưu options hoặc shuffle options cho Part 3.

### 10.2. Answer key

```ts
export interface StaticPart3ExamAnswerKey {
  examId: string;
  answers: Array<{
    questionId: string;
    displayOrder: number;
    direction: TranslationDirection;
    sampleAnswer: string;
    acceptedAnswers: string[];
    explanationVi: string;
  }>;
}
```

Dữ liệu đề hiển thị cho học viên không chứa answer key nếu app phân tách quyền truy cập. Nếu xuất file in, tạo riêng bản đề và bản đáp án.

### 10.3. Thứ tự hiển thị khuyến nghị

Để đề dễ đọc, nhóm theo hướng dịch:

```text
PHẦN 3: DỊCH CÂU

A. Dịch các câu sau sang tiếng Hàn. (Câu 1–4)
B. Dịch các câu sau sang tiếng Việt. (Câu 5–8)
```

Chỉ shuffle trong từng nhóm hướng dịch:

```ts
const viToKoQuestions = shuffle(selectedViToKo, random);
const koToViQuestions = shuffle(selectedKoToVi, random);

const orderedQuestions = [
  ...viToKoQuestions,
  ...koToViQuestions,
].map((question, index) => ({
  questionId: question.id,
  poolId: question.poolId,
  direction: question.direction,
  displayOrder: index + 1,
}));
```

---

## 11. Generation report

Sau khi generate batch mã đề tĩnh, xuất report:

```ts
export interface StaticPart3GenerationReport {
  examSetCount: number;
  totalSelectedQuestionSlots: number;
  uniqueQuestionsUsed: number;
  unusedQuestionIds: string[];
  questionSelectionCounts: Array<{
    questionId: string;
    poolId: string;
    direction: TranslationDirection;
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
  coverageChecks: Array<{
    examId: string;
    viToKoCount: number;
    koToViCount: number;
    skillCoveragePassed: boolean;
    semanticDuplicatePassed: boolean;
  }>;
}
```

Report phải chỉ ra:

```text
- Đã tạo bao nhiêu mã đề.
- Mỗi mã đề có đúng 4 câu mỗi hướng hay không.
- Câu nào chưa được dùng.
- Câu nào được chọn nhiều nhất.
- Câu nào có tần suất lệch đáng kể so với các câu cùng pool.
- Cặp mã đề nào trùng quá giới hạn.
- Mã đề nào vô tình chứa hai chiều dịch của cùng semanticGroupId.
```

---

## 12. Validation bắt buộc

### 12.1. Validation cấu trúc dữ liệu

Viết validator/test kiểm tra:

```text
- Có đúng số pool yêu cầu: 28 nếu full hoặc 16 nếu được yêu cầu MVP.
- Mỗi pool có đúng 3 câu.
- Full catalog có đúng 84 câu gốc.
- Không trùng poolId hoặc question.id.
- direction của question khớp direction của pool.
- vi_to_ko: prompt tiếng Việt, sampleAnswer/acceptedAnswers tiếng Hàn.
- ko_to_vi: prompt tiếng Hàn, sampleAnswer/acceptedAnswers tiếng Việt.
- sampleAnswer không rỗng.
- acceptedAnswers không rỗng và chứa sampleAnswer sau normalize.
- targetGrammar, grammarUsed, vocabularyUsed, explanationVi không rỗng.
- Nếu có hai chiều cùng semanticGroupId, generator không chọn đồng thời trong một đề.
```

### 12.2. Validation kiến thức

1. Parse `part3-translation-scope.json`.
2. `grammarUsed` phải nằm trong allowed grammar keys.
3. `vocabularyUsed` phải nằm trong allowed vocabulary.
4. Không tự động suy luận lemma tiếng Hàn bằng regex đơn giản để thay thế metadata review.
5. Validator dựa vào metadata; người biên soạn vẫn cần duyệt tính tự nhiên của bản dịch.

```ts
function validatePart3Scope(
  question: Part3TranslationQuestion,
  scope: Part3KnowledgeScope,
) {
  const grammarInScope = question.grammarUsed.every(grammar =>
    scope.allowedGrammarKeys.includes(grammar),
  );

  const vocabularyInScope = question.vocabularyUsed.every(vocabulary =>
    scope.allowedVocabulary.includes(vocabulary),
  );

  return { grammarInScope, vocabularyInScope };
}
```

### 12.3. Validation nội dung dịch

Kiểm tra tối thiểu:

```text
- Hướng dịch đúng.
- Prompt và đáp án chuyển tải cùng thông tin chính.
- Không bỏ mất thời gian, địa điểm, số lượng, phủ định hoặc chủ thể nếu có trong prompt.
- Đáp án tiếng Hàn tự nhiên, đúng đuôi câu/cấu trúc đã chọn.
- acceptedAnswers thực sự tương đương nghĩa với sampleAnswer.
- Không thêm accepted answer dùng cấu trúc ngoài phạm vi.
```

---

## 13. Unit tests cần có

Viết test đảm bảo:

```text
- Validate catalog/pool/question structure với dữ liệu hợp lệ.
- Reject câu có grammarUsed ngoài Part 3 scope.
- Reject câu có vocabularyUsed ngoài Part 3 scope.
- Script generate đúng số mã đề theo config.
- Mỗi mã đề có đúng 8 câu.
- Mỗi mã đề có đúng 4 câu vi_to_ko và 4 câu ko_to_vi.
- Không có hai câu cùng poolId trong một mã đề.
- Không có hai câu cùng semanticGroupId trong một mã đề.
- Không lấy câu validation false.
- Logic chọn câu ưu tiên selectedCount thấp hơn.
- Overlap giữa các mã đề không vượt config nếu dữ liệu đủ.
- Report thống kê đúng số lần từng câu được chọn.
- Khi randomSeed cố định, output generate tái lập được.
- Answer key map đúng questionId/displayOrder với đề tĩnh.
```

Không viết logic/test liên quan đến:

```text
userId
student history
seenCount theo người học
adaptive learning
servedCount runtime
grading tự động bằng exact string match
```

---

## 14. File/module đầu ra mong muốn

Tùy convention của project, triển khai cấu trúc tương đương:

```text
src/
  data/
    korean/
      source/
        part3-translation-scope.json
      pools/
        part3-pool-catalog.ts          // Hoặc .json: catalog 28 pool
        part3-questions.ts             // Hoặc .json: 84 câu gốc
      generated/
        part3-static-exams.json        // Các mã đề tĩnh Part 3
        part3-static-answer-keys.json  // Đáp án tham khảo
        part3-static-exams-report.json // Báo cáo generate
  features/
    quiz/
      part3/
        types.ts
        part3-knowledge-scope.ts
        validate-part3-pools.ts
        generate-static-part3-exams.ts
        generate-static-part3-exams.test.ts
```

Nếu project đã có module chung từ Part 1:

```text
- Reuse seeded random utility.
- Reuse overlap calculator nếu nhận được danh sách questionId.
- Reuse generation report helpers nếu phù hợp.
- Không reuse schema option/correctOptionId của Part 1 cho Part 3.
```

---

## 15. Checklist thực thi cho Codex

### Phase 1 — Khảo sát repository

- [ ] Đọc cấu trúc repository.
- [ ] Xác định Part 1 đã có gì để tái sử dụng.
- [ ] Xác định stack, schema, test convention và data/seed convention.
- [ ] Không sửa phần không liên quan.

### Phase 2 — Scope và types Part 3

- [ ] Tạo `part3-translation-scope.json` từ phạm vi được duyệt trong đặc tả này.
- [ ] Tạo/extend type cho Part 3 translation question.
- [ ] Thêm `semanticGroupId?` để tránh chọn hai câu đảo chiều cùng nội dung.
- [ ] Tách rõ Part 3 khỏi schema trắc nghiệm Part 1.

### Phase 3 — Pool catalog và câu hỏi gốc

- [ ] Tạo catalog 28 pool đầy đủ, mỗi pool `quantity = 3`.
- [ ] Tạo 84 câu gốc Part 3.
- [ ] Mỗi câu có `sampleAnswer`, `acceptedAnswers`, `grammarUsed`, `vocabularyUsed`, `explanationVi`.
- [ ] Không sinh nội dung ngoài scope.
- [ ] Gắn validation metadata ban đầu.
- [ ] Đánh dấu `reviewed: false` nếu chưa được người biên soạn duyệt thủ công.

### Phase 4 — Validation

- [ ] Validate cấu trúc catalog.
- [ ] Validate grammar/vocabulary theo Part 3 scope.
- [ ] Validate hướng dịch.
- [ ] Validate đáp án mẫu/accepted answers.
- [ ] Validate semantic group nếu có.

### Phase 5 — Sinh mã đề tĩnh

- [ ] Implement generator mã đề Part 3 theo config.
- [ ] Mỗi mã đề đúng 8 câu.
- [ ] Mỗi mã đề đúng 4 câu Việt → Hàn và 4 câu Hàn → Việt.
- [ ] Mỗi pool tối đa 1 câu trong một mã đề.
- [ ] Không chọn hai câu cùng semanticGroupId.
- [ ] Ưu tiên câu có selectedCount thấp hơn trong batch.
- [ ] Chỉ shuffle thứ tự câu trong từng nhóm hướng dịch.
- [ ] Lưu static exams và answer keys.

### Phase 6 — Report và test

- [ ] Xuất generation report.
- [ ] Test direction quota.
- [ ] Test overlap constraint.
- [ ] Test balanced selection.
- [ ] Test deterministic seed.
- [ ] Test answer key mapping.
- [ ] Chạy lint/typecheck/test theo scripts dự án.
- [ ] Tóm tắt file đã tạo/sửa, số pool/câu/mã đề generate và các câu cần manual review.

---

## 16. Không được làm

```text
- Không biến Part 3 thành trắc nghiệm.
- Không thêm options hoặc correctOptionId cho câu dịch tự luận.
- Không chấm sai câu dịch chỉ bằng exact string comparison.
- Không sinh đề runtime theo học viên.
- Không tạo user history, seenCount, servedCount hoặc adaptive selection.
- Không validate Part 3 chỉ dựa trên file scope của Part 1 nếu Part 3 có thêm kiến thức.
- Không dùng grammar/từ vựng ngoài part3-translation-scope.json.
- Không tạo ba câu trong một pool chỉ bằng cách thay tên riêng hoặc một danh từ máy móc.
- Không để một mã đề chứa cùng một thông điệp ở cả hai hướng dịch.
- Không để một câu bị chọn quá nhiều trong batch nếu còn câu cùng pool ít được dùng hơn.
- Không âm thầm bỏ qua lỗi thiếu pool, validation hoặc overlap.
- Không đánh dấu reviewed = true nếu chưa có bước duyệt thực tế.
```

---

## 17. Tiêu chí hoàn thành

Task được xem là hoàn thành khi:

1. Có source scope riêng cho Part 3.
2. Có schema/type phù hợp cho câu tự luận dịch, không dùng option answer của Part 1.
3. Có catalog đầy đủ **28 pool** và dữ liệu **84 câu gốc**, hoặc báo rõ nếu người dùng yêu cầu MVP.
4. Có validator grammar/vocabulary/direction/acceptedAnswers cho Part 3.
5. Có script generate mã đề tĩnh, mỗi đề đúng **8 câu** với quota `4 vi_to_ko + 4 ko_to_vi`.
6. Có cơ chế tránh lấy hai câu đảo chiều cùng nội dung trong một mã đề.
7. Có cơ chế cân bằng `selectedCount` khi generate batch.
8. Có answer key riêng cho mỗi mã đề.
9. Có generation report về coverage, tần suất chọn câu và overlap.
10. Có unit test cho các điều kiện trọng yếu.
11. Không có tracking học viên hoặc sinh đề runtime.
12. Code chạy qua lint/typecheck/test hiện có của repository.
