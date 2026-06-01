# Vocabulary Examples Agent Workflow Plan

## Mục tiêu

Tạo lại ví dụ từ vựng cho toàn bộ dữ liệu Bài 1-8 bằng quy trình có nhiều agent, vì bộ ví dụ hiện tại đạt schema nhưng không đạt chất lượng học thuật.

Vấn đề hiện tại:

- Nhiều câu bị máy móc, đặc biệt kiểu `저는 X를/을 배워요`.
- Một số danh từ bị ép vào ngữ cảnh không tự nhiên.
- Một số `blankKorean` quá ngắn, không đủ ngữ cảnh để luyện câu.
- Ví dụ cần phục vụ người học tiếng Hàn sơ cấp, không chỉ phục vụ validator.

## Nguồn dữ liệu

Các agent chỉ được dùng phạm vi sau:

```text
data/tuvungsocap_1-8.json
data/nguphapsc_1-8.json
data/vocabulary-examples_1-8.json
src/data/korean/generated/vocabulary-games.json
```

Quy tắc phạm vi:

- Ví dụ được phép dùng tất cả từ vựng Bài 1-8.
- Ví dụ chỉ dùng ngữ pháp trong `data/nguphapsc_1-8.json` Bài 1-8.
- Không dùng từ vựng ngoài danh sách nếu không thật sự bắt buộc cho tự nhiên; nếu dùng, phải đánh dấu để main agent review.
- Không thay đổi code app khi worker agent chỉ được giao viết nội dung ví dụ.

## Chia Agent

### Agent 1: Bài 1-2

Phụ trách:

- Giới thiệu bản thân.
- Quốc gia, quốc tịch, nghề nghiệp, người.
- Trường học, lớp học, đồ vật, địa điểm.
- Đại từ, vị trí, tồn tại `있다/없다`.

Yêu cầu:

- Danh từ người dùng câu giới thiệu tự nhiên: `저는 학생입니다.`, `남 씨는 선생님입니다.`
- Địa điểm dùng `에 있습니다/없습니다`.
- Đồ vật dùng `이것/그것/저것`, `이/가`, `은/는`.

### Agent 2: Bài 3-5

Phụ trách:

- Sinh hoạt hằng ngày.
- Động từ cơ bản.
- Tính từ cơ bản.
- Ngày tháng, thứ, giờ, lịch trình.
- Học tập, làm việc, thi, bài tập.

Yêu cầu:

- Động từ dùng câu có tân ngữ/địa điểm/thời gian khi tự nhiên.
- Ngày giờ phải có ngữ cảnh thật: lịch học, họp, thi, thức dậy.
- Không lặp một chủ ngữ duy nhất quá nhiều.

### Agent 3: Bài 6-8

Phụ trách:

- Cuối tuần, sở thích, du lịch, thể thao.
- Mua sắm, giá tiền, cửa hàng.
- Món ăn, đồ uống, vị giác.
- Lượng từ và đơn vị đếm.
- Cụm giao tiếp mua hàng/nhà hàng.

Yêu cầu:

- Lượng từ phải có số lượng + danh từ phù hợp, ví dụ `사과 두 개 주세요.`
- Món ăn/vị giác dùng câu ăn uống tự nhiên.
- Mua sắm dùng hội thoại ngắn hoặc câu giao tiếp thực tế.

### Agent 4: Reviewer

Chỉ audit, không rewrite toàn bộ.

Reviewer phải kiểm tra:

- Câu Hàn có tự nhiên không.
- Dịch Việt có khớp toàn câu không.
- Target word có xuất hiện rõ hoặc ở dạng chia chuẩn không.
- Ngữ pháp có nằm trong Bài 1-8 không.
- `blankKorean` có đủ ngữ cảnh để người học điền không.
- Template có bị lặp quá nhiều không.

Reviewer output:

- Danh sách lỗi theo `id`.
- Lý do lỗi ngắn gọn.
- Gợi ý sửa nếu cần.
- Nhóm lỗi phổ biến để main agent cải thiện rubric/validator.

## Schema Ví Dụ

Mỗi entry trong `data/vocabulary-examples_1-8.json` giữ schema:

