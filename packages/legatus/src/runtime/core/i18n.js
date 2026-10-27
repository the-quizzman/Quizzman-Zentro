/** UI strings for Legatus chrome (not notification payloads — those come localized from API). */
const STRINGS = {
  en: {
    filterAll: "All", filterUnread: "Unread", groupLearning: "Quiz activity", groupLibrary: "Library", groupUpdates: "Updates",
    filterNotifications: "Notification groups", pagination: "Notification pages", previousPage: "Previous", nextPage: "Next", loadMore: "Load older", page: "Page",
    today: "Today", yesterday: "Yesterday", earlier: "Earlier", emptyFilter: "No notifications in this group", emptyLoaded: "No matches loaded yet. Load older notifications to continue.",
    feedError: "Couldn't load notifications. Please try again.", retry: "Retry",
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
    openLink: "Open link",
    readMore: "Read more",
    readLess: "Show less",
    justNow: "just now",
    orbLabel: "Open Legatus",
  },
  vi: {
    filterAll: "Tất cả", filterUnread: "Chưa đọc", groupLearning: "Bài làm", groupLibrary: "Thư viện", groupUpdates: "Cập nhật",
    filterNotifications: "Nhóm thông báo", pagination: "Phân trang thông báo", previousPage: "Trước", nextPage: "Sau", loadMore: "Tải thêm", page: "Trang",
    today: "Hôm nay", yesterday: "Hôm qua", earlier: "Trước đó", emptyFilter: "Chưa có thông báo trong nhóm này", emptyLoaded: "Chưa có mục phù hợp trong dữ liệu đã tải. Tải thêm để xem thông báo cũ hơn.",
    feedError: "Không tải được thông báo. Vui lòng thử lại.", retry: "Thử lại",
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
    openLink: "Mở liên kết",
    readMore: "Đọc thêm",
    readLess: "Thu gọn",
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
    openLink: "打开链接",
    readMore: "阅读全文",
    readLess: "收起",
    justNow: "刚刚",
    orbLabel: "打开 Legatus",
  },
  zht: {
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
    openLink: "開啟連結",
    readMore: "閱讀全文",
    readLess: "收合",
    justNow: "剛剛",
    orbLabel: "開啟 Legatus",
  },
  jp: {
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
    openLink: "リンクを開く",
    readMore: "続きを読む",
    readLess: "閉じる",
    justNow: "たった今",
    orbLabel: "Legatus を開く",
  },
  kr: {
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
    openLink: "링크 열기",
    readMore: "더 보기",
    readLess: "접기",
    justNow: "방금",
    orbLabel: "Legatus 열기",
  },
  fr: {
    brand: "Legatus",
    notifications: "Legatus",
    markAllRead: "Tout marquer comme lu",
    viewAll: "Ouvrir Legatus",
    loading: "Chargement…",
    empty: "Vous êtes à jour",
    emptyCenter: "Aucune activité pour le moment",
    emptyTasks: "Aucune tâche en arrière-plan",
    centerTitle: "Legatus",
    tabActivity: "Activité",
    tabMentis: "Mentis",
    tabTasks: "Tâches",
    mentisHint: "Demander à Mentis…",
    mentisEmpty: "Mentis est prêt. Essayez une suggestion ci-dessous.",
    mentisWorkspace: "Ouvrir Mentis Workspace",
    promptQuiz: "Générer un quiz",
    promptExplain: "Expliquer cette diapositive",
    promptSummarize: "Résumer le document",
    promptTranslate: "Traduire",
    promptImprove: "Améliorer le contenu",
    notice: "Avis",
    dismiss: "Fermer",
    openLink: "Ouvrir le lien",
    readMore: "Lire la suite",
    readLess: "Réduire",
    justNow: "à l'instant",
    orbLabel: "Ouvrir Legatus",
  },
  de: {
    brand: "Legatus",
    notifications: "Legatus",
    markAllRead: "Alle als gelesen markieren",
    viewAll: "Legatus öffnen",
    loading: "Laden…",
    empty: "Alles erledigt",
    emptyCenter: "Noch keine Aktivität",
    emptyTasks: "Keine Hintergrundaufgaben",
    centerTitle: "Legatus",
    tabActivity: "Aktivität",
    tabMentis: "Mentis",
    tabTasks: "Aufgaben",
    mentisHint: "Mentis fragen…",
    mentisEmpty: "Mentis ist bereit. Probieren Sie einen Vorschlag unten.",
    mentisWorkspace: "Mentis Workspace öffnen",
    promptQuiz: "Quiz erstellen",
    promptExplain: "Diese Folie erklären",
    promptSummarize: "Dokument zusammenfassen",
    promptTranslate: "Übersetzen",
    promptImprove: "Inhalt verbessern",
    notice: "Hinweis",
    dismiss: "Schließen",
    openLink: "Link öffnen",
    readMore: "Weiterlesen",
    readLess: "Weniger",
    justNow: "gerade eben",
    orbLabel: "Legatus öffnen",
  },
  es: {
    brand: "Legatus",
    notifications: "Legatus",
    markAllRead: "Marcar todo como leído",
    viewAll: "Abrir Legatus",
    loading: "Cargando…",
    empty: "Estás al día",
    emptyCenter: "Aún no hay actividad",
    emptyTasks: "No hay tareas en segundo plano",
    centerTitle: "Legatus",
    tabActivity: "Actividad",
    tabMentis: "Mentis",
    tabTasks: "Tareas",
    mentisHint: "Preguntar a Mentis…",
    mentisEmpty: "Mentis está listo. Prueba una sugerencia abajo.",
    mentisWorkspace: "Abrir Mentis Workspace",
    promptQuiz: "Generar cuestionario",
    promptExplain: "Explicar esta diapositiva",
    promptSummarize: "Resumir documento",
    promptTranslate: "Traducir",
    promptImprove: "Mejorar contenido",
    notice: "Aviso",
    dismiss: "Cerrar",
    openLink: "Abrir enlace",
    readMore: "Leer más",
    readLess: "Mostrar menos",
    justNow: "ahora mismo",
    orbLabel: "Abrir Legatus",
  },
  th: {
    brand: "Legatus",
    notifications: "Legatus",
    markAllRead: "ทำเครื่องหมายว่าอ่านแล้วทั้งหมด",
    viewAll: "เปิด Legatus",
    loading: "กำลังโหลด…",
    empty: "ไม่มีกิจกรรมใหม่",
    emptyCenter: "ยังไม่มีกิจกรรม",
    emptyTasks: "ไม่มีงานพื้นหลัง",
    centerTitle: "Legatus",
    tabActivity: "กิจกรรม",
    tabMentis: "Mentis",
    tabTasks: "งาน",
    mentisHint: "ถาม Mentis…",
    mentisEmpty: "Mentis พร้อมแล้ว ลองคำแนะนำด้านล่าง",
    mentisWorkspace: "เปิด Mentis Workspace",
    promptQuiz: "สร้างควิซ",
    promptExplain: "อธิบายสไลด์นี้",
    promptSummarize: "สรุปเอกสาร",
    promptTranslate: "แปล",
    promptImprove: "ปรับปรุงเนื้อหา",
    notice: "ประกาศ",
    dismiss: "ปิด",
    openLink: "เปิดลิงก์",
    readMore: "อ่านเพิ่ม",
    readLess: "ย่อ",
    justNow: "เมื่อกี้",
    orbLabel: "เปิด Legatus",
  },
  pt: {
    brand: "Legatus",
    notifications: "Legatus",
    markAllRead: "Marcar tudo como lido",
    viewAll: "Abrir Legatus",
    loading: "Carregando…",
    empty: "Você está em dia",
    emptyCenter: "Nenhuma atividade ainda",
    emptyTasks: "Nenhuma tarefa em segundo plano",
    centerTitle: "Legatus",
    tabActivity: "Atividade",
    tabMentis: "Mentis",
    tabTasks: "Tarefas",
    mentisHint: "Perguntar ao Mentis…",
    mentisEmpty: "Mentis está pronto. Experimente uma sugestão abaixo.",
    mentisWorkspace: "Abrir Mentis Workspace",
    promptQuiz: "Gerar quiz",
    promptExplain: "Explicar este slide",
    promptSummarize: "Resumir documento",
    promptTranslate: "Traduzir",
    promptImprove: "Melhorar conteúdo",
    notice: "Aviso",
    dismiss: "Fechar",
    openLink: "Abrir link",
    readMore: "Ler mais",
    readLess: "Mostrar menos",
    justNow: "agora mesmo",
    orbLabel: "Abrir Legatus",
  },
};

