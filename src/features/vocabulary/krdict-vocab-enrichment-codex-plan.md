# Kế hoạch triển khai: Enrich JSON từ vựng tiếng Hàn bằng KRDICT API

## 1. Mục tiêu

Xây dựng script/tool trong project để đọc file JSON từ vựng tiếng Hàn hiện có, gọi **Korean Basic Dictionary Open API (한국어기초사전 / KRDICT)**, sau đó bổ sung dữ liệu phục vụ flashcard:

- Nghĩa tiếng Việt.
- Từ loại.
- Trình độ từ vựng nếu API có trả về.
- Cách phát âm nếu API có trả về.
- Câu ví dụ tiếng Hàn.
- Bản dịch tiếng Việt cho câu ví dụ.
- Ảnh từ `multimedia_info` nếu KRDICT có ảnh phù hợp.
- Metadata nguồn dữ liệu để biết trường nào lấy từ API, trường nào do agent tự dịch.

### Yêu cầu quan trọng

1. **Không có bản dịch tiếng Việt từ API thì agent Codex phải tự dịch sang tiếng Việt** dựa trên nghĩa/câu tiếng Hàn lấy được.
2. **Không có ảnh thì để `image: null` hoặc giữ trống; không tìm ảnh nguồn khác, không generate ảnh.**
3. Không phá dữ liệu cũ: giữ nguyên thứ tự item và các field hiện có, chỉ bổ sung/cập nhật các field enrichment theo quy tắc ở tài liệu này.
4. Ưu tiên tính đúng nghĩa hơn số lượng dữ liệu được điền, đặc biệt với từ đồng âm/đa nghĩa như `배`, `눈`, `차`, `쓰다`.

---

## 2. API sử dụng

Nguồn chính thức: **Korean Basic Dictionary Open API** của National Institute of Korean Language (국립국어원).

API trả về định dạng XML và cần API key 32 ký tự hex.

### 2.1. Endpoint tìm từ

```http
GET https://krdict.korean.go.kr/api/search
```

Tham số cần dùng:

```txt
key=KRDICT_API_KEY
q=<từ tiếng Hàn UTF-8>
part=word
method=exact
translated=y
trans_lang=7
num=10
```

Trong đó:

- `translated=y`: bật dữ liệu dịch đa ngôn ngữ.
- `trans_lang=7`: chỉ lấy tiếng Việt.
- `method=exact`: hạn chế lấy nhầm mục từ gần giống.
- Response có thể chứa: `target_code`, `word`, `pronunciation`, `word_grade`, `pos`, các `sense`, `trans_word`, `trans_dfn`.

### 2.2. Endpoint lấy nội dung chi tiết

Sau khi chọn đúng `target_code`, gọi:

```http
GET https://krdict.korean.go.kr/api/view
```

Tham số:

```txt
key=KRDICT_API_KEY
method=target_code
q=<target_code>
translated=y
trans_lang=7
```

Response detail có thể chứa:

- `word_info`
- `pronunciation_info`
- `word_grade`
- `sense_info`
- `example_info` với câu ví dụ tiếng Hàn
- `multimedia_info` với `label`, `type`, `link`

### 2.3. Hạn mức và lỗi cần xử lý

Theo tài liệu KRDICT, API có lỗi `010 Daily API Limit Exceeded` khi vượt giới hạn hằng ngày 50.000 calls; các lỗi như `020 Unregistered key`, `100 Incorrect query request`, `108 Invalid trans_lang value` cũng cần báo rõ trong log.

---

## 3. Phạm vi thực hiện

### Làm trong task này

- Tìm file JSON từ vựng nguồn trong repo hiện tại. Nếu có nhiều file, ưu tiên file có cấu trúc danh sách mục từ Hàn–Việt được app đang sử dụng; ghi rõ file đã chọn trong log/README.
- Viết script enrich dữ liệu từ KRDICT.
- Parse XML an toàn.
- Match đúng mục từ và nghĩa.
- Tạo file JSON output enriched, không ghi đè file nguồn trong lần chạy đầu.
- Tự dịch phần tiếng Việt còn thiếu.
- Lấy ảnh nếu KRDICT cung cấp image multimedia phù hợp.
- Tạo báo cáo các mục thành công, thiếu ảnh, agent tự dịch, hoặc cần review thủ công.

### Không làm trong task này

- Không gọi Unsplash, Pixabay, Pexels, Wikimedia hoặc bất kỳ nguồn ảnh bên ngoài nào.
- Không dùng AI để tạo ảnh.
- Không thiết kế UI flashcard.
- Không thay đổi luồng quiz/game hiện tại ngoài việc cập nhật dữ liệu JSON nếu project đã có mapping rõ ràng.
- Không tự động publish dữ liệu nếu còn item bị đánh dấu `needsReview: true`.

