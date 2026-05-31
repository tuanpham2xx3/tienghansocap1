require("./types");

const TOPIC_OPTIONS = [
  ["NATIONALITY", "국적"],
  ["JOB", "직업"],
  ["SCHOOL", "학교"],
  ["OBJECT", "물건"],
  ["PLACE", "장소"],
  ["DAILY_LIFE", "일상생활"],
  ["HOBBY", "취미"],
  ["DATE_DAY", "날짜와 요일"],
  ["DAILY_SCHEDULE", "하루 일과"],
  ["WEEKEND", "주말"],
  ["SHOPPING", "물건 사기"],
  ["FOOD", "음식"],
  ["TASTE", "맛"],
  ["TIME", "시간"],
];

const TOPIC_MEANINGS = {
  NATIONALITY: "quốc tịch",
  JOB: "nghề nghiệp",
  SCHOOL: "trường học",
  OBJECT: "đồ vật",
  PLACE: "địa điểm",
  DAILY_LIFE: "sinh hoạt hằng ngày",
  HOBBY: "sở thích",
  DATE_DAY: "ngày tháng và thứ",
  DAILY_SCHEDULE: "lịch trình trong ngày",
  WEEKEND: "cuối tuần",
  SHOPPING: "mua đồ",
  FOOD: "món ăn",
  TASTE: "vị giác",
  TIME: "thời gian",
};

function optionId(questionId, index) {
  return `${questionId}_OPT_${String.fromCharCode(65 + index)}`;
}

function makeOptions(questionId, correctText, distractors) {
  return [correctText, ...distractors].map((text, index) => ({
    id: optionId(questionId, index),
    text,
  }));
}

function topicDistractors(targetTopic) {
  return TOPIC_OPTIONS
    .filter(([key]) => key !== targetTopic)
    .slice(0, 3)
    .map(([, label]) => label);
}

function qid(poolId, index) {
  return `${poolId}_Q${String(index + 1).padStart(3, "0")}`;
}

function topicPool(id, targetTopic, label, readings, vocabularyUsed) {
  return {
    id,
    part: 2,
    section: "topic_identification",
    knowledgeTarget: `Chọn chủ đề ${label}`,
    quantity: 3,
    targetTopic,
    questions: readings.map((readingText, index) => {
      const idForQuestion = qid(id, index);
      const options = makeOptions(idForQuestion, label, topicDistractors(targetTopic));
      return {
        id: idForQuestion,
        part: 2,
        section: "topic_identification",
        poolId: id,
        questionType: "choose_topic",
        difficulty: "easy",
        targetTopic,
        readingText,
        options,
        correctOptionId: options[0].id,
        correctValue: label,
        grammarUsed: ["TOPIC_READING", "PRESENT_POLITE"],
        vocabularyUsed: [label, ...vocabularyUsed],
        explanationVi: `Bài đọc nói rõ về ${TOPIC_MEANINGS[targetTopic]}, nên chọn chủ đề này.`,
        validation: {
          grammarInScope: true,
          vocabularyInScope: true,
          singleCorrectAnswer: true,
          reviewed: false,
          topicUnambiguous: true,
        },
      };
    }),
  };
}

function visualPool(id, stimulusType, knowledgeTarget, rows) {
  return {
    id,
    part: 2,
    section: "visual_incorrect_statement",
    knowledgeTarget,
    quantity: 3,
    stimulusType,
    questions: rows.map((row, index) => {
      const idForQuestion = qid(id, index);
      const [stimulus, correctIncorrect, trueStatements, explanationVi, vocabularyUsed] = row;
      const options = makeOptions(idForQuestion, correctIncorrect, trueStatements);
      return {
        id: idForQuestion,
        part: 2,
        section: "visual_incorrect_statement",
        poolId: id,
        questionType: "choose_incorrect_statement",
        difficulty: "medium",
        stimulusType,
        stimulusId: stimulus.id,
        stimulus,
        prompt: "다음 자료를 보고 맞지 않는 것을 고르세요.",
        options,
        correctOptionId: options[0].id,
        correctValue: correctIncorrect,
        grammarUsed: ["VISUAL_READING", "COUNTER_NUMBER"],
        vocabularyUsed,
        explanationVi,
        validation: {
          grammarInScope: true,
          vocabularyInScope: true,
          singleCorrectAnswer: true,
          reviewed: false,
          stimulusConsistent: true,
        },
      };
    }),
  };
}