// Legacy aliases → canonical packs
STRINGS["zh-TW"] = STRINGS.zht;
STRINGS.ja = STRINGS.jp;
STRINGS.ko = STRINGS.kr;

const CONNECTION_STRINGS = {
  en: {
    connLive: "Live",
    connConnecting: "Connecting…",
    connReconnecting: "Reconnecting…",
    connPaused: "Paused",
    connOffline: "Offline",
    connError: "Disconnected",
    reconnect: "Reconnect",
  },
  vi: {
    connLive: "Trực tuyến",
    connConnecting: "Đang kết nối…",
    connReconnecting: "Đang kết nối lại…",
    connPaused: "Tạm dừng",
    connOffline: "Ngoại tuyến",
    connError: "Mất kết nối",
    reconnect: "Kết nối lại",
  },
  zh: {
    connLive: "已连接",
    connConnecting: "正在连接…",
    connReconnecting: "正在重连…",
    connPaused: "已暂停",
    connOffline: "离线",
    connError: "已断开",
    reconnect: "重新连接",
  },
  zht: {
    connLive: "已連線",
    connConnecting: "正在連線…",
    connReconnecting: "正在重連…",
    connPaused: "已暫停",
    connOffline: "離線",
    connError: "已中斷",
    reconnect: "重新連線",
  },
  jp: {
    connLive: "オンライン",
    connConnecting: "接続中…",
    connReconnecting: "再接続中…",
    connPaused: "一時停止",
    connOffline: "オフライン",
    connError: "切断",
    reconnect: "再接続",
  },
  kr: {
    connLive: "연결됨",
    connConnecting: "연결 중…",
    connReconnecting: "다시 연결 중…",
    connPaused: "일시 중지",
    connOffline: "오프라인",
    connError: "연결 끊김",
    reconnect: "다시 연결",
  },
  fr: {
    connLive: "En ligne",
    connConnecting: "Connexion…",
    connReconnecting: "Reconnexion…",
    connPaused: "En pause",
    connOffline: "Hors ligne",
    connError: "Déconnecté",
    reconnect: "Reconnecter",
  },
  de: {
    connLive: "Live",
    connConnecting: "Verbinden…",
    connReconnecting: "Erneut verbinden…",
    connPaused: "Pausiert",
    connOffline: "Offline",
    connError: "Getrennt",
    reconnect: "Neu verbinden",
  },
  es: {
    connLive: "En vivo",
    connConnecting: "Conectando…",
    connReconnecting: "Reconectando…",
    connPaused: "En pausa",
    connOffline: "Sin conexión",
    connError: "Desconectado",
    reconnect: "Reconectar",
  },
  th: {
    connLive: "ออนไลน์",
    connConnecting: "กำลังเชื่อมต่อ…",
    connReconnecting: "กำลังเชื่อมต่อใหม่…",
    connPaused: "หยุดชั่วคราว",
    connOffline: "ออฟไลน์",
    connError: "หลุดการเชื่อมต่อ",
    reconnect: "เชื่อมต่ออีกครั้ง",
  },
  pt: {
    connLive: "Ao vivo",
    connConnecting: "Conectando…",
    connReconnecting: "Reconectando…",
    connPaused: "Pausado",
    connOffline: "Offline",
    connError: "Desconectado",
    reconnect: "Reconectar",
  },
};