---

## 4. Cấu trúc dữ liệu output đề xuất

Codex cần kiểm tra schema thật của file nguồn trước, sau đó map mềm vào cấu trúc project. Nếu chưa có schema enrichment, dùng cấu trúc dưới đây.

```json
{
  "id": "food_001",
  "word": "사과",
  "meaning": "quả táo",
  "partOfSpeech": "명사",
  "level": "초급",
  "pronunciation": "사과",
  "examples": [
    {
      "ko": "저는 사과를 먹습니다.",
      "vi": "Tôi ăn táo.",
      "koSource": "krdict",
      "viSource": "agent_translation"
    }
  ],
  "image": {
    "url": "https://...",
    "label": "...",
    "type": "사진",
    "source": "krdict"
  },
  "dictionarySource": {
    "provider": "krdict",
    "targetCode": "...",
    "matchedSenseOrder": 1,
    "meaningSource": "krdict_vi",
    "retrievedAt": "ISO_DATE_TIME"
  },
  "enrichment": {
    "status": "enriched",
    "needsReview": false,
    "notes": []
  }
}
```

### Khi không có ảnh

Bắt buộc để trống, không fallback nguồn ngoài:

```json
{
  "image": null
}
```

Có thể thêm note:

```json
{
  "enrichment": {
    "notes": ["KRDICT không cung cấp ảnh cho mục từ này"]
  }
}
```

### Khi API không có nghĩa tiếng Việt

Agent tự dịch nghĩa tiếng Hàn sang tiếng Việt và đánh dấu nguồn:

```json
{
  "meaning": "bản dịch tiếng Việt do agent tạo",
  "dictionarySource": {
    "meaningSource": "agent_translation_from_krdict_definition"
  },
  "enrichment": {
    "needsReview": true,
    "notes": ["KRDICT không trả nghĩa tiếng Việt; đã tự dịch từ definition tiếng Hàn"]
  }
}
```

### Khi câu ví dụ không có bản dịch tiếng Việt

KRDICT cung cấp câu ví dụ tiếng Hàn; agent phải dịch từng câu được chọn sang tiếng Việt:

```json
{
  "examples": [
    {
      "ko": "학교에서 한국어를 공부합니다.",
      "vi": "Tôi học tiếng Hàn ở trường.",
      "koSource": "krdict",
      "viSource": "agent_translation"
    }
  ]
}
```

---

## 5. Quy tắc chọn nghĩa và tránh lấy sai mục từ

### 5.1. Match từ

Với mỗi item nguồn:

1. Lấy field chứa từ tiếng Hàn, ví dụ `word`, `korean`, hoặc field tương đương sau khi inspect schema.
2. Gọi `/api/search` với `method=exact`, `translated=y`, `trans_lang=7`.
3. Chỉ xét kết quả có `<word>` trùng chính xác với từ nguồn.
4. Nếu item nguồn đã có nghĩa tiếng Việt, dùng nghĩa hiện có làm hint để chọn sense gần nhất.
5. Nếu từ có nhiều nghĩa mà không thể xác định chắc chắn sense phù hợp, không tự chọn mù; chọn mục khả dĩ nhất nhưng đặt `needsReview: true` và ghi danh sách candidate vào report.

### 5.2. Từ đa nghĩa

Ví dụ:

| Từ | Các nghĩa có thể gặp | Yêu cầu |
|---|---|---|
| `배` | quả lê / bụng / thuyền | Dựa vào nghĩa gốc hoặc topic; không tự lấy sense đầu tiên nếu thiếu ngữ cảnh |
| `눈` | mắt / tuyết | Kiểm tra nghĩa hoặc bài/chủ đề |
| `차` | xe / trà / độ chênh | Bắt buộc review nếu không có meaning hint |
| `쓰다` | viết / đắng / đội / dùng | Dựa vào meaning hoặc sentence context |

### 5.3. Ưu tiên dữ liệu có sẵn

- Nếu JSON nguồn đã có nghĩa tiếng Việt rõ và đúng, **không ghi đè bừa**; dùng nghĩa đó để match sense và chỉ bổ sung metadata.
- Nếu API trả nghĩa Việt khác nhẹ nhưng cùng nghĩa, có thể giữ nghĩa nguồn để thống nhất UI, đồng thời lưu `apiMeaning` nếu schema cho phép.
- Nếu API mâu thuẫn rõ với nghĩa nguồn, đánh dấu review, không âm thầm thay đổi.

---

## 6. Quy tắc xử lý câu ví dụ

### Số lượng câu ví dụ

