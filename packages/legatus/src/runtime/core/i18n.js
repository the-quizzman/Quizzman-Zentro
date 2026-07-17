/** UI strings for Legatus chrome (not notification payloads). */
const STRINGS = {
  en: {
    brand: "Legatus",
    notifications: "Legatus",
    markAllRead: "Mark all read",
    viewAll: "Open Legatus",
    loading: "Loading…",
    empty: "You're all caught up",
    emptyCenter: "No activity yet",
    emptyTasks: "No background tasks",
    centerTitle: "Legatus",
    tabActivity: "Activity",
    tabMentis: "Mentis",
    tabTasks: "Tasks",
    mentisHint: "Ask Mentis…",
    mentisEmpty: "Mentis is ready. Try a prompt below.",
    mentisWorkspace: "Open Mentis Workspace",
    promptQuiz: "Generate quiz",
    promptExplain: "Explain this slide",
    promptSummarize: "Summarize document",
    promptTranslate: "Translate",
    promptImprove: "Improve content",
    notice: "Notice",
    dismiss: "Dismiss",
    justNow: "just now",
    orbLabel: "Open Legatus",
  },
  vi: {
    brand: "Legatus",
    notifications: "Legatus",
    markAllRead: "Đánh dấu đã đọc",
    viewAll: "Mở Legatus",
    loading: "Đang tải…",
    empty: "Không có hoạt động mới",
    emptyCenter: "Chưa có hoạt động",
    emptyTasks: "Không có tác vụ nền",
    centerTitle: "Legatus",
    tabActivity: "Hoạt động",
    tabMentis: "Mentis",
    tabTasks: "Tác vụ",
    mentisHint: "Hỏi Mentis…",
    mentisEmpty: "Mentis sẵn sàng. Thử một gợi ý bên dưới.",
    mentisWorkspace: "Mở Mentis Workspace",
    promptQuiz: "Tạo quiz",
    promptExplain: "Giải thích slide này",
    promptSummarize: "Tóm tắt tài liệu",
    promptTranslate: "Dịch",
    promptImprove: "Cải thiện nội dung",
    notice: "Thông báo",
    dismiss: "Đóng",
    justNow: "vừa xong",
    orbLabel: "Mở Legatus",
  },
  zh: {
    brand: "Legatus",
    notifications: "Legatus",
    markAllRead: "全部标为已读",
    viewAll: "打开 Legatus",
    loading: "加载中…",
    empty: "暂无新动态",
    emptyCenter: "还没有动态",
    emptyTasks: "没有后台任务",
    centerTitle: "Legatus",
    tabActivity: "动态",
    tabMentis: "Mentis",
    tabTasks: "任务",
    mentisHint: "询问 Mentis…",
    mentisEmpty: "Mentis 已就绪。试试下方提示。",
    mentisWorkspace: "打开 Mentis Workspace",
    promptQuiz: "生成测验",
    promptExplain: "解释此幻灯片",
    promptSummarize: "总结文档",
    promptTranslate: "翻译",
    promptImprove: "改进内容",
    notice: "提示",
    dismiss: "关闭",
    justNow: "刚刚",
    orbLabel: "打开 Legatus",
  },
  "zh-TW": {
    brand: "Legatus",
    notifications: "Legatus",
    markAllRead: "全部標為已讀",
    viewAll: "開啟 Legatus",
    loading: "載入中…",
    empty: "暫無新動態",
    emptyCenter: "還沒有動態",
    emptyTasks: "沒有背景任務",
    centerTitle: "Legatus",
    tabActivity: "動態",
    tabMentis: "Mentis",
    tabTasks: "任務",
    mentisHint: "詢問 Mentis…",
    mentisEmpty: "Mentis 已就緒。試試下方提示。",
    mentisWorkspace: "開啟 Mentis Workspace",
    promptQuiz: "產生測驗",
    promptExplain: "解釋此投影片",
    promptSummarize: "摘要文件",
    promptTranslate: "翻譯",
    promptImprove: "改善內容",
    notice: "提示",
    dismiss: "關閉",
    justNow: "剛剛",
    orbLabel: "開啟 Legatus",
  },
  ja: {
    brand: "Legatus",
    notifications: "Legatus",
    markAllRead: "すべて既読にする",
    viewAll: "Legatus を開く",
    loading: "読み込み中…",
    empty: "新しいアクティビティはありません",
    emptyCenter: "アクティビティはまだありません",
    emptyTasks: "バックグラウンドタスクはありません",
    centerTitle: "Legatus",
    tabActivity: "アクティビティ",
    tabMentis: "Mentis",
    tabTasks: "タスク",
    mentisHint: "Mentis に聞く…",
    mentisEmpty: "Mentis の準備ができました。下のプロンプトを試してください。",
    mentisWorkspace: "Mentis Workspace を開く",
    promptQuiz: "クイズを生成",
    promptExplain: "このスライドを説明",
    promptSummarize: "文書を要約",
    promptTranslate: "翻訳",
    promptImprove: "内容を改善",
    notice: "お知らせ",
    dismiss: "閉じる",
    justNow: "たった今",
    orbLabel: "Legatus を開く",
  },
  ko: {
    brand: "Legatus",
    notifications: "Legatus",
    markAllRead: "모두 읽음으로 표시",
    viewAll: "Legatus 열기",
    loading: "로딩 중…",
    empty: "새 활동이 없습니다",
    emptyCenter: "활동이 아직 없습니다",
    emptyTasks: "백그라운드 작업이 없습니다",
    centerTitle: "Legatus",
    tabActivity: "활동",
    tabMentis: "Mentis",
    tabTasks: "작업",
    mentisHint: "Mentis에게 묻기…",
    mentisEmpty: "Mentis가 준비되었습니다. 아래 프롬프트를 시도하세요.",
    mentisWorkspace: "Mentis Workspace 열기",
    promptQuiz: "퀴즈 생성",
    promptExplain: "이 슬라이드 설명",
    promptSummarize: "문서 요약",
    promptTranslate: "번역",
    promptImprove: "내용 개선",
    notice: "안내",
    dismiss: "닫기",
    justNow: "방금",
    orbLabel: "Legatus 열기",
  },
};