for (const [lang, extra] of Object.entries(CONNECTION_STRINGS)) {
  if (STRINGS[lang]) Object.assign(STRINGS[lang], extra);
}

const STORAGE_KEYS = [
  "qmf-lang",
  "lab-ui-lang",
  "lab-lang",
  "quizzman_language",
  "qm_lang",
  "i18nextLng",
  "qm.locale",
];

const INTL_LOCALE = {
  en: "en",
  vi: "vi",
  zh: "zh-CN",
  zht: "zh-TW",
  jp: "ja",
  kr: "ko",
  fr: "fr",
  de: "de",
  es: "es",
  th: "th",
  pt: "pt-BR",
};

/**
 * @param {unknown} raw
 * @returns {keyof typeof STRINGS}
 */
export function normalizeLang(raw) {
  if (raw == null || raw === "") return "en";
  const s = String(raw).trim().replace(/_/g, "-").toLowerCase();
  if (s.startsWith("vi")) return "vi";
  if (s === "zht" || s === "zh-tw" || s === "zh-hk" || s === "zh-mo" || s === "zh-hant" || s.startsWith("zh-t") || s.includes("hant")) return "zht";
  if (s === "zh" || s.startsWith("zh-") || s.startsWith("zh")) return "zh";
  if (s.startsWith("ja") || s === "jp") return "jp";
  if (s.startsWith("ko") || s === "kr") return "kr";
  if (s.startsWith("fr")) return "fr";
  if (s.startsWith("de") || s === "german") return "de";
  if (s.startsWith("es") || s === "spanish") return "es";
  if (s.startsWith("th") || s === "thai") return "th";
  if (s.startsWith("pt") || s === "portuguese" || s === "portu") return "pt";
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
      const locale = INTL_LOCALE[lang] || lang;
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
  window.addEventListener("qmf:langchange", onCustom);
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
    window.removeEventListener("qmf:langchange", onCustom);
    window.removeEventListener("lab:lang-change", onCustom);
    window.removeEventListener("languagechange", onNavLang);
    mo?.disconnect();
  };
}