```json
{
  "korean": "저는 베트남 사람입니다.",
  "vietnamese": "Tôi là người Việt Nam.",
  "blankKorean": "저는 ______ 사람입니다.",
  "grammarUsed": ["입니다", "은/는"],
  "vocabularyUsed": ["저", "베트남", "사람"]
}
```

Quy tắc field:

- `korean`: câu đầy đủ, tự nhiên, có target.
- `vietnamese`: dịch cả câu, không chỉ dịch target.
- `blankKorean`: thay đúng target hoặc dạng chia của target bằng `______`.
- `grammarUsed`: liệt kê grammar chính, không cần liệt kê mọi tiểu tiết.
- `vocabularyUsed`: liệt kê từ gốc/cụm nguồn trong danh sách, không liệt kê hậu tố sau chia.

## Quality Rubric

Ví dụ đạt yêu cầu khi:

- Là câu người học có thể dùng hoặc gặp trong đời sống/học tập.
- Không gượng ép nghĩa của target word.
- Không dùng một generic pattern cho nhiều nhóm không liên quan.
- Không quá dài; ưu tiên 1 câu ngắn.
- Dịch Việt tự nhiên, rõ nghĩa, khớp câu Hàn.
- Target word đủ rõ để flashcard và sentence-fill cùng dùng được.

Ví dụ không đạt yêu cầu:

- `저는 국적을 배워요.` cho `국적`.
- `저는 선생님을 배워요.` cho `선생님`.
- `저는 대학교를 배워요.` cho `대학교`.
- `blankKorean` chỉ là `______` khi target không phải cụm giao tiếp hoàn chỉnh.
- Dịch Việt viết thường sai tên riêng như `nước mỹ`, `việt nam`.

## Workflow

1. Main agent xuất danh sách item theo nhóm cho từng worker.
2. Worker agent tạo ví dụ trong phạm vi được giao, chỉ sửa phần examples của nhóm mình.
3. Worker agent tự kiểm tra schema và báo các `id` đã sửa.
4. Main agent gom kết quả vào `data/vocabulary-examples_1-8.json`.
5. Reviewer agent audit toàn bộ file examples.
6. Main agent sửa lỗi reviewer nêu, hoặc giao lại đúng nhóm worker nếu lỗi nhiều.
7. Chỉ khi audit đạt mới regenerate `src/data/korean/generated/vocabulary-games.json`.

## Validation Bắt Buộc

Giữ validator hiện có:

```text
node src/features/vocabulary/build-vocabulary-games.test.js
```

Thêm audit/report riêng trước khi regenerate:

- Template frequency theo prefix/suffix câu.
- Số câu chứa `배워요`.
- Số câu có `blankKorean === "______"`.
- Số câu có target không xuất hiện trong `korean`.
- Số câu có `vocabularyUsed` ngoài scope.
- Top 20 sentence patterns lặp nhiều nhất.

Ngưỡng đề xuất:

- Không pattern nào được chiếm quá 5% toàn bộ examples.
- `배워요` chỉ được dùng khi target thật sự là nội dung học tập.
- `blankKorean === "______"` chỉ dùng cho fixed phrase/exclamation hoàn chỉnh.

## Nguyên Tắc Tích Hợp

- Không sửa `fe_web/vocabulary.js` nếu schema `example` không đổi.
- Không regenerate generated JSON khi reviewer còn lỗi nghiêm trọng.
- Không dùng script template để thay thế việc viết ví dụ.
- Có thể dùng script chỉ để audit, thống kê và kiểm tra schema.
- Không revert các file user đang sửa nếu không liên quan.

## Acceptance Criteria

Hoàn thành rewrite ví dụ khi:

- Đủ 429 item có ví dụ.
- Validator schema pass.
- Reviewer không còn lỗi tự nhiên/ngữ nghĩa nghiêm trọng.
- Báo cáo audit không còn template lặp quá ngưỡng.
- Sentence-fill hiển thị câu đủ ngữ cảnh cho mọi item trong pool.
- Flashcard hiển thị câu Hàn và dịch Việt tự nhiên.

