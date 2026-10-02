/**
 * QMF Unified Header — global Quizzman navigation
 *
 * Top nav discovers platform capabilities.
 * Each application's sidebar owns in-app navigation.
 */

(function() {
  'use strict';

  const VERSION = '3.10.24';
  const CDN_BASE = 'https://ui.quizzman.com/qmf/dist/modules/header';
  /* Same origin path as CDN_BASE — avoid dual modules/ vs modules-v3/ caches */
  const CDN_NAV_BASE = CDN_BASE;
  const JOIN_OVERLAY_BASE = 'https://ui.quizzman.com/qmf/dist/modules/join-overlay';

  const JOIN_OVERLAY_VERSION = '1.0.5';

/* generated — header chrome strings */
const HEADER_I18N = {
  "vi": {
    "nav.home": "Trang chủ",
    "nav.app": "Ứng dụng",
    "nav.knowledge": "Tri thức",
    "nav.learn": "Học",
    "nav.game": "Trò chơi",
    "group.platform": "Nền tảng",
    "group.create": "Tạo & khám phá",
    "search.placeholder": "Tìm app, tri thức…",
    "search.aria": "Tìm app, wiki, docs, quiz…",
    "search.open": "Tìm kiếm",
    "search.close": "Đóng tìm kiếm",
    "search.sr": "Tìm Quizzman",
    "search.loading": "Đang tìm…",
    "search.empty": "Không có kết quả",
    "search.apps": "Ứng dụng",
    "search.results": "Kết quả",
    "search.viewAll": "Xem tất cả trên Search",
    "join": "Vào Quiz",
    "join.error": "Không mở được Join Quiz",
    "notify": "Thông báo",
    "menu.open": "Mở menu điều hướng",
    "menu.close": "Đóng menu",
    "nav.aria": "Điều hướng Quizzman",
    "item.mentis": "Mentis",
    "desc.mentis": "Trợ lý AI",
    "item.lms": "LMS",
    "desc.lms": "Hệ thống quản lý học tập",
    "item.classroom": "Class",
    "desc.classroom": "Lớp học và nhóm học",
    "item.slide-studio": "Slide Studio",
    "desc.slide-studio": "Soạn bài trình chiếu",
    "item.lab": "Insight",
    "desc.lab": "Thí nghiệm và công cụ",
    "item.app-platform": "Nền tảng App",
    "desc.app-platform": "Tất cả ứng dụng Quizzman",
    "item.quiz-editor": "Quiz Editor",
    "desc.quiz-editor": "Tạo quiz tương tác",
    "item.assignment": "Bài giao",
    "desc.assignment": "Tạo và quản lý bài giao",
    "item.iching": "I-Ching",
    "desc.iching": "Gieo quẻ Kinh Dịch",
    "item.calendar": "Calendar",
    "desc.calendar": "Công cụ lịch",
    "item.astro": "Astro",
    "desc.astro": "Thiên văn & bầu trời",
    "item.zodiac-sign": "Cung Hoàng Đạo",
    "desc.zodiac-sign": "12 cung hoàng đạo · Chiêm tinh phương Tây",
    "item.tarot": "Bói Tarot",
    "desc.tarot": "Bói bài Tarot Rider–Waite",
    "item.vedic": "Vedic",
    "desc.vedic": "Chiêm tinh Ấn Độ (Jyotiṣa)",
    "item.mandarin": "Mandarin",
    "desc.mandarin": "Học tiếng Trung",
    "item.wiki": "Wiki",
    "desc.wiki": "Kho tri thức",
    "item.dictionary": "Từ điển",
    "desc.dictionary": "Từ điển Hán Nôm",
    "item.docs": "Tài liệu",
    "desc.docs": "Tài liệu nền tảng",
    "item.ai-knowledge": "AI Knowledge",
    "desc.ai-knowledge": "Hỏi Mentis mọi thứ",
    "item.search": "Tìm kiếm",
    "desc.search": "Tìm trên Quizzman",
    "item.live-quiz": "Quiz trực tiếp",
    "desc.live-quiz": "Quiz lớp học realtime",
    "item.present": "Present",
    "desc.present": "Trình chiếu tương tác",
    "item.homework": "Bài tập",
    "desc.homework": "Bài tập và nộp bài",
    "item.classes": "Lớp học",
    "desc.classes": "Lớp học và cohort",
    "item.learning-center": "Trung tâm học tập",
    "desc.learning-center": "HSK, TOCFL và công cụ học",
    "item.edu-games": "Game giáo dục",
    "desc.edu-games": "Học qua trò chơi",
    "item.multiplayer": "Chơi nhiều người",
    "desc.multiplayer": "Vào phòng chơi",
    "item.practice": "Luyện tập",
    "desc.practice": "Luyện từ Pikahans",
    "item.challenges": "Thử thách",
    "desc.challenges": "Thử thách Idiom King",
    "item.tycoon": "Tycoon",
    "desc.tycoon": "Xây khu đô thị tri thức, đổ xúc xắc, quiz đối thủ",
    "item.vault": "The Vault",
    "desc.vault": "Mở rương, đặt cược, hơn đối thủ trong phòng"
  },
  "en": {
    "nav.home": "Home",
    "nav.app": "Apps",
    "nav.knowledge": "Knowledge",
    "nav.learn": "Learn",
    "nav.game": "Games",
    "group.platform": "Platform",
    "group.create": "Create & explore",
    "search.placeholder": "Search apps, knowledge…",
    "search.aria": "Search apps, wiki, docs, quizzes…",
    "search.open": "Search",
    "search.close": "Close search",
    "search.sr": "Search Quizzman",
    "search.loading": "Searching…",
    "search.empty": "No results",
    "search.apps": "Apps",
    "search.results": "Results",
    "search.viewAll": "See all on Search",
    "join": "Join Quiz",
    "join.error": "Unable to open Join Quiz",
    "notify": "Notifications",
    "menu.open": "Open navigation menu",
    "menu.close": "Close navigation menu",
    "nav.aria": "Quizzman navigation",
    "item.mentis": "Mentis",
    "desc.mentis": "AI assistant",
    "item.lms": "LMS",
    "desc.lms": "Learning management system",
    "item.classroom": "Class",
    "desc.classroom": "Classes and learning groups",
    "item.slide-studio": "Slide Studio",
    "desc.slide-studio": "Presentation editor",
    "item.lab": "Insight",
    "desc.lab": "Experiments and tools",
    "item.app-platform": "App Platform",
    "desc.app-platform": "All Quizzman apps",
    "item.quiz-editor": "Quiz Editor",
    "desc.quiz-editor": "Create interactive quizzes",
    "item.assignment": "Assignment",
    "desc.assignment": "Create and manage assignments",
    "item.iching": "I-Ching",
    "desc.iching": "Cast and explore hexagrams",
    "item.calendar": "Calendar",
    "desc.calendar": "Calendar and date tools",
    "item.astro": "Astro",
    "desc.astro": "Sky viewer & astronomy core",
    "item.zodiac-sign": "Zodiac Sign",
    "desc.zodiac-sign": "Western zodiac reading",
    "item.tarot": "Tarot",
    "desc.tarot": "Rider–Waite tarot reading",
    "item.vedic": "Vedic",
    "desc.vedic": "Vedic astrology (Jyotiṣa)",
    "item.mandarin": "Mandarin",
    "desc.mandarin": "Chinese language learning",
    "item.wiki": "Wiki",
    "desc.wiki": "Knowledge base",
    "item.dictionary": "Dictionary",
    "desc.dictionary": "Chinese dictionary",
    "item.docs": "Docs",
    "desc.docs": "Platform documentation",
    "item.ai-knowledge": "AI Knowledge",
    "desc.ai-knowledge": "Ask Mentis about anything",
    "item.search": "Search",
    "desc.search": "Search across Quizzman",
    "item.live-quiz": "Live Quiz",
    "desc.live-quiz": "Realtime classroom quizzes",
    "item.present": "Present",
    "desc.present": "Interactive live slides",
    "item.homework": "Homework",
    "desc.homework": "Assignments and submissions",
    "item.classes": "Classes",
    "desc.classes": "Classrooms and cohorts",
    "item.learning-center": "Learning Center",
    "desc.learning-center": "HSK, TOCFL, and study tools",
    "item.edu-games": "Educational games",
    "desc.edu-games": "Learn through play",
    "item.multiplayer": "Multiplayer",
    "desc.multiplayer": "Join a live room",
    "item.practice": "Practice",
    "desc.practice": "Pikahans word practice",
    "item.challenges": "Challenges",
    "desc.challenges": "Idiom King challenges",
    "item.tycoon": "Tycoon",
    "desc.tycoon": "Build knowledge districts, roll the die, quiz rivals",
    "item.vault": "The Vault",
    "desc.vault": "Crack chests, stake cash, outsmart the room"
  },
  "zh": {
    "nav.home": "首页",
    "nav.app": "应用",
    "nav.knowledge": "知识",
    "nav.learn": "学习",
    "nav.game": "游戏",
    "group.platform": "平台",
    "group.create": "创建与探索",
    "search.placeholder": "搜索应用、知识…",
    "search.aria": "搜索应用、百科、文档、测验…",
    "search.open": "搜索",
    "search.close": "关闭搜索",
    "search.sr": "搜索 Quizzman",
    "search.loading": "搜索中…",
    "search.empty": "无结果",
    "search.apps": "应用",
    "search.results": "结果",
    "search.viewAll": "在 Search 查看全部",
    "join": "加入测验",
    "join.error": "无法打开加入测验",
    "notify": "通知",
    "menu.open": "打开导航菜单",
    "menu.close": "关闭导航菜单",
    "nav.aria": "Quizzman 导航",
    "item.mentis": "Mentis",
    "desc.mentis": "AI 助手",
    "item.lms": "LMS",
    "desc.lms": "学习管理系统",
    "item.classroom": "班级",
    "desc.classroom": "班级与学习小组",
    "item.slide-studio": "幻灯片工作室",
    "desc.slide-studio": "演示文稿编辑器",
    "item.lab": "Insight",
    "desc.lab": "实验与工具",
    "item.app-platform": "应用平台",
    "desc.app-platform": "全部 Quizzman 应用",
    "item.quiz-editor": "测验编辑器",
    "desc.quiz-editor": "创建互动测验",
    "item.assignment": "作业任务",
    "desc.assignment": "创建与管理作业",
    "item.iching": "I-Ching",
    "desc.iching": "周易占卜",
    "item.calendar": "日历",
    "desc.calendar": "日历工具",
    "item.astro": "Astro",
    "desc.astro": "天文与星空",
    "item.zodiac-sign": "星座",
    "desc.zodiac-sign": "十二星座 · 西方星座",
    "item.tarot": "塔罗",
    "desc.tarot": "韦特塔罗占卜",
    "item.vedic": "Vedic",
    "desc.vedic": "吠陀占星（Jyotiṣa）",
    "item.mandarin": "Mandarin",
    "desc.mandarin": "中文学习",
    "item.wiki": "Wiki",
    "desc.wiki": "知识库",
    "item.dictionary": "词典",
    "desc.dictionary": "汉喃词典",
    "item.docs": "文档",
    "desc.docs": "平台文档",
    "item.ai-knowledge": "AI Knowledge",
    "desc.ai-knowledge": "向 Mentis 提问",
    "item.search": "搜索",
    "desc.search": "全站搜索",
    "item.live-quiz": "实时测验",
    "desc.live-quiz": "实时课堂测验",
    "item.present": "Present",
    "desc.present": "实时互动演示",
    "item.homework": "作业",
    "desc.homework": "作业与提交",
    "item.classes": "班级",
    "desc.classes": "班级与学群",
    "item.learning-center": "学习中心",
    "desc.learning-center": "HSK、TOCFL 与学习工具",
    "item.edu-games": "教育游戏",
    "desc.edu-games": "寓教于乐",
    "item.multiplayer": "多人游戏",
    "desc.multiplayer": "加入直播房间",
    "item.practice": "练习",
    "desc.practice": "Pikahans 单词练习",
    "item.challenges": "挑战",
    "desc.challenges": "成语王挑战",
    "item.tycoon": "Tycoon",
    "desc.tycoon": "建造知识城区，掷骰答题对决",
    "item.vault": "The Vault",
    "desc.vault": "开宝箱、下注对决、智胜全场"
  },
  "zht": {
    "nav.home": "首頁",
    "nav.app": "應用",
    "nav.knowledge": "知識",
    "nav.learn": "學習",
    "nav.game": "遊戲",
    "group.platform": "平台",
    "group.create": "建立與探索",
    "search.placeholder": "搜尋應用、知識…",
    "search.aria": "搜尋應用、百科、文件、測驗…",
    "search.open": "搜尋",
    "search.close": "關閉搜尋",
    "search.sr": "搜尋 Quizzman",
    "search.loading": "搜尋中…",
    "search.empty": "無結果",
    "search.apps": "應用",
    "search.results": "結果",
    "search.viewAll": "在 Search 查看全部",
    "join": "加入測驗",
    "join.error": "無法開啟加入測驗",
    "notify": "通知",
    "menu.open": "開啟導覽選單",
    "menu.close": "關閉導覽選單",
    "nav.aria": "Quizzman 導覽",
    "item.mentis": "Mentis",
    "desc.mentis": "AI 助手",
    "item.lms": "LMS",
    "desc.lms": "學習管理系統",
    "item.classroom": "班級",
    "desc.classroom": "班級與學習小組",
    "item.slide-studio": "簡報工作室",
    "desc.slide-studio": "簡報編輯器",
    "item.lab": "Insight",
    "desc.lab": "實驗與工具",
    "item.app-platform": "應用平台",
    "desc.app-platform": "全部 Quizzman 應用",
    "item.quiz-editor": "測驗編輯器",
    "desc.quiz-editor": "建立互動測驗",
    "item.assignment": "作業任務",
    "desc.assignment": "建立與管理作業",
    "item.iching": "I-Ching",
    "desc.iching": "周易占卜",
    "item.calendar": "日曆",
    "desc.calendar": "日曆工具",
    "item.astro": "Astro",
    "desc.astro": "天文與星空",
    "item.zodiac-sign": "星座",
    "desc.zodiac-sign": "十二星座 · 西方星座",
    "item.tarot": "塔羅",
    "desc.tarot": "偉特塔羅占卜",
    "item.vedic": "Vedic",
    "desc.vedic": "吠陀占星（Jyotiṣa）",
    "item.mandarin": "Mandarin",
    "desc.mandarin": "中文學習",
    "item.wiki": "Wiki",
    "desc.wiki": "知識庫",
    "item.dictionary": "詞典",
    "desc.dictionary": "漢喃詞典",
    "item.docs": "文件",
    "desc.docs": "平台文件",
    "item.ai-knowledge": "AI Knowledge",
    "desc.ai-knowledge": "向 Mentis 提問",
    "item.search": "搜尋",
    "desc.search": "全站搜尋",
    "item.live-quiz": "即時測驗",
    "desc.live-quiz": "即時課堂測驗",
    "item.present": "Present",
    "desc.present": "即時互動簡報",
    "item.homework": "作業",
    "desc.homework": "作業與繳交",
    "item.classes": "班級",
    "desc.classes": "班級與學群",
    "item.learning-center": "學習中心",
    "desc.learning-center": "HSK、TOCFL 與學習工具",
    "item.edu-games": "教育遊戲",
    "desc.edu-games": "寓教於樂",
    "item.multiplayer": "多人遊戲",
    "desc.multiplayer": "加入直播房間",
    "item.practice": "練習",
    "desc.practice": "Pikahans 單字練習",
    "item.challenges": "挑戰",
    "desc.challenges": "成語王挑戰",
    "item.tycoon": "Tycoon",
    "desc.tycoon": "建造知識城區，擲骰答題對決",
    "item.vault": "The Vault",
    "desc.vault": "開寶箱、下注對決、智勝全場"
  },
  "jp": {
    "nav.home": "ホーム",
    "nav.app": "アプリ",
    "nav.knowledge": "知識",
    "nav.learn": "学習",
    "nav.game": "ゲーム",
    "group.platform": "プラットフォーム",
    "group.create": "作成と探索",
    "search.placeholder": "アプリ・知識を検索…",
    "search.aria": "アプリ、Wiki、Docs、クイズを検索…",
    "search.open": "検索",
    "search.close": "検索を閉じる",
    "search.sr": "Quizzmanを検索",
    "search.loading": "検索中…",
    "search.empty": "結果なし",
    "search.apps": "アプリ",
    "search.results": "結果",
    "search.viewAll": "Search ですべて見る",
    "join": "クイズに参加",
    "join.error": "参加クイズを開けません",
    "notify": "通知",
    "menu.open": "メニューを開く",
    "menu.close": "メニューを閉じる",
    "nav.aria": "Quizzmanナビゲーション",
    "item.mentis": "Mentis",
    "desc.mentis": "AIアシスタント",
    "item.lms": "LMS",
    "desc.lms": "学習管理システム",
    "item.classroom": "クラス",
    "desc.classroom": "クラスと学習グループ",
    "item.slide-studio": "スライドスタジオ",
    "desc.slide-studio": "プレゼン編集",
    "item.lab": "Insight",
    "desc.lab": "実験とツール",
    "item.app-platform": "アプリプラットフォーム",
    "desc.app-platform": "すべてのQuizzmanアプリ",
    "item.quiz-editor": "クイズエディタ",
    "desc.quiz-editor": "インタラクティブなクイズ作成",
    "item.assignment": "課題",
    "desc.assignment": "課題の作成と管理",
    "item.iching": "I-Ching",
    "desc.iching": "易経の卦を占う",
    "item.calendar": "カレンダー",
    "desc.calendar": "カレンダーツール",
    "item.astro": "Astro",
    "desc.astro": "天文・星空ビューア",
    "item.zodiac-sign": "星座",
    "desc.zodiac-sign": "西洋占星術・12星座",
    "item.tarot": "タロット",
    "desc.tarot": "ライダー・ウェイト・タロット",
    "item.vedic": "Vedic",
    "desc.vedic": "インド占星術（Jyotiṣa）",
    "item.mandarin": "Mandarin",
    "desc.mandarin": "中国語学習",
    "item.wiki": "Wiki",
    "desc.wiki": "ナレッジベース",
    "item.dictionary": "辞書",
    "desc.dictionary": "漢喃辞書",
    "item.docs": "ドキュメント",
    "desc.docs": "プラットフォーム文書",
    "item.ai-knowledge": "AI Knowledge",
    "desc.ai-knowledge": "Mentisに何でも質問",
    "item.search": "検索",
    "desc.search": "Quizzmanを横断検索",
    "item.live-quiz": "ライブクイズ",
    "desc.live-quiz": "リアルタイム授業クイズ",
    "item.present": "Present",
    "desc.present": "インタラクティブなライブ発表",
    "item.homework": "宿題",
    "desc.homework": "宿題と提出",
    "item.classes": "クラス",
    "desc.classes": "クラスとコホート",
    "item.learning-center": "ラーニングセンター",
    "desc.learning-center": "HSK・TOCFL・学習ツール",
    "item.edu-games": "教育ゲーム",
    "desc.edu-games": "遊びながら学ぶ",
    "item.multiplayer": "マルチプレイヤー",
    "desc.multiplayer": "ライブルームに参加",
    "item.practice": "練習",
    "desc.practice": "Pikahans単語練習",
    "item.challenges": "チャレンジ",
    "desc.challenges": "成語王チャレンジ",
    "item.tycoon": "Tycoon",
    "desc.tycoon": "知識街区を築き、サイコロで対戦",
    "item.vault": "The Vault",
    "desc.vault": "宝箱を開け、賭けて部屋を出し抜け"
  },
  "kr": {
    "nav.home": "홈",
    "nav.app": "앱",
    "nav.knowledge": "지식",
    "nav.learn": "학습",
    "nav.game": "게임",
    "group.platform": "플랫폼",
    "group.create": "만들기 & 탐색",
    "search.placeholder": "앱·지식 검색…",
    "search.aria": "앱, 위키, 문서, 퀴즈 검색…",
    "search.open": "검색",
    "search.close": "검색 닫기",
    "search.sr": "Quizzman 검색",
    "search.loading": "검색 중…",
    "search.empty": "결과 없음",
    "search.apps": "앱",
    "search.results": "결과",
    "search.viewAll": "Search에서 모두 보기",
    "join": "퀴즈 참가",
    "join.error": "참가 퀴즈를 열 수 없습니다",
    "notify": "알림",
    "menu.open": "메뉴 열기",
    "menu.close": "메뉴 닫기",
    "nav.aria": "Quizzman 탐색",
    "item.mentis": "Mentis",
    "desc.mentis": "AI 어시스턴트",
    "item.lms": "LMS",
    "desc.lms": "학습 관리 시스템",
    "item.classroom": "수업",
    "desc.classroom": "수업과 학습 그룹",
    "item.slide-studio": "슬라이드 스튜디오",
    "desc.slide-studio": "프레젠테이션 편집기",
    "item.lab": "Insight",
    "desc.lab": "실험과 도구",
    "item.app-platform": "앱 플랫폼",
    "desc.app-platform": "모든 Quizzman 앱",
    "item.quiz-editor": "퀴즈 에디터",
    "desc.quiz-editor": "인터랙티브 퀴즈 만들기",
    "item.assignment": "과제",
    "desc.assignment": "과제 생성 및 관리",
    "item.iching": "I-Ching",
    "desc.iching": "주역 괘 점치기",
    "item.calendar": "캘린더",
    "desc.calendar": "캘린더 도구",
    "item.astro": "Astro",
    "desc.astro": "천문·하늘 뷰어",
    "item.zodiac-sign": "별자리",
    "desc.zodiac-sign": "서양 점성술 · 12별자리",
    "item.tarot": "타로",
    "desc.tarot": "라이더–웨이트 타로",
    "item.vedic": "Vedic",
    "desc.vedic": "베다 점성술 (Jyotiṣa)",
    "item.mandarin": "Mandarin",
    "desc.mandarin": "중국어 학습",
    "item.wiki": "Wiki",
    "desc.wiki": "지식 베이스",
    "item.dictionary": "사전",
    "desc.dictionary": "한남 사전",
    "item.docs": "문서",
    "desc.docs": "플랫폼 문서",
    "item.ai-knowledge": "AI Knowledge",
    "desc.ai-knowledge": "Mentis에게 무엇이든 질문",
    "item.search": "검색",
    "desc.search": "Quizzman 전체 검색",
    "item.live-quiz": "라이브 퀴즈",
    "desc.live-quiz": "실시간 수업 퀴즈",
    "item.present": "Present",
    "desc.present": "실시간 인터랙티브 발표",
    "item.homework": "숙제",
    "desc.homework": "숙제와 제출",
    "item.classes": "수업",
    "desc.classes": "수업과 코호트",
    "item.learning-center": "러닝 센터",
    "desc.learning-center": "HSK, TOCFL 및 학습 도구",
    "item.edu-games": "교육 게임",
    "desc.edu-games": "놀이로 배우기",
    "item.multiplayer": "멀티플레이어",
    "desc.multiplayer": "라이브 룸 참가",
    "item.practice": "연습",
    "desc.practice": "Pikahans 단어 연습",
    "item.challenges": "챌린지",
    "desc.challenges": "성어왕 챌린지",
    "item.tycoon": "Tycoon",
    "desc.tycoon": "지식 구역을 짓고 주사위로 대결",
    "item.vault": "The Vault",
    "desc.vault": "상자를 열고 판돈을 걸어 방을 제압"
  },
  "fr": {
    "nav.home": "Accueil",
    "nav.app": "Apps",
    "nav.knowledge": "Savoir",
    "nav.learn": "Apprendre",
    "nav.game": "Jeux",
    "group.platform": "Plateforme",
    "group.create": "Créer & explorer",
    "search.placeholder": "Rechercher apps, savoir…",
    "search.aria": "Rechercher apps, wiki, docs, quiz…",
    "search.open": "Rechercher",
    "search.close": "Fermer la recherche",
    "search.sr": "Rechercher Quizzman",
    "search.loading": "Recherche…",
    "search.empty": "Aucun résultat",
    "search.apps": "Applications",
    "search.results": "Résultats",
    "search.viewAll": "Tout voir sur Search",
    "join": "Rejoindre le quiz",
    "join.error": "Impossible d’ouvrir Rejoindre le quiz",
    "notify": "Notifications",
    "menu.open": "Ouvrir le menu de navigation",
    "menu.close": "Fermer le menu",
    "nav.aria": "Navigation Quizzman",
    "item.mentis": "Mentis",
    "desc.mentis": "Assistant IA",
    "item.lms": "LMS",
    "desc.lms": "Système de gestion de l’apprentissage",
    "item.classroom": "Classe",
    "desc.classroom": "Classes et groupes d’apprentissage",
    "item.slide-studio": "Slide Studio",
    "desc.slide-studio": "Éditeur de présentation",
    "item.lab": "Insight",
    "desc.lab": "Expériences et outils",
    "item.app-platform": "Plateforme d’apps",
    "desc.app-platform": "Toutes les apps Quizzman",
    "item.quiz-editor": "Quiz Editor",
    "desc.quiz-editor": "Créer des quiz interactifs",
    "item.assignment": "Devoirs",
    "desc.assignment": "Créer et gérer des devoirs",
    "item.iching": "I-Ching",
    "desc.iching": "Tirer et explorer les hexagrammes",
    "item.calendar": "Calendar",
    "desc.calendar": "Outils de calendrier",
    "item.astro": "Astro",
    "desc.astro": "Ciel & astronomie",
    "item.zodiac-sign": "Signe du zodiaque",
    "desc.zodiac-sign": "Lecture du zodiaque occidental",
    "item.tarot": "Tarot",
    "desc.tarot": "Tirage Rider–Waite",
    "item.vedic": "Vedic",
    "desc.vedic": "Astrologie védique (Jyotiṣa)",
    "item.mandarin": "Mandarin",
    "desc.mandarin": "Apprentissage du chinois",
    "item.wiki": "Wiki",
    "desc.wiki": "Base de connaissances",
    "item.dictionary": "Dictionnaire",
    "desc.dictionary": "Dictionnaire chinois",
    "item.docs": "Docs",
    "desc.docs": "Documentation de la plateforme",
    "item.ai-knowledge": "AI Knowledge",
    "desc.ai-knowledge": "Demandez tout à Mentis",
    "item.search": "Recherche",
    "desc.search": "Rechercher sur Quizzman",
    "item.live-quiz": "Quiz en direct",
    "desc.live-quiz": "Quiz de classe en temps réel",
    "item.present": "Present",
    "desc.present": "Présentation interactive en direct",
    "item.homework": "Devoirs",
    "desc.homework": "Devoirs et soumissions",
    "item.classes": "Classes",
    "desc.classes": "Classes et cohortes",
    "item.learning-center": "Centre d’apprentissage",
    "desc.learning-center": "HSK, TOCFL et outils d’étude",
    "item.edu-games": "Jeux éducatifs",
    "desc.edu-games": "Apprendre en jouant",
    "item.multiplayer": "Multijoueur",
    "desc.multiplayer": "Rejoindre une salle en direct",
    "item.practice": "Pratique",
    "desc.practice": "Pratique de mots Pikahans",
    "item.challenges": "Défis",
    "desc.challenges": "Défis Idiom King",
    "item.tycoon": "Tycoon",
    "desc.tycoon": "Construisez des quartiers, lancez le dé, quizez vos rivaux",
    "item.vault": "The Vault",
    "desc.vault": "Ouvrez les coffres, misez, déjouez la salle"
  },
  "de": {
    "nav.home": "Start",
    "nav.app": "Apps",
    "nav.knowledge": "Wissen",
    "nav.learn": "Lernen",
    "nav.game": "Spiele",
    "group.platform": "Plattform",
    "group.create": "Erstellen & entdecken",
    "search.placeholder": "Apps, Wissen suchen…",
    "search.aria": "Apps, Wiki, Docs, Quiz suchen…",
    "search.open": "Suchen",
    "search.close": "Suche schließen",
    "search.sr": "Quizzman suchen",
    "search.loading": "Suche…",
    "search.empty": "Keine Ergebnisse",
    "search.apps": "Apps",
    "search.results": "Ergebnisse",
    "search.viewAll": "Alles in Search ansehen",
    "join": "Quiz beitreten",
    "join.error": "Quiz beitreten konnte nicht geöffnet werden",
    "notify": "Benachrichtigungen",
    "menu.open": "Navigationsmenü öffnen",
    "menu.close": "Menü schließen",
    "nav.aria": "Quizzman-Navigation",
    "item.mentis": "Mentis",
    "desc.mentis": "KI-Assistent",
    "item.lms": "LMS",
    "desc.lms": "Lernmanagementsystem",
    "item.classroom": "Klasse",
    "desc.classroom": "Klassen und Lerngruppen",
    "item.slide-studio": "Slide Studio",
    "desc.slide-studio": "Präsentationseditor",
    "item.lab": "Insight",
    "desc.lab": "Experimente und Tools",
    "item.app-platform": "App-Plattform",
    "desc.app-platform": "Alle Quizzman-Apps",
    "item.quiz-editor": "Quiz Editor",
    "desc.quiz-editor": "Interaktive Quiz erstellen",
    "item.assignment": "Aufgaben",
    "desc.assignment": "Aufgaben erstellen und verwalten",
    "item.iching": "I-Ching",
    "desc.iching": "Hexagramme werfen und erkunden",
    "item.calendar": "Calendar",
    "desc.calendar": "Kalender-Tools",
    "item.astro": "Astro",
    "desc.astro": "Himmel & Astronomie",
    "item.zodiac-sign": "Sternzeichen",
    "desc.zodiac-sign": "Westliche Astrologie · 12 Zeichen",
    "item.tarot": "Tarot",
    "desc.tarot": "Rider–Waite-Tarot",
    "item.vedic": "Vedic",
    "desc.vedic": "Vedische Astrologie (Jyotiṣa)",
    "item.mandarin": "Mandarin",
    "desc.mandarin": "Chinesisch lernen",
    "item.wiki": "Wiki",
    "desc.wiki": "Wissensdatenbank",
    "item.dictionary": "Wörterbuch",
    "desc.dictionary": "Chinesisches Wörterbuch",
    "item.docs": "Docs",
    "desc.docs": "Plattformdokumentation",
    "item.ai-knowledge": "AI Knowledge",
    "desc.ai-knowledge": "Mentis alles fragen",
    "item.search": "Suche",
    "desc.search": "Überall auf Quizzman suchen",
    "item.live-quiz": "Live-Quiz",
    "desc.live-quiz": "Echtzeit-Klassenquiz",
    "item.present": "Present",
    "desc.present": "Interaktive Live-Präsentation",
    "item.homework": "Hausaufgaben",
    "desc.homework": "Aufgaben und Abgaben",
    "item.classes": "Klassen",
    "desc.classes": "Klassen und Kohorten",
    "item.learning-center": "Lernzentrum",
    "desc.learning-center": "HSK, TOCFL und Lerntools",
    "item.edu-games": "Lernspiele",
    "desc.edu-games": "Lernen durch Spielen",
    "item.multiplayer": "Mehrspieler",
    "desc.multiplayer": "Live-Raum beitreten",
    "item.practice": "Übung",
    "desc.practice": "Pikahans-Wortübung",
    "item.challenges": "Herausforderungen",
    "desc.challenges": "Idiom-King-Herausforderungen",
    "item.tycoon": "Tycoon",
    "desc.tycoon": "Bezirke bauen, würfeln, Rivalen quizen",
    "item.vault": "The Vault",
    "desc.vault": "Truhen knacken, Einsatz setzen, den Raum überlisten"
  },
  "es": {
    "nav.home": "Inicio",
    "nav.app": "Apps",
    "nav.knowledge": "Saber",
    "nav.learn": "Aprender",
    "nav.game": "Juegos",
    "group.platform": "Plataforma",
    "group.create": "Crear y explorar",
    "search.placeholder": "Buscar apps, saber…",
    "search.aria": "Buscar apps, wiki, docs, quizzes…",
    "search.open": "Buscar",
    "search.close": "Cerrar búsqueda",
    "search.sr": "Buscar Quizzman",
    "search.loading": "Buscando…",
    "search.empty": "Sin resultados",
    "search.apps": "Apps",
    "search.results": "Resultados",
    "search.viewAll": "Ver todo en Search",
    "join": "Unirse al quiz",
    "join.error": "No se pudo abrir Unirse al quiz",
    "notify": "Notificaciones",
    "menu.open": "Abrir menú de navegación",
    "menu.close": "Cerrar menú",
    "nav.aria": "Navegación de Quizzman",
    "item.mentis": "Mentis",
    "desc.mentis": "Asistente de IA",
    "item.lms": "LMS",
    "desc.lms": "Sistema de gestión del aprendizaje",
    "item.classroom": "Clase",
    "desc.classroom": "Clases y grupos de aprendizaje",
    "item.slide-studio": "Slide Studio",
    "desc.slide-studio": "Editor de presentaciones",
    "item.lab": "Insight",
    "desc.lab": "Experimentos y herramientas",
    "item.app-platform": "Plataforma de apps",
    "desc.app-platform": "Todas las apps de Quizzman",
    "item.quiz-editor": "Quiz Editor",
    "desc.quiz-editor": "Crear quizzes interactivos",
    "item.assignment": "Tareas",
    "desc.assignment": "Crear y gestionar tareas",
    "item.iching": "I-Ching",
    "desc.iching": "Consultar hexagramas",
    "item.calendar": "Calendar",
    "desc.calendar": "Herramientas de calendario",
    "item.astro": "Astro",
    "desc.astro": "Cielo y astronomía",
    "item.zodiac-sign": "Signo zodiacal",
    "desc.zodiac-sign": "Astrología occidental · 12 signos",
    "item.tarot": "Tarot",
    "desc.tarot": "Tirada Rider–Waite",
    "item.vedic": "Vedic",
    "desc.vedic": "Astrología védica (Jyotiṣa)",
    "item.mandarin": "Mandarin",
    "desc.mandarin": "Aprendizaje de chino",
    "item.wiki": "Wiki",
    "desc.wiki": "Base de conocimiento",
    "item.dictionary": "Diccionario",
    "desc.dictionary": "Diccionario chino",
    "item.docs": "Docs",
    "desc.docs": "Documentación de la plataforma",
    "item.ai-knowledge": "AI Knowledge",
    "desc.ai-knowledge": "Pregunta cualquier cosa a Mentis",
    "item.search": "Buscar",
    "desc.search": "Buscar en Quizzman",
    "item.live-quiz": "Quiz en vivo",
    "desc.live-quiz": "Quizzes de clase en tiempo real",
    "item.present": "Present",
    "desc.present": "Presentación interactiva en vivo",
    "item.homework": "Tareas",
    "desc.homework": "Tareas y entregas",
    "item.classes": "Clases",
    "desc.classes": "Clases y cohortes",
    "item.learning-center": "Centro de aprendizaje",
    "desc.learning-center": "HSK, TOCFL y herramientas de estudio",
    "item.edu-games": "Juegos educativos",
    "desc.edu-games": "Aprender jugando",
    "item.multiplayer": "Multijugador",
    "desc.multiplayer": "Unirse a una sala en vivo",
    "item.practice": "Práctica",
    "desc.practice": "Práctica de palabras Pikahans",
    "item.challenges": "Desafíos",
    "desc.challenges": "Desafíos Idiom King",
    "item.tycoon": "Tycoon",
    "desc.tycoon": "Construye distritos, lanza el dado, reta a rivales",
    "item.vault": "The Vault",
    "desc.vault": "Abre cofres, apuesta y supera a la sala"
  },
  "th": {
    "nav.home": "หน้าแรก",
    "nav.app": "แอป",
    "nav.knowledge": "ความรู้",
    "nav.learn": "เรียน",
    "nav.game": "เกม",
    "group.platform": "แพลตฟอร์ม",
    "group.create": "สร้างและสำรวจ",
    "search.placeholder": "ค้นหาแอป ความรู้…",
    "search.aria": "ค้นหาแอป วิกิ เอกสาร ควิซ…",
    "search.open": "ค้นหา",
    "search.close": "ปิดการค้นหา",
    "search.sr": "ค้นหา Quizzman",
    "search.loading": "กำลังค้นหา…",
    "search.empty": "ไม่พบผลลัพธ์",
    "search.apps": "แอป",
    "search.results": "ผลลัพธ์",
    "search.viewAll": "ดูทั้งหมดบน Search",
    "join": "เข้าควิซ",
    "join.error": "ไม่สามารถเปิดเข้าควิซได้",
    "notify": "การแจ้งเตือน",
    "menu.open": "เปิดเมนูนำทาง",
    "menu.close": "ปิดเมนู",
    "nav.aria": "การนำทาง Quizzman",
    "item.mentis": "Mentis",
    "desc.mentis": "ผู้ช่วย AI",
    "item.lms": "LMS",
    "desc.lms": "ระบบจัดการการเรียนรู้",
    "item.classroom": "ชั้นเรียน",
    "desc.classroom": "ชั้นเรียนและกลุ่มเรียน",
    "item.slide-studio": "Slide Studio",
    "desc.slide-studio": "ตัวแก้ไขงานนำเสนอ",
    "item.lab": "Insight",
    "desc.lab": "การทดลองและเครื่องมือ",
    "item.app-platform": "แพลตฟอร์มแอป",
    "desc.app-platform": "แอป Quizzman ทั้งหมด",
    "item.quiz-editor": "Quiz Editor",
    "desc.quiz-editor": "สร้างควิซแบบโต้ตอบ",
    "item.assignment": "งานมอบหมาย",
    "desc.assignment": "สร้างและจัดการงานมอบหมาย",
    "item.iching": "I-Ching",
    "desc.iching": "ทำนายเหย้าอี้จิง",
    "item.calendar": "Calendar",
    "desc.calendar": "เครื่องมือปฏิทิน",
    "item.astro": "Astro",
    "desc.astro": "ดาราศาสตร์และท้องฟ้า",
    "item.zodiac-sign": "ราศี",
    "desc.zodiac-sign": "โหราศาสตร์ตะวันตก · 12 ราศี",
    "item.tarot": "ทาโรต์",
    "desc.tarot": "ไพ่ทาโรต์ Rider–Waite",
    "item.vedic": "Vedic",
    "desc.vedic": "โหราศาสตร์เวท (Jyotiṣa)",
    "item.mandarin": "Mandarin",
    "desc.mandarin": "เรียนภาษาจีน",
    "item.wiki": "Wiki",
    "desc.wiki": "คลังความรู้",
    "item.dictionary": "พจนานุกรม",
    "desc.dictionary": "พจนานุกรมจีน",
    "item.docs": "เอกสาร",
    "desc.docs": "เอกสารแพลตฟอร์ม",
    "item.ai-knowledge": "AI Knowledge",
    "desc.ai-knowledge": "ถาม Mentis ได้ทุกอย่าง",
    "item.search": "ค้นหา",
    "desc.search": "ค้นหาทั่ว Quizzman",
    "item.live-quiz": "ควิซสด",
    "desc.live-quiz": "ควิซชั้นเรียนแบบเรียลไทม์",
    "item.present": "Present",
    "desc.present": "งานนำเสนอสดแบบโต้ตอบ",
    "item.homework": "การบ้าน",
    "desc.homework": "การบ้านและการส่งงาน",
    "item.classes": "ชั้นเรียน",
    "desc.classes": "ชั้นเรียนและกลุ่มเรียน",
    "item.learning-center": "ศูนย์การเรียนรู้",
    "desc.learning-center": "HSK TOCFL และเครื่องมือเรียน",
    "item.edu-games": "เกมการศึกษา",
    "desc.edu-games": "เรียนรู้ผ่านเกม",
    "item.multiplayer": "หลายผู้เล่น",
    "desc.multiplayer": "เข้าห้องเล่นสด",
    "item.practice": "ฝึกฝน",
    "desc.practice": "ฝึกคำศัพท์ Pikahans",
    "item.challenges": "ความท้าทาย",
    "desc.challenges": "ความท้าทาย Idiom King",
    "item.tycoon": "Tycoon",
    "desc.tycoon": "สร้างย่านความรู้ ทอยลูกเต๋า แข่งควิซ",
    "item.vault": "The Vault",
    "desc.vault": "เปิดหีบ วางเดิมพัน เอาชนะห้อง"
  },
  "pt": {
    "nav.home": "Início",
    "nav.app": "Apps",
    "nav.knowledge": "Saber",
    "nav.learn": "Aprender",
    "nav.game": "Jogos",
    "group.platform": "Plataforma",
    "group.create": "Criar e explorar",
    "search.placeholder": "Pesquisar apps, saber…",
    "search.aria": "Pesquisar apps, wiki, docs, quizzes…",
    "search.open": "Pesquisar",
    "search.close": "Fechar pesquisa",
    "search.sr": "Pesquisar Quizzman",
    "search.loading": "Pesquisando…",
    "search.empty": "Sem resultados",
    "search.apps": "Apps",
    "search.results": "Resultados",
    "search.viewAll": "Ver tudo na Search",
    "join": "Entrar no quiz",
    "join.error": "Não foi possível abrir Entrar no quiz",
    "notify": "Notificações",
    "menu.open": "Abrir menu de navegação",
    "menu.close": "Fechar menu",
    "nav.aria": "Navegação Quizzman",
    "item.mentis": "Mentis",
    "desc.mentis": "Assistente de IA",
    "item.lms": "LMS",
    "desc.lms": "Sistema de gestão de aprendizagem",
    "item.classroom": "Turma",
    "desc.classroom": "Turmas e grupos de aprendizagem",
    "item.slide-studio": "Slide Studio",
    "desc.slide-studio": "Editor de apresentações",
    "item.lab": "Insight",
    "desc.lab": "Experimentos e ferramentas",
    "item.app-platform": "Plataforma de apps",
    "desc.app-platform": "Todos os apps Quizzman",
    "item.quiz-editor": "Quiz Editor",
    "desc.quiz-editor": "Criar quizzes interativos",
    "item.assignment": "Tarefas",
    "desc.assignment": "Criar e gerenciar tarefas",
    "item.iching": "I-Ching",
    "desc.iching": "Consultar hexagramas",
    "item.calendar": "Calendar",
    "desc.calendar": "Ferramentas de calendário",
    "item.astro": "Astro",
    "desc.astro": "Céu e astronomia",
    "item.zodiac-sign": "Signo do zodíaco",
    "desc.zodiac-sign": "Astrologia ocidental · 12 signos",
    "item.tarot": "Tarô",
    "desc.tarot": "Leitura Rider–Waite",
    "item.vedic": "Vedic",
    "desc.vedic": "Astrologia védica (Jyotiṣa)",
    "item.mandarin": "Mandarin",
    "desc.mandarin": "Aprendizado de chinês",
    "item.wiki": "Wiki",
    "desc.wiki": "Base de conhecimento",
    "item.dictionary": "Dicionário",
    "desc.dictionary": "Dicionário chinês",
    "item.docs": "Docs",
    "desc.docs": "Documentação da plataforma",
    "item.ai-knowledge": "AI Knowledge",
    "desc.ai-knowledge": "Pergunte qualquer coisa ao Mentis",
    "item.search": "Pesquisar",
    "desc.search": "Pesquisar no Quizzman",
    "item.live-quiz": "Quiz ao vivo",
    "desc.live-quiz": "Quizzes de aula em tempo real",
    "item.present": "Present",
    "desc.present": "Apresentação interativa ao vivo",
    "item.homework": "Tarefas",
    "desc.homework": "Tarefas e envios",
    "item.classes": "Turmas",
    "desc.classes": "Turmas e cohorts",
    "item.learning-center": "Centro de aprendizagem",
    "desc.learning-center": "HSK, TOCFL e ferramentas de estudo",
    "item.edu-games": "Jogos educativos",
    "desc.edu-games": "Aprender brincando",
    "item.multiplayer": "Multijogador",
    "desc.multiplayer": "Entrar em uma sala ao vivo",
    "item.practice": "Prática",
    "desc.practice": "Prática de palavras Pikahans",
    "item.challenges": "Desafios",
    "desc.challenges": "Desafios Idiom King",
    "item.tycoon": "Tycoon",
    "desc.tycoon": "Construa distritos, role o dado, desafie rivais",
    "item.vault": "The Vault",
    "desc.vault": "Abra baús, aposte e supere a sala"
  }
};

  const HEADER_LANGS = ['vi', 'en', 'zh', 'zht', 'jp', 'kr', 'fr', 'de', 'es', 'th', 'pt'];
  const HEADER_LANG_ALIAS = {
    ja: 'jp', ko: 'kr',
    zh: 'zh', 'zh-cn': 'zh', 'zh-hans': 'zh', zhs: 'zh',
    zht: 'zht', 'zh-tw': 'zht', 'zh-hant': 'zht', 'zh-hk': 'zht', 'zh-mo': 'zht',
  };

  function foldZhLang(lang) {
    if (lang === 'zht' || lang.startsWith('zh-t') || lang.includes('hant')
        || lang === 'zh-tw' || lang === 'zh-hk' || lang === 'zh-mo') return 'zht';
    if (lang === 'zh' || lang.startsWith('zh-')) return 'zh';
    return lang;
  }

  function getHeaderLang() {
    try {
      const readCookie = (name) => {
        try {
          const parts = String(document.cookie || '').split(';');
          const prefix = name + '=';
          for (let i = 0; i < parts.length; i++) {
            const p = parts[i].trim();
            if (p.indexOf(prefix) === 0) return decodeURIComponent(p.slice(prefix.length));
          }
        } catch (e0) { /* ignore */ }
        return '';
      };
      let raw = localStorage.getItem('qmf-lang')
        || localStorage.getItem('lab-ui-lang')
        || localStorage.getItem('lab-lang')
        || '';
      if (!raw || raw === 'auto') raw = readCookie('qmf-lang') || raw;
      if (!raw || raw === 'auto') {
        raw = document.documentElement.getAttribute('data-lang') || '';
      }
      let lang = String(raw).trim().toLowerCase().replace(/_/g, '-');
      if (HEADER_LANG_ALIAS[lang]) lang = HEADER_LANG_ALIAS[lang];
      lang = foldZhLang(lang);
      if (lang.startsWith('ja')) lang = 'jp';
      else if (lang.startsWith('ko')) lang = 'kr';
      else if (!HEADER_I18N[lang]) lang = lang.split('-')[0];
      if (HEADER_I18N[lang]) return lang;
    } catch (e) { /* ignore */ }
    return 'vi';
  }

  function ht(key, fallback) {
    if (window.QmfI18n && typeof window.QmfI18n.t === 'function') {
      const nested = 'header.' + key;
      const via = window.QmfI18n.t(nested, null);
      if (via && via !== nested) return via;
    }
    const lang = getHeaderLang();
    const pack = HEADER_I18N[lang] || HEADER_I18N.en || {};
    if (pack[key] != null && pack[key] !== '') return pack[key];
    if (HEADER_I18N.en && HEADER_I18N.en[key] != null) return HEADER_I18N.en[key];
    return fallback != null ? fallback : key;
  }

  function i18nAttr(key) {
    // data-i18n for inspectability + homepage scanners; data-qmf-i18n for header applyI18n
    return ' data-qmf-i18n="' + key + '" data-i18n="header.' + key + '"';
  }

  const LEGATUS_BRIDGE = CDN_BASE + '/legatus-bridge.js?v=' + VERSION;
  const LEGATUS_ENDPOINT = 'https://legatus.quizzman.com';
  const NAV_ICON_BASE = 'https://ui.quizzman.com/qmf/assets/logo/nav';
  const NAV_ICON_VER = '20260925';
  let joinOverlayLoader = null;

  function navIcon(name) {
    const base = NAV_ICON_BASE + '/' + name;
    return {
      iconImg: base + '-40.png?v=' + NAV_ICON_VER,
      iconImg2x: base + '-80.png?v=' + NAV_ICON_VER,
      iconImgWebp: base + '-40.webp?v=' + NAV_ICON_VER,
      iconImgWebp2x: base + '-80.webp?v=' + NAV_ICON_VER,
      iconAlt: name.replace(/-/g, ' '),
    };
  }

  const PLAY_BADGE_SVG = '<svg viewBox="0 0 24 24" width="10" height="10" aria-hidden="true"><path fill="currentColor" d="M8 5.14v13.72L19.5 12 8 5.14z"/></svg>';

  function presentIcon() {
    return { ...navIcon('slide-studio'), iconBadge: 'play', iconAlt: 'present' };
  }

  /**
   * Section glyphs for the primary nav — Lucide-style, 2px stroke, one visual family.
   * Rendered inline so they inherit the link color (muted → brand accent when active).
   */
  const NAV_SECTION_ICONS = {
    'home': '<path d="m3 10.8 9-7.3 9 7.3"/><path d="M5.5 9.5V21h13V9.5"/><path d="M9.5 21v-6h5v6"/>',
    'app': '<rect x="3" y="3" width="7" height="7" rx="1.6"/><rect x="14" y="3" width="7" height="7" rx="1.6"/><rect x="14" y="14" width="7" height="7" rx="1.6"/><rect x="3" y="14" width="7" height="7" rx="1.6"/>',
    'tri-thuc': '<path d="M2 4.5h6a3 3 0 0 1 3 3V20a2.2 2.2 0 0 0-2.2-2.2H2z"/><path d="M22 4.5h-6a3 3 0 0 0-3 3V20a2.2 2.2 0 0 1 2.2-2.2H22z"/>',
    'hoc': '<path d="M22 9.5 12 5 2 9.5l10 4.5 10-4.5z"/><path d="M6 11.4V16c3.2 2 8.8 2 12 0v-4.6"/>',
    'game': '<path d="M6.5 11.5h4M8.5 9.5v4"/><path d="M15.4 10.6h.01M18 12.9h.01"/><path d="M17.4 5.5H6.6a4 4 0 0 0-3.98 3.6L2 14.4A2.4 2.4 0 0 0 6.3 16l.6-.8h10.2l.6.8a2.4 2.4 0 0 0 4.3-1.6l-.62-5.3a4 4 0 0 0-3.98-3.6z"/>',
  };

  function navSectionIcon(id) {
    const paths = NAV_SECTION_ICONS[id];
    if (!paths) return '';
    return `<svg class="lab-header__nav-ico" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
  }

  /**
   * Four primary sections only. Add new apps as children — never new top-level items.
   * Product logos: compressed WebP/PNG thumbs under /qmf/assets/logo/nav/ (cached 7d).
   */

  function getQuizzmanNavItems() {
    return [
      {
        id: 'home',
        labelKey: 'nav.home',
        label: ht('nav.home', 'Home'),
        href: 'https://quizzman.com',
        compact: true,
      },
      {
        id: 'app',
        labelKey: 'nav.app',
        label: ht('nav.app', 'App'),
        href: 'https://app.quizzman.com',
        children: [
          { id: 'mentis', labelKey: 'item.mentis', descKey: 'desc.mentis', groupKey: 'group.platform', label: ht('item.mentis'), description: ht('desc.mentis'), group: ht('group.platform'), href: 'https://mentis.quizzman.com', ...navIcon('mentis') },
          { id: 'lms', labelKey: 'item.lms', descKey: 'desc.lms', groupKey: 'group.platform', label: ht('item.lms'), description: ht('desc.lms'), group: ht('group.platform'), href: 'https://lms.quizzman.com', ...navIcon('lms') },
          { id: 'classroom', labelKey: 'item.classroom', descKey: 'desc.classroom', groupKey: 'group.platform', label: ht('item.classroom'), description: ht('desc.classroom'), group: ht('group.platform'), href: 'https://class.quizzman.com', ...navIcon('classroom') },
          { id: 'slide-studio', labelKey: 'item.slide-studio', descKey: 'desc.slide-studio', groupKey: 'group.platform', label: ht('item.slide-studio'), description: ht('desc.slide-studio'), group: ht('group.platform'), href: 'https://app.quizzman.com/slide-studio/', ...navIcon('slide-studio') },
          { id: 'lab', labelKey: 'item.lab', descKey: 'desc.lab', groupKey: 'group.platform', label: ht('item.lab'), description: ht('desc.lab'), group: ht('group.platform'), href: 'https://insight.quizzman.com', ...navIcon('eastern-lab') },
          { id: 'app-platform', labelKey: 'item.app-platform', descKey: 'desc.app-platform', groupKey: 'group.platform', label: ht('item.app-platform'), description: ht('desc.app-platform'), group: ht('group.platform'), href: 'https://app.quizzman.com', icon: 'A' },
          { id: 'quiz-editor', labelKey: 'item.quiz-editor', descKey: 'desc.quiz-editor', groupKey: 'group.create', label: ht('item.quiz-editor'), description: ht('desc.quiz-editor'), group: ht('group.create'), href: 'https://app.quizzman.com/quiz-editor/', ...navIcon('quiz-editor') },
          { id: 'present', labelKey: 'item.present', descKey: 'desc.present', groupKey: 'group.create', label: ht('item.present'), description: ht('desc.present'), group: ht('group.create'), href: 'https://play.quizzman.com/slide', ...presentIcon() },
          { id: 'assignment', labelKey: 'item.assignment', descKey: 'desc.assignment', groupKey: 'group.create', label: ht('item.assignment'), description: ht('desc.assignment'), group: ht('group.create'), href: 'https://class.quizzman.com/homework', ...navIcon('assignment') },
          { id: 'iching', labelKey: 'item.iching', descKey: 'desc.iching', groupKey: 'group.create', label: ht('item.iching'), description: ht('desc.iching'), group: ht('group.create'), href: 'https://insight.quizzman.com/tool/iching-divination', ...navIcon('iching') },
          { id: 'calendar', labelKey: 'item.calendar', descKey: 'desc.calendar', groupKey: 'group.create', label: ht('item.calendar'), description: ht('desc.calendar'), group: ht('group.create'), href: 'https://insight.quizzman.com/tool/calendar-converter', ...navIcon('calendar') },
          { id: 'astro', labelKey: 'item.astro', descKey: 'desc.astro', groupKey: 'group.create', label: ht('item.astro'), description: ht('desc.astro'), group: ht('group.create'), href: 'https://astro.quizzman.com', ...navIcon('astro') },
          { id: 'zodiac-sign', labelKey: 'item.zodiac-sign', descKey: 'desc.zodiac-sign', groupKey: 'group.create', label: ht('item.zodiac-sign'), description: ht('desc.zodiac-sign'), group: ht('group.create'), href: 'https://insight.quizzman.com/zodiac-sign', ...navIcon('zodiac-sign') },
          { id: 'tarot', labelKey: 'item.tarot', descKey: 'desc.tarot', groupKey: 'group.create', label: ht('item.tarot'), description: ht('desc.tarot'), group: ht('group.create'), href: 'https://insight.quizzman.com/tarot', ...navIcon('tarot') },
          { id: 'vedic', labelKey: 'item.vedic', descKey: 'desc.vedic', groupKey: 'group.create', label: ht('item.vedic'), description: ht('desc.vedic'), group: ht('group.create'), href: 'https://insight.quizzman.com/vedic', ...navIcon('vedic') },
          { id: 'mandarin', labelKey: 'item.mandarin', descKey: 'desc.mandarin', groupKey: 'group.create', label: ht('item.mandarin'), description: ht('desc.mandarin'), group: ht('group.create'), href: 'https://study.quizzman.com', ...navIcon('mandarin') },
        ],
      },
      {
        id: 'tri-thuc',
        labelKey: 'nav.knowledge',
        label: ht('nav.knowledge', 'Knowledge'),
        href: 'https://wiki.quizzman.com',
        children: [
          { id: 'wiki', labelKey: 'item.wiki', descKey: 'desc.wiki', label: ht('item.wiki'), description: ht('desc.wiki'), href: 'https://wiki.quizzman.com', ...navIcon('wiki') },
          { id: 'dictionary', labelKey: 'item.dictionary', descKey: 'desc.dictionary', label: ht('item.dictionary'), description: ht('desc.dictionary'), href: 'https://dict.quizzman.com', icon: '典' },
          { id: 'docs', labelKey: 'item.docs', descKey: 'desc.docs', label: ht('item.docs'), description: ht('desc.docs'), href: 'https://ui.quizzman.com/qmf/docs.html', ...navIcon('ui') },
          { id: 'ai-knowledge', labelKey: 'item.ai-knowledge', descKey: 'desc.ai-knowledge', label: ht('item.ai-knowledge'), description: ht('desc.ai-knowledge'), href: 'https://mentis.quizzman.com', ...navIcon('mentis') },
          { id: 'search', labelKey: 'item.search', descKey: 'desc.search', label: ht('item.search'), description: ht('desc.search'), href: 'https://search.quizzman.com', icon: '⌕' },
        ],
      },
      {
        id: 'hoc',
        labelKey: 'nav.learn',
        label: ht('nav.learn', 'Learn'),
        href: 'https://study.quizzman.com',
        children: [
          { id: 'live-quiz', labelKey: 'item.live-quiz', descKey: 'desc.live-quiz', label: ht('item.live-quiz'), description: ht('desc.live-quiz'), href: 'https://play.quizzman.com/quiz', ...navIcon('live-quiz') },
          { id: 'present', labelKey: 'item.present', descKey: 'desc.present', label: ht('item.present'), description: ht('desc.present'), href: 'https://play.quizzman.com/slide', ...presentIcon() },
          { id: 'homework', labelKey: 'item.homework', descKey: 'desc.homework', label: ht('item.homework'), description: ht('desc.homework'), href: 'https://class.quizzman.com', icon: 'H' },
          { id: 'classes', labelKey: 'item.classes', descKey: 'desc.classes', label: ht('item.classes'), description: ht('desc.classes'), href: 'https://class.quizzman.com', icon: 'C' },
          { id: 'learning-center', labelKey: 'item.learning-center', descKey: 'desc.learning-center', label: ht('item.learning-center'), description: ht('desc.learning-center'), href: 'https://study.quizzman.com', icon: '学' },
        ],
      },
      {
        id: 'game',
        labelKey: 'nav.game',
        label: ht('nav.game', 'Game'),
        href: 'https://play.quizzman.com',
        children: [
          { id: 'live-quiz', labelKey: 'item.live-quiz', descKey: 'desc.live-quiz', label: ht('item.live-quiz'), description: ht('desc.live-quiz'), href: 'https://play.quizzman.com/quiz', ...navIcon('live-quiz') },
          { id: 'present', labelKey: 'item.present', descKey: 'desc.present', label: ht('item.present'), description: ht('desc.present'), href: 'https://play.quizzman.com/slide', ...presentIcon() },
          { id: 'edu-games', labelKey: 'item.edu-games', descKey: 'desc.edu-games', label: ht('item.edu-games'), description: ht('desc.edu-games'), href: 'https://play.quizzman.com', icon: 'G' },
          { id: 'multiplayer', labelKey: 'item.multiplayer', descKey: 'desc.multiplayer', label: ht('item.multiplayer'), description: ht('desc.multiplayer'), href: 'https://play.quizzman.com', icon: '合' },
          { id: 'practice', labelKey: 'item.practice', descKey: 'desc.practice', label: ht('item.practice'), description: ht('desc.practice'), href: 'https://play.quizzman.com/pikahans', ...navIcon('pikahans') },
          { id: 'challenges', labelKey: 'item.challenges', descKey: 'desc.challenges', label: ht('item.challenges'), description: ht('desc.challenges'), href: 'https://play.quizzman.com/idiom-king', ...navIcon('idiom-king') },
          { id: 'tycoon', labelKey: 'item.tycoon', descKey: 'desc.tycoon', label: ht('item.tycoon'), description: ht('desc.tycoon'), href: 'https://play.quizzman.com/tycoon', ...navIcon('tycoon') },
          { id: 'arena', labelKey: 'item.vault', descKey: 'desc.vault', label: ht('item.vault'), description: ht('desc.vault'), href: 'https://play.quizzman.com/arena', ...navIcon('arena') },
        ],
      },
    ];
  }

  const DEFAULT_CONFIG = {
    logoSrc: 'https://ui.quizzman.com/qmf/assets/logo/quizzman-logo.png',
    logoSrcDark: 'https://ui.quizzman.com/qmf/assets/logo/quizzman-logo-dark.png',
    brandName: 'Quizzman',
    pageTitle: '',
    productSub: '',
    showGlobalNav: true,
    showHamburger: false,
    showChat: false,
    showFriend: false,
    showNotification: true,
    showSearch: true,
    showJoinQuiz: true,
    showUserDropdown: false,
    searchPlaceholder: 'Search',
    joinQuizLabel: 'Join Quiz',
    joinOverlayBase: JOIN_OVERLAY_BASE,
    // In-header typeahead hits this API; searchUrl is optional "see all" footer only
    searchApiUrl: 'https://search.quizzman.com/api/search',
    searchUrl: 'https://search.quizzman.com/?q={q}',
    loginUrl: 'https://id.quizzman.com/login',
    profileUrl: 'https://id.quizzman.com/account',
    settingsUrl: 'https://id.quizzman.com/account',
    mainLogoUrl: 'https://ui.quizzman.com/qmf/assets/logo/quizzman-logo.png',
    mainLogoDarkUrl: 'https://ui.quizzman.com/qmf/assets/logo/quizzman-logo-dark.png',
    mainLogoLink: 'https://quizzman.com',
    navItems: null,
    headerInFlow: false,
  };

  function loadJoinOverlay(base = JOIN_OVERLAY_BASE) {
    if (window.QMFJoinOverlay?.open) return Promise.resolve(window.QMFJoinOverlay);
    if (joinOverlayLoader) return joinOverlayLoader;
    const normalizedBase = String(base || JOIN_OVERLAY_BASE).replace(/\/+$/, '');
    joinOverlayLoader = new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-qmf-join-overlay]');
      if (existing) {
        existing.addEventListener('load', () => resolve(window.QMFJoinOverlay), { once: true });
        existing.addEventListener('error', reject, { once: true });
        return;
      }
      const script = document.createElement('script');
      script.src = `${normalizedBase}/join-overlay.js?v=${JOIN_OVERLAY_VERSION}`;
      script.async = true;
      script.dataset.qmfJoinOverlay = '1';
      script.addEventListener('load', () => {
        if (window.QMFJoinOverlay?.open) resolve(window.QMFJoinOverlay);
        else reject(new Error('Join Overlay API unavailable'));
      }, { once: true });
      script.addEventListener('error', () => reject(new Error('Unable to load Join Overlay')), { once: true });
      document.head.appendChild(script);
    }).catch((error) => {
      joinOverlayLoader = null;
      throw error;
    });
    return joinOverlayLoader;
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function normalizeSubLabel(value) {
    const raw = String(value || '').trim();
    if (!raw) return '';
    if (raw.toLowerCase() === 'workspace') return '';
    return raw;
  }

  function renderBrandLogo(config, brandName) {
    if (config.logoSrc) {
      const size = config.logoSize || 28;
      return `<img src="${escapeHtml(config.logoSrc)}" alt="${escapeHtml(brandName)}" class="lab-header__logo" width="${size}" height="${size}" loading="eager" decoding="async">`;
    }

    return `
      <picture>
        <source srcset="https://ui.quizzman.com/qmf/assets/logo/quizzman-logo-116.webp 1x, https://ui.quizzman.com/qmf/assets/logo/quizzman-logo-232.webp 2x" type="image/webp">
        <img src="https://ui.quizzman.com/qmf/assets/logo/quizzman-logo-116.png" srcset="https://ui.quizzman.com/qmf/assets/logo/quizzman-logo-116.png 1x, https://ui.quizzman.com/qmf/assets/logo/quizzman-logo.png 2x" alt="${escapeHtml(brandName)}" class="lab-header__logo" width="116" height="63" loading="eager" decoding="async">
      </picture>
    `;
  }

  function detectActiveNavState() {
    const host = window.location.hostname;
    const path = window.location.pathname;

    if (host === 'quizzman.com' || host === 'www.quizzman.com') {
      return { section: 'home' };
    }

    if (host === 'mentis.quizzman.com') {
      return { section: 'app', child: 'mentis' };
    }

    if (host === 'lms.quizzman.com') {
      return { section: 'app', child: 'lms' };
    }

    if (host === 'app.quizzman.com') {
      if (path.startsWith('/quiz-editor')) return { section: 'app', child: 'quiz-editor' };
      if (path.startsWith('/slide-studio')) return { section: 'app', child: 'slide-studio' };
      return { section: 'app', child: 'app-platform' };
    }

    if (host === 'insight.quizzman.com' || host === 'lab.quizzman.com') {
      if (path.startsWith('/tool/iching-divination')) return { section: 'app', child: 'iching' };
      if (path.startsWith('/tool/calendar-converter')) return { section: 'app', child: 'calendar' };
      if (path.startsWith('/zodiac-sign')) return { section: 'app', child: 'zodiac-sign' };
      if (path.startsWith('/tarot')) return { section: 'app', child: 'tarot' };
      if (path.startsWith('/vedic')) return { section: 'app', child: 'vedic' };
      return { section: 'app', child: 'lab' };
    }

    if (host === 'wiki.quizzman.com') {
      return { section: 'tri-thuc', child: 'wiki' };
    }

    if (host === 'dict.quizzman.com') {
      return { section: 'tri-thuc', child: 'dictionary' };
    }

    if (host === 'ui.quizzman.com') {
      return { section: 'tri-thuc', child: 'docs' };
    }

    if (host === 'search.quizzman.com' || host === 'lib.quizzman.com') {
      return { section: 'tri-thuc', child: 'search' };
    }

    if (host === 'hsk.quizzman.com' || host === 'study.quizzman.com') {
      return { section: 'app', child: 'mandarin' };
    }

    if (host === 'class.quizzman.com') {
      if (path.includes('assignment') || path.includes('homework')) {
        return { section: 'app', child: 'assignment' };
      }
      return { section: 'app', child: 'classroom' };
    }

    if (host === 'play.quizzman.com') {
      if (path.startsWith('/quiz')) return { section: 'hoc', child: 'live-quiz' };
      if (path.startsWith('/slide')) return { section: 'hoc', child: 'present' };
      if (path.startsWith('/pikahans')) return { section: 'game', child: 'practice' };
      if (path.startsWith('/idiom-king')) return { section: 'game', child: 'challenges' };
      if (path.startsWith('/tycoon')) return { section: 'game', child: 'tycoon' };
      if (path.startsWith('/arena')) return { section: 'game', child: 'arena' };
      return { section: 'game', child: 'edu-games' };
    }

    return {};
  }

  function renderMegaIcon(child) {
    const stacked = child.iconBadge === 'play';
    const badge = stacked
      ? `<span class="lab-header__mega-icon-badge" aria-hidden="true">${PLAY_BADGE_SVG}</span>`
      : '';
    if (child.iconImg) {
      const alt = escapeHtml(child.iconAlt || child.label);
      const src = escapeHtml(child.iconImg);
      const src2x = child.iconImg2x ? escapeHtml(child.iconImg2x) : '';
      const webp = child.iconImgWebp ? escapeHtml(child.iconImgWebp) : '';
      const webp2x = child.iconImgWebp2x ? escapeHtml(child.iconImgWebp2x) : '';
      const pngSrcset = src2x ? `${src} 1x, ${src2x} 2x` : src;
      const webpSrcset = webp && webp2x ? `${webp} 1x, ${webp2x} 2x` : webp;

      return `
        <span class="lab-header__mega-icon lab-header__mega-icon--img${stacked ? ' lab-header__mega-icon--stacked' : ''}" aria-hidden="true">
          <picture>
            ${webpSrcset ? `<source type="image/webp" srcset="${webpSrcset}">` : (webp ? `<source type="image/webp" srcset="${webp}">` : '')}
            <img src="${src}" ${src2x ? `srcset="${pngSrcset}"` : ''} alt="${alt}" width="20" height="20" loading="lazy" decoding="async">
          </picture>
          ${badge}
        </span>
      `;
    }

    return `<span class="lab-header__mega-icon" aria-hidden="true">${escapeHtml(child.icon || child.label.charAt(0))}</span>`;
  }

  function renderMegaCard(child, activeChild) {
    const isActive = child.id === activeChild;
    const isDisabled = !!child.disabled;
    const icon = renderMegaIcon(child);

    const body = `
      ${icon}
      <span class="lab-header__mega-body">
        <span class="lab-header__mega-title"${child.labelKey ? i18nAttr(child.labelKey) : ''}>${escapeHtml(child.label)}</span>
        <span class="lab-header__mega-desc"${child.descKey ? i18nAttr(child.descKey) : ''}>${escapeHtml(child.description || '')}</span>
      </span>
    `;

    if (isDisabled) {
      return `
        <span class="lab-header__mega-card lab-header__mega-card--disabled${isActive ? ' is-active' : ''}" role="menuitem" aria-disabled="true">
          ${body}
        </span>
      `;
    }

    return `
      <a class="lab-header__mega-card${isActive ? ' is-active' : ''}" href="${escapeHtml(child.href)}" role="menuitem">
        ${body}
      </a>
    `;
  }

  function renderNavDropdown(item, activeState) {
    const isSectionActive = item.id === activeState.section;
    const children = item.children || [];
    const grouped = children.some((child) => child.group);
    const groups = [];

    children.forEach((child) => {
      const label = child.group || '';
      const groupKey = child.groupKey || '';
      let group = groups.find((candidate) => candidate.label === label);
      if (!group) {
        group = { label, groupKey, children: [] };
        groups.push(group);
      }
      group.children.push(child);
    });

    const cards = grouped
      ? groups.map((group) => `
          <section class="lab-header__mega-section">
            <div class="lab-header__mega-section-title"${group.groupKey ? i18nAttr(group.groupKey) : ''}>${escapeHtml(group.label)}</div>
            <div class="lab-header__mega-section-items">
              ${group.children.map((child) => renderMegaCard(child, activeState.child)).join('')}
            </div>
          </section>
        `).join('')
      : children.map((child) => renderMegaCard(child, activeState.child)).join('');
    const count = children.length;
    const wide = count >= 4;

    return `
      <div class="lab-header__nav-item lab-header__nav-item--dropdown${isSectionActive ? ' is-active' : ''}" data-nav-id="${escapeHtml(item.id)}">
        <button type="button" class="lab-header__nav-link lab-header__nav-trigger${isSectionActive ? ' is-active' : ''}" aria-expanded="false" aria-haspopup="true" aria-label="${escapeHtml(item.label)}" title="${escapeHtml(item.label)}"${item.labelKey ? i18nAttr(item.labelKey) : ''}>
          ${navSectionIcon(item.id)}
          <span class="lab-header__nav-text"${item.labelKey ? i18nAttr(item.labelKey) : ''}>${escapeHtml(item.label)}</span>
          <svg class="lab-header__nav-chevron" width="10" height="10" viewBox="0 0 12 12" aria-hidden="true"><path d="M3 4.5 6 7.5 9 4.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
        </button>
        <div class="lab-header__mega${wide ? ' lab-header__mega--wide' : ''}" role="menu" aria-label="${escapeHtml(item.label)}"${item.labelKey ? i18nAttr(item.labelKey) : ''}>
          <div class="lab-header__mega-grid">
            ${cards}
          </div>
        </div>
      </div>
    `;
  }

  function renderNavLink(item, activeState) {
    const isSectionActive = item.id === activeState.section;
    const compact = !!item.compact;
    const keyAttr = item.labelKey ? i18nAttr(item.labelKey) : '';
    return `
      <a
        class="lab-header__nav-link${compact ? ' lab-header__nav-link--compact' : ''}${isSectionActive ? ' is-active' : ''}"
        href="${escapeHtml(item.href)}"
        data-nav-id="${escapeHtml(item.id)}"
        aria-label="${escapeHtml(item.label)}"
        title="${escapeHtml(item.label)}"${keyAttr}
      >
        ${navSectionIcon(item.id)}
        <span class="${compact ? 'sr-only' : 'lab-header__nav-text'}"${keyAttr}>${escapeHtml(item.label)}</span>
      </a>
    `;
  }

  function renderNavItem(item, activeState) {
    if (item.children && item.children.length) return renderNavDropdown(item, activeState);
    return renderNavLink(item, activeState);
  }

  function buildNavHtml(navItems, activeState) {
    return navItems.map((item) => renderNavItem(item, activeState)).join('');
  }

  function renderMobileNavSection(item, activeState) {
    const isSectionActive = item.id === activeState.section;

    if (item.children && item.children.length) {
      let currentGroup = null;
      const children = item.children.map((child) => {
        const isActive = child.id === activeState.child;
        const icon = renderMegaIcon(child);
        const groupLabel = child.group && child.group !== currentGroup
          ? `<span class="lab-header__drawer-group-label"${child.groupKey ? i18nAttr(child.groupKey) : ''}>${escapeHtml(child.group)}</span>`
          : '';
        currentGroup = child.group || null;

        if (child.disabled) {
          return `
            ${groupLabel}
            <span class="lab-header__drawer-item lab-header__drawer-item--disabled${isActive ? ' is-active' : ''}" aria-disabled="true">
              ${icon}
              <span class="lab-header__drawer-item-body">
                <span class="lab-header__drawer-item-title"${child.labelKey ? i18nAttr(child.labelKey) : ''}>${escapeHtml(child.label)}</span>
                <span class="lab-header__drawer-item-desc"${child.descKey ? i18nAttr(child.descKey) : ''}>${escapeHtml(child.description || '')}</span>
              </span>
            </span>
          `;
        }

        return `
          ${groupLabel}
          <a class="lab-header__drawer-item${isActive ? ' is-active' : ''}" href="${escapeHtml(child.href)}">
            ${icon}
            <span class="lab-header__drawer-item-body">
              <span class="lab-header__drawer-item-title"${child.labelKey ? i18nAttr(child.labelKey) : ''}>${escapeHtml(child.label)}</span>
              <span class="lab-header__drawer-item-desc"${child.descKey ? i18nAttr(child.descKey) : ''}>${escapeHtml(child.description || '')}</span>
            </span>
          </a>
        `;
      }).join('');

      return `
        <div class="lab-header__drawer-section${isSectionActive ? ' is-active' : ''}">
          <div class="lab-header__drawer-section-head">
            <span class="lab-header__drawer-section-label"${item.labelKey ? i18nAttr(item.labelKey) : ''}>${escapeHtml(item.label)}</span>
          </div>
          <div class="lab-header__drawer-section-items">${children}</div>
        </div>
      `;
    }

    return `
      <a class="lab-header__drawer-link${isSectionActive ? ' is-active' : ''}" href="${escapeHtml(item.href)}"${item.labelKey ? i18nAttr(item.labelKey) : ''}>
        <span class="lab-header__drawer-link-text"${item.labelKey ? i18nAttr(item.labelKey) : ''}>${escapeHtml(item.label)}</span>
      </a>
    `;
  }

  function flattenNavLinks(navItems) {
    const out = [];
    const seen = new Set();
    const push = (entry) => {
      const key = entry.id || entry.href;
      if (!key || seen.has(key)) return;
      seen.add(key);
      out.push(entry);
    };
    (navItems || []).forEach((item) => {
      if (item.href && item.href !== '#') {
        push({
          id: item.id,
          label: item.label,
          description: item.description || '',
          href: item.href,
          icon: item.icon,
          iconImg: item.iconImg,
          iconBadge: item.iconBadge,
        });
      }
      (item.children || []).forEach((child) => {
        if (child.disabled || !child.href) return;
        push({
          id: child.id,
          label: child.label,
          description: child.description || '',
          href: child.href,
          icon: child.icon,
          iconImg: child.iconImg,
          iconBadge: child.iconBadge,
        });
      });
    });
    return out;
  }

  /** Multilingual aliases so header search finds system apps beyond nav label/desc. */
  const APP_SEARCH_ALIASES = {
    'quiz-editor': ['tạo quiz', 'quiz editor', 'ngân hàng câu hỏi', 'question bank', '问答编辑器', '問答編輯器'],
    'slide-studio': ['slide studio', 'soạn slide', 'presentation', 'trình chiếu', '幻灯片', '幻燈片'],
    'game-editor': ['tạo game', 'game editor', 'trò chơi', '游戏编辑器', '遊戲編輯器'],
    'assignment': ['bài tập', 'homework', 'giao bài', '作业', '作業'],
    'library': ['thư viện', 'library', 'kho tài liệu', '图书馆', '圖書館'],
    'classroom': ['lớp học', 'classroom', 'virtual classroom', '教室', '课堂'],
    'dictionary': ['từ điển', 'dictionary', 'hán nôm', 'hán việt', '词典', '詞典', '字典'],
    'wiki': ['wiki', 'bách khoa', 'encyclopedia', '百科'],
    'docs': ['docs', 'tài liệu', 'documentation', '文档', '文檔'],
    'ai-knowledge': ['mentis', 'ai knowledge', 'hỏi mentis'],
    'search': ['search', 'tìm kiếm', '搜索', '搜尋'],
    'live-quiz': ['live quiz', 'play', 'chơi quiz', 'thi đấu'],
    'present': ['present', 'trình chiếu', 'live slide', 'interactive slides', '演示', '簡報', '投影片'],
    'lms': ['lms', 'học tập', 'learning management', '学习管理'],
    'iching': ['kinh dịch', 'i-ching', 'i ching', 'quẻ', 'hexagram', '易经', '易經', 'yijing'],
    'calendar': ['lịch', 'calendar', 'ngày tốt', 'âm lịch', 'dương lịch', '历法', '曆法'],
    'astro': ['astro', 'thiên văn', 'astronomy', 'bầu trời', 'planetarium', '天文', '星空'],
    'zodiac-sign': [
      'cung hoàng đạo', '12 cung hoàng đạo', '12 cung', 'hoàng đạo', 'zodiac', 'zodiac sign',
      'star sign', 'chiêm tinh', 'western zodiac',
      'bạch dương', 'kim ngưu', 'song tử', 'cự giải', 'sư tử', 'xử nữ',
      'thiên bình', 'bọ cạp', 'nhân mã', 'ma kết', 'bảo bình', 'song ngư',
      'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
      'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces',
      '星座', '十二星座', '西方星座',
    ],
    'tarot': ['bói tarot', 'tarot', 'rider waite', 'gieo bài', 'rút bài', 'major arcana', '塔罗', '塔羅'],
    'vedic': ['vedic', 'jyotish', 'jyotiṣa', 'jyotisha', 'chiêm tinh ấn độ', 'hindu astrology', 'nakshatra', '吠陀', '印度占星'],
    'mandarin': ['mandarin', 'tiếng trung', 'chinese', 'hsk', '中文', '汉语'],
    'tycoon': ['tycoon', 'tỷ phú', 'board game', 'đô thị', 'đổ xúc xắc', '大亨', '垄断', '知識城區', '知识城区'],
    'arena': ['the vault', 'vault', 'arena', 'rương', 'kho bạc', 'đặt cược', '金库', '金庫', '竞技场', '競技場', '宝箱'],
    'jck-font': ['jck', 'font', 'chữ hán', 'glyph', '字体', '字體'],
    'tuvi': ['tử vi', 'zi wei', '紫微', 'đẩu số', 'lá số'],
    'bazi': ['bát tự', 'tứ trụ', 'ba zi', 'four pillars', '八字', '四柱'],
  };

  function searchTokens(text) {
    return String(text || '')
      .toLowerCase()
      .normalize('NFC')
      .split(/[\s,.;:!?\-_|/\\()[\]{}'"`~+·•]+/)
      .filter(Boolean);
  }

  function scoreLocalApp(query, item) {
    const q = String(query || '').trim().toLowerCase().normalize('NFC');
    if (!q) return 0;

    const aliases = APP_SEARCH_ALIASES[item.id] || [];
    const label = String(item.label || '').toLowerCase().normalize('NFC');
    const desc = String(item.description || '').toLowerCase().normalize('NFC');
    const id = String(item.id || '').toLowerCase().replace(/-/g, ' ');
    const aliasHay = aliases.map((a) => String(a).toLowerCase().normalize('NFC'));
    const hay = [label, desc, id, ...aliasHay].join(' · ');

    if (label === q || aliasHay.includes(q)) return 5;
    if (label.startsWith(q)) return 4.5;
    if (label.includes(q)) return 4;
    if (aliasHay.some((a) => a.startsWith(q) || a.includes(q))) return 3.5;
    if (hay.includes(q) || id.includes(q) || String(item.id || '').toLowerCase().includes(q)) return 3;

    const qTokens = searchTokens(q).filter((t) => t.length > 1 || /\d/.test(t));
    if (!qTokens.length) return 0;

    const hitCount = qTokens.filter((t) => hay.includes(t)).length;
    if (hitCount === qTokens.length) return 2.4 + Math.min(qTokens.length, 5) * 0.1;
    if (hitCount >= 2 && hitCount >= Math.ceil(qTokens.length * 0.75)) {
      return 1.2 + hitCount * 0.2;
    }
    return 0;
  }

  function matchLocalApps(query, limit = 5) {
    const q = String(query || '').trim();
    if (!q) return [];
    return flattenNavLinks(getQuizzmanNavItems())
      .map((it) => ({ it, score: scoreLocalApp(q, it) }))
      .filter((row) => row.score > 0)
      .sort((a, b) => b.score - a.score || String(a.it.label || '').localeCompare(String(b.it.label || '')))
      .slice(0, limit)
      .map((row) => row.it);
  }

  function cleanSearchSnippet(text, max = 120) {
    const cleaned = String(text || '').replace(/\s+/g, ' ').trim();
    if (cleaned.length <= max) return cleaned;
    return `${cleaned.slice(0, max - 1)}…`;
  }

  function hitUrl(hit) {
    return hit?.url || hit?.play_url || hit?.editor_url || '';
  }

  function renderSearch(config) {
    if (config.showSearch === false) return '';
    const ph = ht('search.placeholder', config.searchPlaceholder || 'Search apps, knowledge…');
    const openLbl = ht('search.open', 'Search');
    const closeLbl = ht('search.close', 'Close search');
    const srLbl = ht('search.sr', 'Search Quizzman');
    const ariaLbl = ht('search.aria', ph);

    return `
      <button type="button" class="lab-header__search-btn" data-qmf-search-toggle aria-label="${escapeHtml(openLbl)}"${i18nAttr('search.open')} aria-expanded="false" aria-controls="qmf-global-search">
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
          <circle cx="7" cy="7" r="4.5" fill="none" stroke="currentColor" stroke-width="1.5"/>
          <path d="M10.5 10.5 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
      </button>
      <div class="lab-header__search-wrap" data-qmf-search-wrap>
        <form class="lab-header__search" role="search" data-qmf-search>
          <label class="lab-header__search-label" for="qmf-global-search">
            <svg class="lab-header__search-icon" width="15" height="15" viewBox="0 0 16 16" aria-hidden="true">
              <circle cx="7" cy="7" r="4.5" fill="none" stroke="currentColor" stroke-width="1.5"/>
              <path d="M10.5 10.5 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
            <span class="sr-only"${i18nAttr('search.sr')}>${escapeHtml(srLbl)}</span>
          </label>
          <input
            id="qmf-global-search"
            class="lab-header__search-input"
            type="search"
            name="q"
            autocomplete="off"
            spellcheck="false"
            placeholder="${escapeHtml(ph)}"
            data-qmf-i18n-placeholder="search.placeholder"
            aria-label="${escapeHtml(ariaLbl)}"${i18nAttr('search.aria')}
            aria-autocomplete="list"
            aria-controls="qmf-search-panel"
            aria-expanded="false"
          />
          <span class="lab-header__search-ai" aria-hidden="true" title="AI-powered search">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 3l1.9 4.6L18.5 9.5 13.9 11.4 12 16l-1.9-4.6L5.5 9.5l4.6-1.9z"/>
              <path d="M19 15l.8 1.9L21.7 17.7 19.8 18.5 19 20.5 18.2 18.5 16.3 17.7 18.2 16.9z"/>
            </svg>
          </span>
          <kbd class="lab-header__search-kbd" aria-hidden="true">⌘K</kbd>
          <button type="button" class="lab-header__search-dismiss" data-qmf-search-dismiss aria-label="${escapeHtml(closeLbl)}"${i18nAttr('search.close')}>
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M3 3l8 8M11 3 3 11" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
          </button>
        </form>
        <div
          id="qmf-search-panel"
          class="lab-header__search-panel"
          data-qmf-search-panel
          role="listbox"
          hidden
        ></div>
      </div>
    `;
  }

  function renderJoinQuizButton(config) {
    if (config.showJoinQuiz === false) return '';
    const label = escapeHtml(ht('join', config.joinQuizLabel || 'Join Quiz'));
    return `
      <button type="button" class="lab-header__join-quiz" data-qmf-header-join aria-haspopup="dialog" aria-label="${label}"${i18nAttr('join')}>
        <svg class="lab-header__join-quiz-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M7.2 9.5h3.6M9 7.7v3.6M15.4 8.6h.01M17.4 10.5h.01" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>
          <path d="M7 5.5h10a4 4 0 0 1 3.94 3.3l.8 4.6a2.7 2.7 0 0 1-4.78 2.15l-1.15-1.45H8.19l-1.15 1.45a2.7 2.7 0 0 1-4.78-2.15l.8-4.6A4 4 0 0 1 7 5.5Z" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/>
        </svg>
        <span class="lab-header__join-quiz-label"${i18nAttr('join')}>${label}</span>
      </button>
    `;
  }

  class UnifiedHeader {
    constructor(container, config = {}) {
      this.container = typeof container === 'string'
        ? document.querySelector(container)
        : container;

      if (!this.container) {
        console.error('[QMF Header] Container not found');
        return;
      }

      this.config = { ...DEFAULT_CONFIG, ...config };
      this.navItems = this.config.navItems || getQuizzmanNavItems();
      this.activeState = detectActiveNavState();
      this.headerEl = null;
      this.openDropdown = null;
      this.drawerOpen = false;
      this.boundDocClick = this.handleDocumentClick.bind(this);
      this.boundKeydown = this.handleKeydown.bind(this);
      this.boundJoinClick = null;

      this.init();
    }

    init() {
      this.render();
      this.setupThemeAwareness();
      if (this.config.showGlobalNav) {
        this.setupNavigation();
      }
      if (this.config.showSearch !== false) {
        this.setupSearch();
      }
      if (this.config.showJoinQuiz !== false) {
        this.setupJoinQuiz();
      }
      if (this.config.showNotification !== false && this.config.autoMountLegatus !== false) {
        this.mountLegatus();
      }
      this.bindLangWatch();
      document.body.classList.add('has-qmf-header');
      if (window.__QMF_DEBUG__) console.log(`[QMF Header] v${VERSION} initialized`);
    }

    bindLangWatch() {
      if (this._langWatchBound) return;
      this._langWatchBound = true;
      this._onLangChange = () => this.applyI18n();
      window.addEventListener('qmf:langchange', this._onLangChange);
      window.addEventListener('qmf:lang-change', this._onLangChange);
      window.addEventListener('qmf:prefs-change', this._onLangChange);
      window.addEventListener('qmf:i18n-applied', this._onLangChange);
    }

    /**
     * Live-apply language without remounting whole header (auth-widget stays).
     * Rebuilds nav + drawer from localized packs so every label/desc updates.
     */
    applyI18n() {
      if (!this.headerEl) return;
      if (!this.config.navItems) {
        this.navItems = getQuizzmanNavItems();
      }

      const navRoot = this.headerEl.querySelector('.lab-header__nav');
      if (navRoot && this.config.showGlobalNav) {
        navRoot.setAttribute('aria-label', ht('nav.aria', 'Quizzman navigation'));
        navRoot.setAttribute('data-i18n', 'header.nav.aria');
        navRoot.innerHTML = buildNavHtml(this.navItems, this.activeState);
        this.bindNavDropdowns();
      }

      const drawerBody = this.headerEl.querySelector('.lab-header__drawer-body')
        || document.querySelector('#lab-header-drawer .lab-header__drawer-body');
      if (drawerBody && this.config.showGlobalNav) {
        drawerBody.innerHTML = this.navItems
          .map((item) => renderMobileNavSection(item, this.activeState))
          .join('');
      }

      // Search / join / chrome controls
      this.headerEl.querySelectorAll('[data-qmf-i18n]').forEach((el) => {
        const key = el.getAttribute('data-qmf-i18n');
        if (!key) return;
        const val = ht(key, el.textContent);
        const isTextHost = el.classList.contains('lab-header__nav-text')
          || el.classList.contains('lab-header__join-quiz-label')
          || el.classList.contains('lab-header__mega-title')
          || el.classList.contains('lab-header__mega-desc')
          || el.classList.contains('lab-header__mega-section-title')
          || el.classList.contains('lab-header__drawer-item-title')
          || el.classList.contains('lab-header__drawer-item-desc')
          || el.classList.contains('lab-header__drawer-group-label')
          || el.classList.contains('lab-header__drawer-section-label')
          || el.classList.contains('lab-header__drawer-link-text')
          || el.classList.contains('sr-only');
        if (isTextHost) el.textContent = val;
        if (el.hasAttribute('aria-label') || el.matches('button.lab-header__search-btn, button.lab-header__search-dismiss, button.lab-header__join-quiz, button.lab-header__mobile-menu, button.lab-header__drawer-close, a.lab-header__nav-link')) {
          el.setAttribute('aria-label', val);
        }
        if (el.hasAttribute('title')) el.setAttribute('title', val);
      });

      this.headerEl.querySelectorAll('[data-qmf-i18n-placeholder]').forEach((el) => {
        const key = el.getAttribute('data-qmf-i18n-placeholder');
        el.setAttribute('placeholder', ht(key, el.getAttribute('placeholder') || ''));
      });

      const joinLbl = this.headerEl.querySelector('.lab-header__join-quiz-label');
      if (joinLbl) joinLbl.textContent = ht('join', joinLbl.textContent);
    }

    mountLegatus() {
      const slot = this.container?.querySelector('[data-qmf-notification-slot]');
      if (!slot) return;

      const run = () => {
        if (typeof window.mountLegatusInHeader !== 'function') return;
        window.mountLegatusInHeader({
          slot: slot,
          endpoint: this.config.legatusEndpoint || LEGATUS_ENDPOINT,
        });
      };

      if (typeof window.mountLegatusInHeader === 'function') {
        run();
        return;
      }

      if (document.getElementById('qmf-legatus-bridge-js')) {
        const start = Date.now();
        const wait = () => {
          if (typeof window.mountLegatusInHeader === 'function') return run();
          if (Date.now() - start > 5000) return;
          setTimeout(wait, 50);
        };
        wait();
        return;
      }

      const script = document.createElement('script');
      script.id = 'qmf-legatus-bridge-js';
      script.src = LEGATUS_BRIDGE;
      script.defer = true;
      script.onload = run;
      script.onerror = () => console.warn('[QMF Header] Legatus bridge failed to load');
      document.head.appendChild(script);
    }

    setupThemeAwareness() {
      const update = () => {
        const dark = document.documentElement.getAttribute('data-theme') === 'dark'
          || (!document.documentElement.getAttribute('data-theme')
            && window.matchMedia('(prefers-color-scheme: dark)').matches);

        if (this.config.logoSrc) return;

        this.container.querySelectorAll('img').forEach((logo) => {
          if (dark && logo.src.includes('quizzman-logo.png') && !logo.src.includes('dark')) {
            logo.src = logo.src.replace('quizzman-logo.png', 'quizzman-logo-dark.png');
          } else if (!dark && logo.src.includes('quizzman-logo-dark.png')) {
            logo.src = logo.src.replace('quizzman-logo-dark.png', 'quizzman-logo.png');
          }
        });
      };

      update();
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', update);
      new MutationObserver(update).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    }

    render() {
      const { brandName, pageTitle, productSub, showGlobalNav } = this.config;
      const appName = pageTitle || brandName;
      const subLabel = normalizeSubLabel(productSub);
      const badge = String(this.config.brandBadge || '').trim();

      const navHtml = showGlobalNav
        ? `<nav class="lab-header__nav" aria-label="${escapeHtml(ht('nav.aria', 'Quizzman navigation'))}">${buildNavHtml(this.navItems, this.activeState)}</nav>`
        : '';

      const qmGroupHtml = showGlobalNav ? '' : `
        <a href="${escapeHtml(this.config.mainLogoLink || 'https://quizzman.com')}" class="lab-header__qm-group" title="Quizzman">
          <picture>
            <source srcset="https://ui.quizzman.com/qmf/assets/logo/quizzman-logo-116.webp 1x, https://ui.quizzman.com/qmf/assets/logo/quizzman-logo-232.webp 2x" type="image/webp">
            <img src="https://ui.quizzman.com/qmf/assets/logo/quizzman-logo-116.png" srcset="https://ui.quizzman.com/qmf/assets/logo/quizzman-logo-116.png 1x, https://ui.quizzman.com/qmf/assets/logo/quizzman-logo.png 2x" alt="Quizzman" class="lab-header__qm-logo" width="116" height="63" loading="eager" decoding="async">
          </picture>
          <div class="lab-header__qm-texts">
            <span class="lab-header__qm-name">${escapeHtml(appName)}</span>
          </div>
        </a>
      `;

      const menuBtnHtml = showGlobalNav
        ? `<button type="button" class="lab-header__menu-btn lab-header__mobile-menu" aria-label="${escapeHtml(ht('menu.open', 'Open navigation menu'))}"${i18nAttr('menu.open')} aria-expanded="false" aria-controls="lab-header-drawer"><svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true"><path d="M3 5.5h14M3 10h14M3 14.5h14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></button>`
        : '';

      const drawerHtml = showGlobalNav
        ? `
          <div class="lab-header__drawer-backdrop" hidden></div>
          <aside id="lab-header-drawer" class="lab-header__drawer" aria-hidden="true" aria-label="Quizzman navigation menu">
            <div class="lab-header__drawer-head">
              <span class="lab-header__drawer-title">Quizzman</span>
              <button type="button" class="lab-header__drawer-close" aria-label="${escapeHtml(ht('menu.close', 'Close navigation menu'))}"${i18nAttr('menu.close')}>
                <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M4.5 4.5 13.5 13.5M13.5 4.5 4.5 13.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
              </button>
            </div>
            <div class="lab-header__drawer-body">
              ${this.navItems.map((item) => renderMobileNavSection(item, this.activeState)).join('')}
            </div>
            <div class="lab-header__drawer-extras" data-drawer-extras></div>
          </aside>
        `
        : '';

      const inFlow = !!this.config.headerInFlow;
      const brandHref = this.config.brandHref || '/';

      this.container.innerHTML = `
        <header class="lab-header${showGlobalNav ? ' lab-header--has-nav' : ''}${inFlow ? ' lab-header--in-flow' : ''}" role="banner">
          <div class="lab-header__inner">
            <a href="${escapeHtml(brandHref)}" class="lab-header__brand">
              ${renderBrandLogo(this.config, brandName)}
              <div class="lab-header__titles">
                <span class="lab-header__title-row">
                  <span class="lab-header__name lab-header__brand-title">${escapeHtml(appName)}</span>
                  ${badge ? `<span class="lab-header__badge">${escapeHtml(badge)}</span>` : ''}
                </span>
                ${subLabel ? `<span class="lab-header__sub lab-header__brand-subtitle">${escapeHtml(subLabel)}</span>` : ''}
              </div>
            </a>
            ${navHtml}
            <div class="lab-header__spacer" aria-hidden="true"></div>
            ${qmGroupHtml}
            <div class="lab-header__spacer lab-header__spacer--end" aria-hidden="true"></div>
            ${renderSearch(this.config)}
            <div class="lab-header__actions">
              ${renderJoinQuizButton(this.config)}
              ${this.config.showNotification !== false ? `<div class="lab-header__notification-slot" data-qmf-notification-slot aria-label="${escapeHtml(ht('notify', 'Notifications'))}" data-qmf-i18n="notify" title="${escapeHtml(ht('notify', 'Notifications'))}"></div>` : ''}
            </div>
            ${menuBtnHtml}
          </div>
          ${drawerHtml}
        </header>
      `;

      this.headerEl = this.container.querySelector('.lab-header');

      if (inFlow) {
        document.body.classList.add('lab-header--in-flow');
      }
    }

    setupJoinQuiz() {
      const button = this.headerEl?.querySelector('[data-qmf-header-join]');
      if (!button) return;
      this.boundJoinClick = async () => {
        if (button.disabled) return;
        button.disabled = true;
        button.classList.add('is-loading');
        try {
          const api = await loadJoinOverlay(this.config.joinOverlayBase);
          api.open({ source: 'global-header' });
        } catch (error) {
          console.error('[QMF Header] Join Overlay failed to load', error);
          window.dispatchEvent(new CustomEvent('qmf:join-error', {
            detail: { message: error?.message || 'Unable to open Join Quiz', source: 'global-header' },
          }));
        } finally {
          button.disabled = false;
          button.classList.remove('is-loading');
        }
      };
      button.addEventListener('click', this.boundJoinClick);
    }

    setupSearch() {
      const wrap = this.headerEl?.querySelector('[data-qmf-search-wrap]');
      const form = this.headerEl?.querySelector('[data-qmf-search]');
      const input = form?.querySelector('.lab-header__search-input');
      const panel = wrap?.querySelector('[data-qmf-search-panel]');
      const toggle = this.headerEl?.querySelector('[data-qmf-search-toggle]');
      const dismiss = form?.querySelector('[data-qmf-search-dismiss]');
      if (!form || !input || !panel) return;

      this._searchActiveIdx = -1;
      this._searchLinks = [];
      this._searchAbort = null;
      this._searchTimer = null;
      this._searchSeq = 0;

      const setSearchOpen = (open) => {
        this.headerEl?.classList.toggle('lab-header--search-open', open);
        toggle?.setAttribute('aria-expanded', open ? 'true' : 'false');
        if (open) {
          requestAnimationFrame(() => {
            input.focus();
            input.select?.();
          });
        } else {
          input.blur();
          closePanel();
        }
      };

      const closePanel = () => {
        panel.hidden = true;
        panel.innerHTML = '';
        input.setAttribute('aria-expanded', 'false');
        this._searchActiveIdx = -1;
        this._searchLinks = [];
        wrap?.classList.remove('lab-header__search-wrap--open');
      };

      const openPanel = () => {
        panel.hidden = false;
        input.setAttribute('aria-expanded', 'true');
        wrap?.classList.add('lab-header__search-wrap--open');
      };

      const viewAllUrl = (q) => {
        const tpl = this.config.searchUrl || 'https://search.quizzman.com/?q={q}';
        return tpl.includes('{q}')
          ? tpl.replace('{q}', encodeURIComponent(q))
          : `${tpl}${tpl.includes('?') ? '&' : '?'}q=${encodeURIComponent(q)}`;
      };

      const setActiveIdx = (idx) => {
        const items = panel.querySelectorAll('[data-qmf-search-item]');
        if (!items.length) {
          this._searchActiveIdx = -1;
          return;
        }
        const next = ((idx % items.length) + items.length) % items.length;
        this._searchActiveIdx = next;
        items.forEach((el, i) => {
          el.classList.toggle('is-active', i === next);
          if (i === next) el.setAttribute('aria-selected', 'true');
          else el.removeAttribute('aria-selected');
        });
        items[next]?.scrollIntoView?.({ block: 'nearest' });
      };

      const renderPanel = ({ query, apps, hits, loading, error }) => {
        const q = String(query || '').trim();
        if (!q) {
          closePanel();
          return;
        }

        const appsHtml = (apps || []).map((app, i) => {
          const stacked = app.iconBadge === 'play';
          const badge = stacked
            ? `<span class="lab-header__mega-icon-badge" aria-hidden="true">${PLAY_BADGE_SVG}</span>`
            : '';
          const icon = app.iconImg
            ? (stacked
              ? `<span class="lab-header__search-hit-icon-wrap lab-header__search-hit-icon-wrap--stacked"><img class="lab-header__search-hit-icon-img" src="${escapeHtml(app.iconImg)}" alt="" width="20" height="20" loading="lazy">${badge}</span>`
              : `<img class="lab-header__search-hit-icon-img" src="${escapeHtml(app.iconImg)}" alt="" width="20" height="20" loading="lazy">`)
            : `<span class="lab-header__search-hit-icon" aria-hidden="true">${escapeHtml((app.icon || app.label || '?').toString().charAt(0))}</span>`;
          return `
            <a
              class="lab-header__search-hit"
              role="option"
              data-qmf-search-item
              data-idx="${i}"
              href="${escapeHtml(app.href)}"
            >
              ${icon}
              <span class="lab-header__search-hit-body">
                <span class="lab-header__search-hit-title">${escapeHtml(app.label)}</span>
                ${app.description ? `<span class="lab-header__search-hit-snip">${escapeHtml(app.description)}</span>` : ''}
              </span>
              <span class="lab-header__search-hit-type">app</span>
            </a>
          `;
        }).join('');

        const appCount = (apps || []).length;
        const hitsHtml = (hits || []).map((hit, i) => {
          const href = hitUrl(hit);
          if (!href) return '';
          const type = hit.type || hit._type || 'result';
          const title = hit.title || hit.doc_id || 'Untitled';
          const snip = cleanSearchSnippet(hit.snippet || '');
          const idx = appCount + i;
          return `
            <a
              class="lab-header__search-hit"
              role="option"
              data-qmf-search-item
              data-idx="${idx}"
              href="${escapeHtml(href)}"
            >
              <span class="lab-header__search-hit-icon" aria-hidden="true">${escapeHtml(String(type).charAt(0).toUpperCase())}</span>
              <span class="lab-header__search-hit-body">
                <span class="lab-header__search-hit-title">${escapeHtml(title)}</span>
                ${snip ? `<span class="lab-header__search-hit-snip">${escapeHtml(snip)}</span>` : ''}
              </span>
              <span class="lab-header__search-hit-type">${escapeHtml(type)}</span>
            </a>
          `;
        }).join('');

        const hasApps = !!(apps && apps.length);
        const hasHits = !!(hits && hits.length);
        let body = '';
        if (loading && !hasApps && !hasHits) {
          body = `<div class="lab-header__search-status">${escapeHtml(ht('search.loading', 'Searching…'))}</div>`;
        } else if (error && !hasApps && !hasHits) {
          body = `<div class="lab-header__search-status">${escapeHtml(error)}</div>`;
        } else if (!loading && !hasApps && !hasHits) {
          body = `<div class="lab-header__search-status">${escapeHtml(ht('search.empty', 'No results'))}</div>`;
        } else {
          body = `
            ${hasApps ? `<div class="lab-header__search-group-label"${i18nAttr('search.apps')}>${escapeHtml(ht('search.apps', 'Apps'))}</div>${appsHtml}` : ''}
            ${hasHits ? `<div class="lab-header__search-group-label"${i18nAttr('search.results')}>${escapeHtml(ht('search.results', 'Results'))}</div>${hitsHtml}` : ''}
            ${loading ? `<div class="lab-header__search-status lab-header__search-status--inline">${escapeHtml(ht('search.loading', 'Searching…'))}</div>` : ''}
          `;
        }

        const footer = `
          <a class="lab-header__search-footer" href="${escapeHtml(viewAllUrl(q))}" data-qmf-search-viewall>
            ${escapeHtml(ht('search.viewAll', 'See all on Search'))}
            <span aria-hidden="true">↗</span>
          </a>
        `;

        panel.innerHTML = `${body}${footer}`;
        this._searchLinks = Array.from(panel.querySelectorAll('[data-qmf-search-item]'));
        this._searchActiveIdx = this._searchLinks.length ? 0 : -1;
        if (this._searchActiveIdx >= 0) setActiveIdx(0);
        openPanel();
      };

      const fetchHits = async (query) => {
        const q = String(query || '').trim();
        const apps = matchLocalApps(q, 5);
        if (!q) {
          closePanel();
          return;
        }

        const seq = ++this._searchSeq;
        renderPanel({ query: q, apps, hits: [], loading: true });

        if (this._searchAbort) {
          try { this._searchAbort.abort(); } catch (_) { /* ignore */ }
        }
        const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
        this._searchAbort = ctrl;

        const api = (this.config.searchApiUrl || 'https://search.quizzman.com/api/search').replace(/\/+$/, '');
        // System UI lang → API locale (jp/kr → ja/ko). Multilingual query; display localized server-side.
        let searchLang = getHeaderLang();
        if (searchLang === 'jp') searchLang = 'ja';
        else if (searchLang === 'kr') searchLang = 'ko';
        const url = `${api}?q=${encodeURIComponent(q)}&limit=8&lang=${encodeURIComponent(searchLang)}`;

        try {
          const res = await fetch(url, {
            method: 'GET',
            credentials: 'omit',
            signal: ctrl?.signal,
            headers: {
              Accept: 'application/json',
              'Accept-Language': searchLang,
            },
          });
          if (seq !== this._searchSeq) return;
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = await res.json();
          if (seq !== this._searchSeq) return;
          const hits = Array.isArray(data?.hits) ? data.hits : [];
          renderPanel({ query: q, apps, hits, loading: false });
        } catch (err) {
          if (err?.name === 'AbortError') return;
          if (seq !== this._searchSeq) return;
          renderPanel({
            query: q,
            apps,
            hits: [],
            loading: false,
            error: apps.length ? '' : ht('search.empty', 'No results'),
          });
        }
      };

      const scheduleSearch = (query) => {
        clearTimeout(this._searchTimer);
        const q = String(query || '').trim();
        if (!q) {
          closePanel();
          return;
        }
        this._searchTimer = setTimeout(() => fetchHits(q), 450);
      };

      const runSearch = (query) => {
        const q = String(query || '').trim();
        const detail = { query: q, source: 'qmf-header', inline: true };
        window.dispatchEvent(new CustomEvent('qmf:global-search', { detail }));
        document.dispatchEvent(new CustomEvent('qmf:global-search', { detail }));

        if (!q) {
          input.focus();
          closePanel();
          return;
        }

        // Activate highlighted result, else refresh inline panel (no lib redirect)
        const active = panel.querySelector('.lab-header__search-hit.is-active');
        if (active?.href && !panel.hidden) {
          window.location.href = active.href;
          return;
        }
        clearTimeout(this._searchTimer);
        fetchHits(q);
      };

      toggle?.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const open = !this.headerEl?.classList.contains('lab-header--search-open');
        setSearchOpen(open);
      });

      dismiss?.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        setSearchOpen(false);
        input.value = '';
        closePanel();
      });

      form.addEventListener('submit', (e) => {
        e.preventDefault();
        runSearch(input.value);
      });

      input.addEventListener('input', () => {
        scheduleSearch(input.value);
      });

      input.addEventListener('focus', () => {
        // Desktop: mark open so the pill expands in-header (CSS); mobile uses overlay.
        if (!window.matchMedia('(max-width: 899px)').matches) {
          this.headerEl?.classList.add('lab-header--search-open');
        }
        if (String(input.value || '').trim()) scheduleSearch(input.value);
      });

      input.addEventListener('blur', () => {
        // Collapse after focus leaves the wrap (allow click into panel/results first).
        window.setTimeout(() => {
          if (wrap?.contains(document.activeElement)) return;
          if (!window.matchMedia('(max-width: 899px)').matches) {
            this.headerEl?.classList.remove('lab-header--search-open');
          }
        }, 120);
      });

      input.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          if (!panel.hidden) {
            e.preventDefault();
            closePanel();
            return;
          }
          if (this.headerEl?.classList.contains('lab-header--search-open')) {
            setSearchOpen(false);
          }
          input.blur();
          input.value = '';
          return;
        }
        if (panel.hidden || !this._searchLinks.length) return;
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setActiveIdx(this._searchActiveIdx + 1);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setActiveIdx(this._searchActiveIdx - 1);
        } else if (e.key === 'Enter') {
          const active = panel.querySelector('.lab-header__search-hit.is-active');
          if (active?.href) {
            e.preventDefault();
            window.location.href = active.href;
          }
        }
      });

      panel.addEventListener('mousemove', (e) => {
        const hit = e.target.closest?.('[data-qmf-search-item]');
        if (!hit) return;
        const idx = Number(hit.getAttribute('data-idx'));
        if (Number.isFinite(idx)) setActiveIdx(idx);
      });

      document.addEventListener('pointerdown', (e) => {
        if (!wrap?.contains(e.target) && !toggle?.contains(e.target)) {
          closePanel();
        }
      });

      document.addEventListener('keydown', (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
          e.preventDefault();
          if (window.matchMedia('(max-width: 899px)').matches) {
            setSearchOpen(true);
          } else {
            input.focus();
          }
        }
      });
    }

    bindNavDropdowns() {
      if (!this.headerEl) return;
      this.headerEl.querySelectorAll('.lab-header__nav-item--dropdown').forEach((item) => {
        if (item.dataset.qmfNavBound === '1') return;
        item.dataset.qmfNavBound = '1';
        const trigger = item.querySelector('.lab-header__nav-trigger');
        const dropdown = item.querySelector('.lab-header__mega');

        const positionDropdown = () => {
          if (!dropdown) return;
          dropdown.classList.remove('lab-header__mega--align-right');
          const rect = dropdown.getBoundingClientRect();
          if (rect.right > window.innerWidth - 12) {
            dropdown.classList.add('lab-header__mega--align-right');
          }
        };

        const open = () => {
          this.closeAllDropdowns();
          item.classList.add('is-open');
          trigger?.setAttribute('aria-expanded', 'true');
          this.openDropdown = item;
          requestAnimationFrame(positionDropdown);
        };

        const close = () => {
          item.classList.remove('is-open');
          trigger?.setAttribute('aria-expanded', 'false');
          if (this.openDropdown === item) this.openDropdown = null;
        };

        trigger?.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (item.classList.contains('is-open')) close();
          else open();
        });

        item.addEventListener('mouseenter', () => {
          if (window.matchMedia('(hover: hover)').matches) open();
        });

        item.addEventListener('mouseleave', () => {
          if (window.matchMedia('(hover: hover)').matches) close();
        });

        item.addEventListener('focusin', () => open());
        item.addEventListener('focusout', (e) => {
          if (!item.contains(e.relatedTarget)) close();
        });

        trigger?.addEventListener('keydown', (e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            open();
            item.querySelector('.lab-header__mega-card:not(.lab-header__mega-card--disabled)')?.focus();
          }
        });
      });
    }

    setupNavigation() {
      if (!this.headerEl) return;

      this.bindNavDropdowns();

      if (this._navChromeBound) return;
      this._navChromeBound = true;

      const menuBtn = this.headerEl.querySelector('.lab-header__mobile-menu');
      const drawer = this.headerEl.querySelector('.lab-header__drawer');
      const backdrop = this.headerEl.querySelector('.lab-header__drawer-backdrop');
      const closeBtn = this.headerEl.querySelector('.lab-header__drawer-close');

      // Portal to <body> so position:fixed is viewport-relative (header
      // backdrop-filter / transforms must not become the containing block).
      if (backdrop && backdrop.parentElement !== document.body) {
        document.body.appendChild(backdrop);
      }
      if (drawer && drawer.parentElement !== document.body) {
        document.body.appendChild(drawer);
      }

      const openDrawer = () => {
        this.drawerOpen = true;
        drawer?.setAttribute('aria-hidden', 'false');
        menuBtn?.setAttribute('aria-expanded', 'true');
        backdrop?.removeAttribute('hidden');
        this.headerEl?.classList.add('lab-header--drawer-open');
        document.body.classList.add('lab-header-drawer-open');
        try { if (drawer) drawer.scrollTop = 0; } catch (e) { /* ignore */ }
        closeBtn?.focus();
      };

      const closeDrawer = () => {
        this.drawerOpen = false;
        drawer?.setAttribute('aria-hidden', 'true');
        menuBtn?.setAttribute('aria-expanded', 'false');
        backdrop?.setAttribute('hidden', '');
        this.headerEl?.classList.remove('lab-header--drawer-open');
        document.body.classList.remove('lab-header-drawer-open');
        menuBtn?.focus();
      };

      menuBtn?.addEventListener('click', () => {
        if (this.drawerOpen) closeDrawer();
        else openDrawer();
      });

      closeBtn?.addEventListener('click', closeDrawer);
      backdrop?.addEventListener('click', closeDrawer);

      document.addEventListener('click', this.boundDocClick);
      document.addEventListener('keydown', this.boundKeydown);

      this.closeDrawer = closeDrawer;
    }

    closeAllDropdowns() {
      if (!this.headerEl) return;
      this.headerEl.querySelectorAll('.lab-header__nav-item--dropdown.is-open').forEach((item) => {
        item.classList.remove('is-open');
        item.querySelector('.lab-header__nav-trigger')?.setAttribute('aria-expanded', 'false');
      });
      this.openDropdown = null;
    }

    handleDocumentClick(e) {
      if (!this.openDropdown) return;
      if (!this.openDropdown.contains(e.target)) this.closeAllDropdowns();
    }

    handleKeydown(e) {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        const input = this.headerEl?.querySelector('.lab-header__search-input');
        if (input && this.config.showSearch !== false) {
          e.preventDefault();
          input.focus();
          input.select();
          return;
        }
      }

      if (e.key === 'Escape') {
        if (this.drawerOpen && this.closeDrawer) {
          this.closeDrawer();
          return;
        }
        this.closeAllDropdowns();
      }
    }

    destroy() {
      document.removeEventListener('click', this.boundDocClick);
      document.removeEventListener('keydown', this.boundKeydown);
      const joinButton = this.headerEl?.querySelector('[data-qmf-header-join]');
      if (joinButton && this.boundJoinClick) {
        joinButton.removeEventListener('click', this.boundJoinClick);
      }
      document.body.classList.remove('has-qmf-header', 'lab-header-drawer-open', 'lab-header--in-flow');
      if (this.container) this.container.innerHTML = '';
      this.headerEl = null;
    }
  }

  function loadStyles() {
    const sheets = [
      { id: 'qmf-header-styles', href: CDN_BASE + '/unified-header.css?v=' + VERSION },
      { id: 'qmf-lab-header-styles', href: CDN_NAV_BASE + '/lab-header.css?v=' + VERSION },
    ];

    sheets.forEach(({ id, href }) => {
      if (document.getElementById(id)) return;
      const link = document.createElement('link');
      link.id = id;
      link.rel = 'stylesheet';
      link.href = href;
      document.head.appendChild(link);
    });
  }

  window.UnifiedHeader = UnifiedHeader;
  window.QMFHeader = UnifiedHeader;
  window.getQuizzmanNavItems = getQuizzmanNavItems;
  Object.defineProperty(window, 'QUIZZMAN_NAV_ITEMS', {
    configurable: true,
    enumerable: true,
    get: function () { return getQuizzmanNavItems(); },
  });
  window.createUnifiedHeader = function(containerOrConfig, config) {
    loadStyles();
    if (typeof containerOrConfig === 'object' && containerOrConfig.container) {
      const { container, ...restConfig } = containerOrConfig;
      return new UnifiedHeader(container, restConfig);
    }
    return new UnifiedHeader(containerOrConfig, config);
  };

  if (window.QMF) {
    window.QMF.createHeader = window.createUnifiedHeader;
  }

  if (window.__QMF_DEBUG__) console.log(`[QMF Header] Module loaded v${VERSION}`);
})();