- Mỗi từ lấy tối đa **2 câu ví dụ** phù hợp nhất để tránh JSON quá nặng.
- Ưu tiên câu ngắn, dễ hiểu, phù hợp người học sơ cấp.
- Nếu chỉ có câu phức tạp, vẫn lưu tối đa 1 câu và đánh dấu `needsReview` nếu nội dung quá cao cấp hoặc khó dùng cho flashcard sơ cấp.

### Dịch câu ví dụ

- Nếu câu ví dụ chỉ có tiếng Hàn, agent dịch sang tiếng Việt tự nhiên, sát nghĩa, không thêm diễn giải ngoài câu.
- Giữ nguyên tên riêng, đơn vị, số liệu nếu có.
- Không dịch máy kiểu literal gây khó hiểu; ưu tiên câu tiếng Việt dễ hiểu cho người học sơ cấp.
- Ghi `viSource: "agent_translation"` cho mọi câu agent tự dịch.

---

## 7. Quy tắc xử lý ảnh

### Chỉ dùng ảnh từ KRDICT

Trong `multimedia_info`, chỉ lưu media làm ảnh khi `type` thể hiện ảnh/hình minh họa phù hợp, ví dụ loại tiếng Hàn tương ứng với ảnh (`사진`) hoặc hình minh họa (`그림`) nếu gặp trong response thực tế.

### Không có ảnh

- Set `image: null`.
- Không tìm nguồn ngoài.
- Không báo lỗi làm fail toàn bộ item.
- Thống kê item thiếu ảnh trong report.

### Có nhiều multimedia

- Ưu tiên ảnh/hình minh họa tĩnh trước video/animation/audio.
- Nếu chỉ có audio hoặc video thì không nhét vào `image`; có thể lưu riêng vào `media`/`audio` nếu schema project hỗ trợ, nhưng không bắt buộc cho task này.

---

## 8. Yêu cầu kỹ thuật cho script

### 8.1. Công nghệ

Codex tự xác định stack hiện tại của repo trước khi code:

- Nếu project dùng TypeScript/Node.js: tạo script TypeScript theo tooling sẵn có.
- Nếu project dùng JavaScript thuần: tạo script Node.js tương ứng.
- Không đưa thêm framework nặng chỉ để chạy một script dữ liệu.

Có thể cần XML parser nhẹ phù hợp dependency policy của repo, ví dụ `fast-xml-parser`, nếu project chưa có parser.

### 8.2. Biến môi trường

Không hardcode API key. Dùng:

```env
KRDICT_API_KEY=your_key_here
```

Bổ sung vào `.env.example` nếu project có file này:

```env
KRDICT_API_KEY=
```

### 8.3. Input và output

Script cần hỗ trợ tham số CLI thay vì hardcode duy nhất một path:

```bash
npm run enrich:vocab -- --input <path-to-input.json> --output <path-to-output.json>
```

Tên output mặc định nếu người chạy không truyền:

```txt
<input-name>.enriched.json
```

Không overwrite input trừ khi có cờ rõ ràng như `--write` và người dùng chủ động chạy.

### 8.4. Cache và retry

- Cache kết quả theo `word + meaningHint` trong một file cache hoặc memory cache trong lần chạy để tránh gọi API trùng lặp.
- Retry tối đa 2 lần với network timeout/rate temporary failure.
- Không retry với lỗi key sai hoặc request sai.
- Có delay hợp lý giữa các request nếu danh sách lớn.

### 8.5. Log/report

Sau khi chạy, tạo file report, ví dụ:

```txt
vocab-enrichment-report.json
```

Schema report gợi ý:

```json
{
  "inputFile": "...",
  "outputFile": "...",
  "summary": {
    "total": 100,
    "enriched": 85,
    "agentTranslatedMeaning": 4,
    "agentTranslatedExamples": 60,
    "withImage": 23,
    "withoutImage": 77,
    "needsReview": 11,
    "failed": 4
  },
  "reviewItems": [
    {
      "word": "배",
      "reason": "Multiple senses; insufficient hint to auto-select"
    }
  ],
  "failedItems": []
}
```

---

## 9. Luồng xử lý chi tiết

```txt
1. Inspect project và xác định schema JSON từ vựng đang dùng.
2. Xác định input file và tạo output path riêng.
3. Load JSON, validate mảng item và field chứa từ tiếng Hàn.
4. Với từng item:
   a. Lấy từ tiếng Hàn + meaning/topic hiện có làm hint.
   b. Search KRDICT exact với bản dịch tiếng Việt.
   c. Chọn candidate/sense phù hợp nhất.
   d. Lấy target_code và gọi view detail.
   e. Merge pronunciation, part of speech, level, examples.
   f. Nếu thiếu meaning tiếng Việt: tự dịch definition tiếng Hàn.
   g. Nếu example chưa có bản dịch Việt: tự dịch câu ví dụ.
   h. Nếu có multimedia ảnh phù hợp: lưu URL ảnh KRDICT.
   i. Nếu không có ảnh: để image null.
   j. Đánh dấu source + review status.
5. Ghi output JSON định dạng đẹp, UTF-8, không escape Hangul/tiếng Việt.
6. Ghi report thống kê và item cần review.
7. Chạy test/smoke check với một nhóm từ đại diện.
```