const STORAGE_KEYS = [
  "qmf-lang",
  "lab-ui-lang",
  "lab-lang",
  "quizzman_language",
  "qm_lang",
  "i18nextLng",
  "qm.locale",
];

/**
 * @param {unknown} raw
 * @returns {keyof typeof STRINGS}
 */
export function normalizeLang(raw) {
  if (raw == null || raw === "") return "en";
  const s = String(raw).trim().replace(/_/g, "-").toLowerCase();
  if (s.startsWith("vi")) return "vi";
  if (s === "zh-tw" || s === "zh-hant" || s === "zht" || s.startsWith("zh-hant")) return "zh-TW";
  if (s.startsWith("zh")) return "zh";
  if (s.startsWith("ja")) return "ja";
  if (s.startsWith("ko")) return "ko";
  if (s.startsWith("en")) return "en";
  return "en";
}

/**
 * Resolve UI language from explicit option, storage, <html lang>, or navigator.
 * @param {string} [explicit]
 */
export function detectLang(explicit) {
  if (explicit) return normalizeLang(explicit);
  if (typeof window === "undefined") return "en";
  try {
    for (const key of STORAGE_KEYS) {
      const v = localStorage.getItem(key);
      if (v) return normalizeLang(v);
    }
  } catch {
    /* private mode */
  }
  const htmlLang = document.documentElement?.getAttribute("lang");
  if (htmlLang) return normalizeLang(htmlLang);
  return normalizeLang(navigator.language || navigator.userLanguage || "en");
}

/**
 * @param {() => string} getLang
 */
export function createI18n(getLang) {
  return {
    t(key) {
      const lang = getLang();
      return STRINGS[lang]?.[key] || STRINGS.en[key] || key;
    },
    relativeTime(iso) {
      if (!iso) return "";
      const t = new Date(iso).getTime();
      if (Number.isNaN(t)) return "";
      const lang = getLang();
      const locale = lang === "zh-TW" ? "zh-TW" : lang;
      const sec = Math.round((Date.now() - t) / 1000);
      if (Math.abs(sec) < 45) return STRINGS[lang]?.justNow || STRINGS.en.justNow;
      try {
        const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
        if (Math.abs(sec) < 3600) return rtf.format(-Math.floor(sec / 60), "minute");
        if (Math.abs(sec) < 86400) return rtf.format(-Math.floor(sec / 3600), "hour");
        if (Math.abs(sec) < 604800) return rtf.format(-Math.floor(sec / 86400), "day");
        return new Date(iso).toLocaleDateString(locale);
      } catch {
        if (sec < 3600) return `${Math.floor(sec / 60)}m`;
        if (sec < 86400) return `${Math.floor(sec / 3600)}h`;
        if (sec < 604800) return `${Math.floor(sec / 86400)}d`;
        return new Date(iso).toLocaleDateString();
      }
    },
  };
}

/**
 * Watch frontend language changes and call onChange(normalizedLang).
 * @param {(lang: string) => void} onChange
 * @returns {() => void} unsubscribe
 */
export function watchLang(onChange) {
  if (typeof window === "undefined") return () => {};

  const emit = (raw) => {
    if (raw == null || raw === "") return;
    onChange(normalizeLang(raw));
  };

  const onStorage = (e) => {
    if (e.key && STORAGE_KEYS.includes(e.key) && e.newValue) emit(e.newValue);
  };
  window.addEventListener("storage", onStorage);

  const onCustom = (e) => {
    const detail = e.detail;
    const raw = typeof detail === "string" ? detail : detail?.lang || detail?.locale || detail?.language;
    emit(raw);
  };
  window.addEventListener("qmf:lang-change", onCustom);
  window.addEventListener("lab:lang-change", onCustom);
  const onNavLang = () => emit(navigator.language);
  window.addEventListener("languagechange", onNavLang);

  let mo = null;
  if (typeof MutationObserver !== "undefined" && document.documentElement) {
    mo = new MutationObserver(() => {
      emit(document.documentElement.getAttribute("lang"));
    });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
  }

  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener("qmf:lang-change", onCustom);
    window.removeEventListener("lab:lang-change", onCustom);
    window.removeEventListener("languagechange", onNavLang);
    mo?.disconnect();
  };
}