function passagePool(id, readingFocus, knowledgeTarget, rows) {
  return {
    id,
    part: 2,
    section: "passage_correct_statement",
    knowledgeTarget,
    quantity: 3,
    readingFocus,
    questions: rows.map((row, index) => {
      const idForQuestion = qid(id, index);
      const [readingText, correctStatement, distractors, explanationVi, grammarUsed, vocabularyUsed] = row;
      const options = makeOptions(idForQuestion, correctStatement, distractors);
      return {
        id: idForQuestion,
        part: 2,
        section: "passage_correct_statement",
        poolId: id,
        questionType: "choose_correct_statement",
        difficulty: "medium",
        readingFocus,
        readingText,
        options,
        correctOptionId: options[0].id,
        correctValue: correctStatement,
        grammarUsed,
        vocabularyUsed,
        explanationVi,
        validation: {
          grammarInScope: true,
          vocabularyInScope: true,
          singleCorrectAnswer: true,
          reviewed: false,
          passageConsistent: true,
        },
      };
    }),
  };
}

const TOPIC_POOLS = [
  topicPool("P2_T1_TOPIC_NATIONALITY", "NATIONALITY", "국적", [
    "저는 베트남 사람입니다. 민수 씨는 한국 사람입니다.",
    "마리아 씨는 미국 사람입니다. 왕 씨는 중국 사람입니다.",
    "저는 일본 사람이 아닙니다. 저는 베트남 사람입니다.",
  ], ["베트남", "한국", "미국", "일본", "중국"]),
  topicPool("P2_T1_TOPIC_JOB", "JOB", "직업", [
    "제 아버지는 선생님입니다. 어머니는 약사입니다.",
    "저는 학생입니다. 형은 회사원입니다.",
    "민수 씨는 은행원입니다. 흐엉 씨는 학생입니다.",
  ], ["선생님", "학생", "약사", "회사원"]),
  topicPool("P2_T1_TOPIC_SCHOOL", "SCHOOL", "학교", [
    "학교에 도서관이 있습니다. 교실도 많습니다.",
    "강의실은 3층에 있습니다. 학생 식당은 1층에 있습니다.",
    "저는 학교에서 한국어를 공부합니다. 도서관에서 책을 읽습니다.",
  ], ["학교", "교실", "도서관", "강의실"]),
  topicPool("P2_T1_TOPIC_OBJECT", "OBJECT", "물건", [
    "책상 위에 사전이 있습니다. 가방 안에 펜이 있습니다.",
    "이것은 시계입니다. 저것은 책입니다.",
    "가방이 큽니다. 펜하고 사전이 가방 안에 있습니다.",
  ], ["책", "사전", "가방", "펜", "시계"]),
  topicPool("P2_T1_TOPIC_PLACE", "PLACE", "장소", [
    "은행은 우체국 옆에 있습니다. 병원은 식당 뒤에 있습니다.",
    "공원에서 산책합니다. 식당에서 밥을 먹습니다.",
    "여기는 병원입니다. 저기는 은행입니다.",
  ], ["은행", "우체국", "식당", "병원", "공원"]),
  topicPool("P2_T1_TOPIC_DAILY_LIFE", "DAILY_LIFE", "일상생활", [
    "저는 아침에 밥을 먹습니다. 커피도 마십니다.",
    "동생은 신문을 읽습니다. 밤에는 일찍 잡니다.",
    "저는 방을 청소합니다. 그리고 책을 읽습니다.",
  ], ["먹다", "마시다", "읽다", "자다", "청소하다"]),
  topicPool("P2_T1_TOPIC_HOBBY", "HOBBY", "취미", [
    "저는 영화를 좋아해요. 동생은 축구를 좋아해요.",
    "친구는 음악을 자주 들어요. 저는 낚시를 좋아해요.",
    "주말에 배구를 해요. 영화도 자주 봐요.",
  ], ["영화", "음악", "축구", "낚시", "배구"]),
  topicPool("P2_T1_TOPIC_DATE_DAY", "DATE_DAY", "날짜와 요일", [
    "오늘은 월요일입니다. 내일은 화요일입니다.",
    "생일 파티는 오월 오일입니다. 그날은 토요일입니다.",
    "시험은 일요일에 있습니다. 회의는 월요일에 있습니다.",
  ], ["월요일", "화요일", "토요일", "일요일", "오월"]),
  topicPool("P2_T1_TOPIC_DAILY_SCHEDULE", "DAILY_SCHEDULE", "하루 일과", [
    "저는 아침 7시에 일어납니다. 8시에 회사에 갑니다.",
    "오후 6시에 퇴근합니다. 저녁에 방을 청소합니다.",
    "아침에 출근합니다. 오후에 회의합니다.",
  ], ["아침", "오후", "출근하다", "퇴근하다", "일어나다"]),
  topicPool("P2_T1_TOPIC_WEEKEND", "WEEKEND", "주말", [
    "주말에 친구하고 여행합니다. 바다에서 쉽니다.",
    "토요일에 등산합니다. 일요일에는 수영합니다.",
    "주말에 공원에서 산책합니다. 친구도 만납니다.",
  ], ["주말", "여행하다", "등산하다", "수영하다", "산책하다"]),
  topicPool("P2_T1_TOPIC_SHOPPING", "SHOPPING", "물건 사기", [
    "마트에서 과자를 삽니다. 주스도 두 개 삽니다.",
    "소설책 한 권 주세요. 모두 만 원입니다.",
    "이거 얼마예요? 너무 비싸요. 깎아 주세요.",
  ], ["마트", "과자", "주스", "소설책", "원"]),
  topicPool("P2_T1_TOPIC_FOOD", "FOOD", "음식", [
    "식당에서 김치찌개를 먹습니다. 비빔밥도 주문합니다.",
    "냉면하고 라면이 있습니다. 콜라도 있습니다.",
    "저는 한국 음식을 좋아합니다. 오늘은 비빔밥을 먹습니다.",
  ], ["김치찌개", "비빔밥", "냉면", "라면", "콜라"]),
  topicPool("P2_T1_TOPIC_TASTE", "TASTE", "맛", [
    "김치찌개가 맛있지만 매워요. 콜라는 달아요.",
    "라면이 짜요. 김치는 매워요.",
    "이 음식은 싱거워요. 저 음식은 맛있어요.",
  ], ["맛있다", "맵다", "달다", "짜다", "싱겁다"]),
  topicPool("P2_T1_TOPIC_TIME", "TIME", "시간", [
    "수업은 오전 9시에 시작합니다. 오후 5시에 끝납니다.",
    "지금은 저녁 8시 30분입니다.",
    "회의는 오후 2시에 있습니다. 시험은 오전 10시에 있습니다.",
  ], ["시", "분", "오전", "오후", "저녁"]),
];