---

## 10. Test case bắt buộc

Codex cần test ít nhất các trường hợp sau, sử dụng dữ liệu thực tế trong project nếu có; nếu không có, tạo fixture tạm cho test và không đưa fixture vào dữ liệu production.

| Trường hợp | Ví dụ | Kỳ vọng |
|---|---|---|
| Danh từ cơ bản có nghĩa Việt | `사과` | Điền nghĩa/từ loại/ví dụ; ảnh nếu API có |
| Địa điểm | `도서관` | Ví dụ phù hợp; không bắt buộc có ảnh |
| Động từ | `먹다` | Lấy ví dụ và dịch câu Việt |
| Từ đa nghĩa đã có hint | `배` + meaning `quả lê` | Chọn đúng sense quả lê |
| Từ đa nghĩa thiếu hint | `차` | Đánh dấu review nếu không chắc nghĩa |
| Không có ảnh | bất kỳ item không có multimedia ảnh | `image: null`, không gọi nguồn ngoài |
| Không có translation từ API | fixture/mock hoặc item thực tế | Agent tự dịch và đánh dấu source/review |
| API key lỗi | key giả trong test mock | Log lỗi rõ, không tạo dữ liệu giả |

---

## 11. Tiêu chí hoàn thành

Task được xem là hoàn thành khi:

- [ ] Có script enrich chạy được bằng lệnh CLI trong project.
- [ ] API key đọc từ biến môi trường, không xuất hiện trong source code/commit.
- [ ] Script gọi KRDICT search và view đúng tham số cho bản dịch Việt.
- [ ] Output JSON giữ nguyên dữ liệu ban đầu và bổ sung enrichment an toàn.
- [ ] Câu ví dụ tiếng Hàn được lấy từ KRDICT khi có.
- [ ] Câu ví dụ không có tiếng Việt được agent dịch và ghi rõ `viSource`.
- [ ] Nghĩa không có bản dịch Việt được agent dịch và ghi rõ source/review.
- [ ] Ảnh chỉ lấy từ KRDICT; không có ảnh thì `image: null`.
- [ ] Không tự chọn im lặng với từ đa nghĩa không đủ ngữ cảnh; có `needsReview`.
- [ ] Có report thống kê và danh sách item cần review.
- [ ] Có smoke test hoặc test case cho các tình huống quan trọng.
- [ ] Có hướng dẫn chạy ngắn trong README hoặc comment đầu script.

---

## 12. Deliverables Codex cần tạo/cập nhật

Codex tự điều chỉnh đường dẫn theo cấu trúc repo, nhưng cần hoàn thành tương đương các deliverable sau:

```txt
scripts/enrich-vocabulary-with-krdict.ts   # hoặc .js tùy stack repo
.env.example                               # thêm KRDICT_API_KEY nếu có file env mẫu
package.json                               # thêm command enrich:vocab nếu phù hợp
<data-output>.enriched.json                # output chạy thử hoặc output chính theo yêu cầu repo
vocab-enrichment-report.json               # báo cáo chạy enrich
README.md hoặc docs/...                    # hướng dẫn sử dụng ngắn
```

---

## 13. Prompt thực thi ngắn cho Codex

Thực hiện kế hoạch trong file này trên repo hiện tại. Trước khi code, hãy inspect cấu trúc project và file JSON từ vựng đang được app sử dụng để giữ tương thích schema. Dùng KRDICT API làm nguồn dữ liệu duy nhất cho từ điển và ảnh. Lấy bản dịch tiếng Việt bằng `translated=y&trans_lang=7`. Khi API không có nghĩa hoặc câu dịch tiếng Việt, tự dịch sang tiếng Việt và đánh dấu source/review trong output. Khi KRDICT không có ảnh phù hợp, để `image: null`, không gọi nguồn ảnh ngoài và không generate ảnh. Không overwrite file nguồn trong lần chạy đầu; tạo output enriched và report riêng. Đảm bảo có CLI command, env key, xử lý lỗi, từ đa nghĩa, và smoke test.

---

## 14. Tài liệu tham chiếu đã xác minh

- KRDICT Open API documentation: `https://krdict.korean.go.kr/eng/openApi/openApiInfo`
- Search endpoint: `https://krdict.korean.go.kr/api/search`
- Detail endpoint: `https://krdict.korean.go.kr/api/view`
- Official Korean–Vietnamese dictionary UI: `https://krdict.korean.go.kr/vie`