function stimulus(id, type, title, structuredData, fallbackText) {
  return { id, type, title, structuredData, fallbackText };
}

const VISUAL_POOLS = [
  visualPool("P2_T2_RECEIPT", "receipt", "Ngày mua, món đồ, số lượng, giá, tổng tiền", [
    [stimulus("P2_T2_RECEIPT_Q001_STIMULUS", "receipt", "영수증", { date: "2009/08/02", time: "09:30", items: [{ name: "우유", quantity: 2, unit: "개", lineTotal: 1800 }, { name: "과자", quantity: 1, unit: "개", lineTotal: 1200 }], grandTotal: 3000, currency: "원" }, "영수증\n2009/08/02 09:30\n우유 x 2 1,800원\n과자 x 1 1,200원\n합계 3,000원"), "우유는 한 개 샀습니다.", ["과자는 한 개 샀습니다.", "합계는 3,000원입니다.", "시간은 09:30입니다."], "Biên lai ghi sữa mua hai hộp, nên phát biểu mua một hộp sữa là sai.", ["영수증", "과자", "원", "합계"]],
    [stimulus("P2_T2_RECEIPT_Q002_STIMULUS", "receipt", "영수증", { date: "2010/05/10", time: "14:20", items: [{ name: "주스", quantity: 2, unit: "개", lineTotal: 2000 }, { name: "과자", quantity: 2, unit: "개", lineTotal: 3000 }], grandTotal: 5000, currency: "원" }, "영수증\n2010/05/10 14:20\n주스 x 2 2,000원\n과자 x 2 3,000원\n합계 5,000원"), "합계는 3,000원입니다.", ["주스는 두 개 샀습니다.", "과자는 두 개 샀습니다.", "시간은 14:20입니다."], "Tổng tiền là 5.000 won, không phải 3.000 won.", ["영수증", "주스", "과자", "원", "합계"]],
    [stimulus("P2_T2_RECEIPT_Q003_STIMULUS", "receipt", "영수증", { date: "2011/07/03", time: "18:10", items: [{ name: "콜라", quantity: 1, unit: "개", lineTotal: 1000 }, { name: "라면", quantity: 2, unit: "개", lineTotal: 2400 }], grandTotal: 3400, currency: "원" }, "영수증\n2011/07/03 18:10\n콜라 x 1 1,000원\n라면 x 2 2,400원\n합계 3,400원"), "라면은 한 개 샀습니다.", ["콜라는 한 개 샀습니다.", "합계는 3,400원입니다.", "시간은 18:10입니다."], "Biên lai ghi mì mua hai gói, nên phát biểu mua một gói mì là sai.", ["영수증", "콜라", "라면", "원", "합계"]],
  ]),
  visualPool("P2_T2_CARD", "card", "Người gửi/nhận, dịp, quà tặng, lời nhắn", [
    [stimulus("P2_T2_CARD_Q001_STIMULUS", "card", "생일 카드", { sender: "민수", receiver: "흐엉", occasion: "생일", gift: "시계", message: "생일 축하해요." }, "흐엉 씨에게\n생일 축하해요. 시계를 준비했어요.\n민수"), "선물은 가방입니다.", ["민수가 카드를 썼습니다.", "흐엉 씨 생일 카드입니다.", "선물은 시계입니다."], "Quà tặng là đồng hồ, nên phát biểu quà là cặp/túi là sai.", ["카드", "생일", "시계"]],
    [stimulus("P2_T2_CARD_Q002_STIMULUS", "card", "카드", { sender: "남", receiver: "친구", occasion: "생일", gift: "책", message: "생일 축하합니다." }, "친구에게\n생일 축하합니다. 책을 샀어요.\n남"), "카드를 받은 사람은 남 씨입니다.", ["남 씨가 카드를 썼습니다.", "친구에게 쓴 카드입니다.", "선물은 책입니다."], "Người nhận thiệp là bạn, không phải Nam.", ["카드", "생일", "책", "친구"]],
    [stimulus("P2_T2_CARD_Q003_STIMULUS", "card", "생일 카드", { sender: "어머니", receiver: "아버지", occasion: "생일", gift: "펜", message: "생일 축하해요." }, "아버지에게\n생일 축하해요. 펜을 준비했어요.\n어머니"), "어머니가 가방을 준비했습니다.", ["아버지에게 쓴 카드입니다.", "생일 카드입니다.", "선물은 펜입니다."], "Món quà được chuẩn bị là bút, không phải cặp/túi.", ["카드", "생일", "펜"]],
  ]),
  visualPool("P2_T2_MENU", "menu", "Tên món, giá, số lượng/gọi món", [
    [stimulus("P2_T2_MENU_Q001_STIMULUS", "menu", "메뉴", { restaurantName: "한국 식당", items: [{ name: "김치찌개", price: 6000 }, { name: "비빔밥", price: 7000 }, { name: "콜라", price: 1000 }], currency: "원" }, "메뉴\n김치찌개 6,000원\n비빔밥 7,000원\n콜라 1,000원"), "비빔밥은 6,000원입니다.", ["김치찌개는 6,000원입니다.", "콜라는 1,000원입니다.", "비빔밥이 제일 비쌉니다."], "Giá cơm trộn là 7.000 won, không phải 6.000 won.", ["메뉴", "김치찌개", "비빔밥", "콜라", "원"]],
    [stimulus("P2_T2_MENU_Q002_STIMULUS", "menu", "메뉴", { restaurantName: "분식집", items: [{ name: "라면", price: 4000 }, { name: "냉면", price: 5500 }, { name: "주스", price: 1500 }], currency: "원" }, "메뉴\n라면 4,000원\n냉면 5,500원\n주스 1,500원"), "주스는 5,500원입니다.", ["라면은 4,000원입니다.", "냉면은 5,500원입니다.", "주스가 제일 쌉니다."], "Giá nước ép là 1.500 won, không phải 5.500 won.", ["메뉴", "라면", "냉면", "주스", "원"]],
    [stimulus("P2_T2_MENU_Q003_STIMULUS", "menu", "메뉴", { restaurantName: "식당", items: [{ name: "비빔밥", price: 8000 }, { name: "김치찌개", price: 7000 }, { name: "콜라", price: 1200 }], currency: "원" }, "메뉴\n비빔밥 8,000원\n김치찌개 7,000원\n콜라 1,200원"), "김치찌개는 8,000원입니다.", ["비빔밥은 8,000원입니다.", "콜라는 1,200원입니다.", "김치찌개는 7,000원입니다."], "Giá canh kim chi là 7.000 won, không phải 8.000 won.", ["메뉴", "비빔밥", "김치찌개", "콜라", "원"]],
  ]),
  visualPool("P2_T2_SCHEDULE", "schedule", "Thứ, ngày, giờ, hoạt động, địa điểm", [
    [stimulus("P2_T2_SCHEDULE_Q001_STIMULUS", "schedule", "일정", { date: "5월 5일", day: "토요일", time: "오후 3시", activity: "생일 파티", place: "식당" }, "일정\n5월 5일 토요일 오후 3시\n생일 파티 / 식당"), "파티는 도서관에서 합니다.", ["파티는 토요일에 합니다.", "시간은 오후 3시입니다.", "장소는 식당입니다."], "Địa điểm tổ chức tiệc là nhà hàng, không phải thư viện.", ["일정", "생일", "파티", "식당", "오후", "시"]],
    [stimulus("P2_T2_SCHEDULE_Q002_STIMULUS", "schedule", "일정", { date: "6월 2일", day: "월요일", time: "오전 10시", activity: "시험", place: "교실" }, "일정\n6월 2일 월요일 오전 10시\n시험 / 교실"), "시험은 오후 10시에 있습니다.", ["시험은 월요일에 있습니다.", "장소는 교실입니다.", "시간은 오전 10시입니다."], "Thời gian thi là 10 giờ sáng, không phải 10 giờ chiều.", ["일정", "시험", "교실", "오전", "시"]],
    [stimulus("P2_T2_SCHEDULE_Q003_STIMULUS", "schedule", "일정", { date: "7월 1일", day: "화요일", time: "오후 2시", activity: "회의", place: "도서관" }, "일정\n7월 1일 화요일 오후 2시\n회의 / 도서관"), "회의는 병원에서 합니다.", ["회의는 화요일에 합니다.", "시간은 오후 2시입니다.", "장소는 도서관입니다."], "Địa điểm họp là thư viện, không phải bệnh viện.", ["일정", "회의", "도서관", "오후", "시"]],
  ]),
  visualPool("P2_T2_NOTICE", "notice", "Sự kiện, thời gian, nơi diễn ra", [
    [stimulus("P2_T2_NOTICE_Q001_STIMULUS", "notice", "공지", { event: "한국어 파티", date: "금요일", time: "오후 6시", place: "교실", note: "친구와 같이 오세요." }, "공지\n한국어 파티\n금요일 오후 6시 / 교실\n친구와 같이 오세요."), "파티는 식당에서 합니다.", ["파티는 금요일에 합니다.", "시간은 오후 6시입니다.", "장소는 교실입니다."], "Địa điểm bữa tiệc là phòng học, không phải nhà hàng.", ["공지", "한국어", "파티", "오후", "시", "교실"]],
    [stimulus("P2_T2_NOTICE_Q002_STIMULUS", "notice", "공지", { event: "시험", date: "월요일", time: "오전 9시", place: "강의실", note: "펜을 가져오세요." }, "공지\n시험\n월요일 오전 9시 / 강의실\n펜을 가져오세요."), "시험은 오후 9시에 있습니다.", ["시험은 월요일에 있습니다.", "장소는 강의실입니다.", "펜이 필요합니다."], "Thời gian thi là 9 giờ sáng, không phải 9 giờ tối.", ["공지", "시험", "강의실", "펜", "오전", "시"]],
    [stimulus("P2_T2_NOTICE_Q003_STIMULUS", "notice", "공지", { event: "회의", date: "화요일", time: "오후 4시", place: "도서관", note: "책을 가져오세요." }, "공지\n회의\n화요일 오후 4시 / 도서관\n책을 가져오세요."), "회의는 월요일에 있습니다.", ["회의는 화요일에 있습니다.", "시간은 오후 4시입니다.", "장소는 도서관입니다."], "Buổi họp diễn ra vào thứ Ba, không phải thứ Hai.", ["공지", "회의", "도서관", "책", "오후", "시"]],
  ]),
];

const PASSAGE_POOLS = [
  passagePool("P2_T3_PROFILE_LANGUAGE", "profile_language", "Cá nhân, nơi sống, ngôn ngữ/giao tiếp", [
    ["제인 씨는 지금 한국에 삽니다. 작년까지 영국의 대학교에서 한국어를 공부했습니다. 제인 씨는 한국 사람들하고 한국어로 이야기합니다.", "제인 씨는 한국어를 할 수 있습니다.", ["제인 씨는 지금 영국에 있습니다.", "제인 씨는 작년까지 한국에 살았습니다.", "제인 씨는 한국에서 대학교에 다녔습니다."], "Đoạn nói Jane học và dùng tiếng Hàn.", ["PASSAGE_READING", "PAST_TENSE"], ["한국", "한국어"]],
    ["남 씨는 베트남 사람입니다. 지금 한국에서 한국어를 공부합니다. 친구하고 한국어로 이야기합니다.", "남 씨는 한국어를 공부합니다.", ["남 씨는 중국 사람입니다.", "남 씨는 지금 베트남에 있습니다.", "남 씨는 한국어를 좋아하지 않습니다."], "Thông tin đúng là Nam đang học tiếng Hàn.", ["PASSAGE_READING", "PRESENT_POLITE"], ["베트남", "한국", "한국어", "친구"]],
    ["흐엉 씨는 미국 사람이 아닙니다. 베트남 사람입니다. 한국어와 베트남어를 좋아합니다.", "흐엉 씨는 베트남 사람입니다.", ["흐엉 씨는 미국 사람입니다.", "흐엉 씨는 일본어를 좋아합니다.", "흐엉 씨는 한국어를 싫어합니다."], "Quốc tịch đúng là Việt Nam.", ["PASSAGE_READING", "NEGATION"], ["미국", "베트남", "한국어"]],
  ]),
  passagePool("P2_T3_CLASS_ACTIVITY", "class_activity", "Lớp học, hoạt động, cảm nhận", [
    ["저는 월요일에 한국어 수업이 있습니다. 수업은 오후 5시에 끝납니다. 한국어 수업은 재미있습니다.", "한국어 수업은 오후 5시에 끝납니다.", ["수업은 오전 5시에 시작합니다.", "수업은 화요일에 있습니다.", "한국어 수업은 재미없습니다."], "Đoạn văn cho biết lớp tiếng Hàn kết thúc lúc 5 giờ chiều.", ["PASSAGE_READING", "TIME_EXPRESSION"], ["월요일", "한국어", "수업", "오후", "시"]],
    ["학생들은 교실에서 한국어를 공부합니다. 선생님은 질문합니다. 학생들은 대답합니다.", "학생들은 교실에서 공부합니다.", ["학생들은 식당에서 공부합니다.", "선생님은 영화를 봅니다.", "학생들은 대답하지 않습니다."], "Địa điểm học là phòng học.", ["PASSAGE_READING", "ACTION_LOCATION"], ["학생", "교실", "한국어", "선생님"]],
    ["오늘 수업은 쉽습니다. 학생들은 책을 읽고 한국어를 씁니다. 수업 후에 도서관에 갑니다.", "학생들은 책을 읽습니다.", ["오늘 수업은 어렵습니다.", "학생들은 병원에 갑니다.", "학생들은 축구를 합니다."], "Đoạn nói học sinh đọc sách.", ["PASSAGE_READING", "CONNECTOR"], ["오늘", "수업", "학생", "책", "도서관"]],
  ]),
  passagePool("P2_T3_GIFT_PLAN", "gift_plan", "Sinh nhật, chuẩn bị quà, kế hoạch tặng", [
    ["이번 주 토요일은 친구 생일입니다. 저는 시계를 샀습니다. 생일 파티는 식당에서 합니다.", "생일 파티는 식당에서 합니다.", ["생일 파티는 병원에서 합니다.", "저는 가방을 샀습니다.", "파티는 월요일입니다."], "Địa điểm tổ chức tiệc sinh nhật là nhà hàng.", ["PASSAGE_READING", "PAST_TENSE"], ["토요일", "친구", "생일", "시계", "식당"]],
    ["내일은 어머니 생일입니다. 저는 펜을 준비했습니다. 저녁에 집에서 드립니다.", "저는 펜을 준비했습니다.", ["저는 과자를 준비했습니다.", "생일은 오늘입니다.", "저녁에 학교에서 드립니다."], "Món quà được chuẩn bị là bút.", ["PASSAGE_READING", "PAST_TENSE", "TIME_EXPRESSION"], ["어머니", "생일", "펜", "저녁", "집"]],
    ["민수 씨 생일은 오월 오일입니다. 친구들은 책을 샀습니다. 파티는 오후 6시에 있습니다.", "파티는 오후 6시에 있습니다.", ["파티는 오전 6시에 있습니다.", "친구들은 시계를 샀습니다.", "생일은 칠월 칠일입니다."], "Thời gian tổ chức tiệc là 6 giờ chiều.", ["PASSAGE_READING", "TIME_EXPRESSION"], ["생일", "오월", "친구", "책", "오후", "시"]],
  ]),
  passagePool("P2_T3_DAILY_SCHEDULE", "daily_schedule", "Lịch trình hằng ngày", [
    ["저는 아침 7시에 일어납니다. 8시에 회사에 갑니다. 저녁 6시에 집에 옵니다.", "저는 아침 7시에 일어납니다.", ["저는 아침 8시에 일어납니다.", "저는 병원에 갑니다.", "저는 저녁 6시에 회사에 갑니다."], "Đoạn ghi thức dậy lúc 7 giờ.", ["PASSAGE_READING", "TIME_EXPRESSION"], ["아침", "시", "회사", "저녁"]],
    ["민수 씨는 오전에 출근합니다. 오후에 회의합니다. 밤에는 책을 읽습니다.", "민수 씨는 오후에 회의합니다.", ["민수 씨는 밤에 출근합니다.", "민수 씨는 오전에 책을 읽습니다.", "민수 씨는 오후에 운동합니다."], "Hoạt động buổi chiều là họp.", ["PASSAGE_READING", "TIME_EXPRESSION"], ["오전", "출근하다", "오후", "회의", "책"]],
    ["저는 점심에 밥을 먹습니다. 오후에는 커피를 마십니다. 저녁에는 방을 청소합니다.", "저는 저녁에 방을 청소합니다.", ["저는 아침에 방을 청소합니다.", "저는 오후에 밥을 먹습니다.", "저는 저녁에 커피를 마십니다."], "Hoạt động buổi tối là dọn phòng.", ["PASSAGE_READING", "TIME_EXPRESSION"], ["밥", "오후", "저녁", "청소하다"]],
  ]),
  passagePool("P2_T3_WEEKEND_ACTIVITY", "weekend_activity", "Hoạt động cuối tuần/quá khứ", [
    ["지난주 주말에 친구하고 등산했습니다. 날씨가 좋았습니다. 저녁에는 김밥을 먹었습니다.", "지난주 주말에 등산했습니다.", ["지난주 주말에 수영했습니다.", "날씨가 나빴습니다.", "아침에 김밥을 먹었습니다."], "Hoạt động cuối tuần là leo núi.", ["PASSAGE_READING", "PAST_TENSE"], ["지난주", "주말", "친구", "등산하다", "저녁"]],
    ["토요일에 가족하고 바다에 갔습니다. 바다에서 쉬었습니다. 일요일에는 집에 있었습니다.", "토요일에 바다에 갔습니다.", ["일요일에 바다에 갔습니다.", "토요일에 병원에 갔습니다.", "일요일에는 학교에 있었습니다."], "Thứ bảy đi biển.", ["PASSAGE_READING", "PAST_TENSE"], ["토요일", "가족", "일요일", "집"]],
    ["주말에 저는 공원에서 산책했습니다. 친구는 축구를 했습니다. 우리는 저녁에 만났습니다.", "저는 공원에서 산책했습니다.", ["저는 도서관에서 공부했습니다.", "친구는 배구를 했습니다.", "우리는 아침에 만났습니다."], "Người nói đi dạo ở công viên.", ["PASSAGE_READING", "PAST_TENSE", "ACTION_LOCATION"], ["주말", "공원", "산책하다", "친구", "축구", "저녁"]],
  ]),
  passagePool("P2_T3_SHOPPING_FOOD", "shopping_food", "Mua hàng/đồ ăn/số lượng", [
    ["저는 마트에서 과자 두 개와 주스 한 개를 샀습니다. 모두 5,000원입니다.", "저는 주스 한 개를 샀습니다.", ["저는 과자 한 개를 샀습니다.", "모두 3,000원입니다.", "저는 식당에서 샀습니다."], "Đoạn văn cho biết người nói mua một chai nước ép.", ["PASSAGE_READING", "COUNTER_NUMBER"], ["마트", "과자", "주스", "개", "원"]],
    ["식당에서 비빔밥을 먹었습니다. 김치찌개도 주문했습니다. 음식이 맛있었습니다.", "음식이 맛있었습니다.", ["음식이 매웠습니다.", "냉면을 주문했습니다.", "집에서 먹었습니다."], "Đoạn nói món ăn ngon.", ["PASSAGE_READING", "PAST_TENSE"], ["식당", "비빔밥", "김치찌개", "음식", "맛있다"]],
    ["저는 소설책 한 권을 샀습니다. 친구는 콜라 두 개를 샀습니다. 모두 만 원입니다.", "친구는 콜라 두 개를 샀습니다.", ["저는 콜라 두 개를 샀습니다.", "친구는 책 한 권을 샀습니다.", "모두 천 원입니다."], "Thông tin đúng là bạn mua hai cola.", ["PASSAGE_READING", "COUNTER_NUMBER"], ["소설책", "콜라", "개", "원", "친구"]],
  ]),
];

const PART2_POOLS = [...TOPIC_POOLS, ...VISUAL_POOLS, ...PASSAGE_POOLS];

function buildPart2Pools() {
  return PART2_POOLS;
}

function buildPart2Questions() {
  return PART2_POOLS.flatMap(pool => pool.questions);
}

function buildPart2Stimuli() {
  return PART2_POOLS
    .flatMap(pool => pool.questions)
    .filter(question => question.section === "visual_incorrect_statement")
    .map(question => question.stimulus);
}

module.exports = {
  buildPart2Pools,
  buildPart2Questions,
  buildPart2Stimuli,
};
