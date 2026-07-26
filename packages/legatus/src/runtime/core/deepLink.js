/**
 * Resolve & open product deep links from Legatus notification payloads.
 * Prefer explicit data.url*; fall back by known id fields / event hints.
 */

const APP = "https://app.quizzman.com";
const STUDY = "https://study.quizzman.com";
const CLASS = "https://class.quizzman.com";

const ALLOWED_HOST_SUFFIXES = [".quizzman.com"];
const ALLOWED_HOSTS = new Set([
  "quizzman.com",
  "www.quizzman.com",
  "app.quizzman.com",
  "study.quizzman.com",
  "hsk.quizzman.com",
  "class.quizzman.com",
  "play.quizzman.com",
  "id.quizzman.com",
  "legatus.quizzman.com",
  "ui.quizzman.com",
]);

function asRecord(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value;
}

function firstString(...candidates) {
  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) return c.trim();
    if (typeof c === "number" && Number.isFinite(c)) return String(c);
  }
  return null;
}

function hintText(item, data) {
  return [
    item?.event_type,
    item?.source,
    data.event_type,
    data.eventType,
    data.source,
    data.app,
    data.type,
    item?.title,
    item?.body,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

/**
 * @param {string} url
 * @returns {string|null}
 */
export function sanitizeDeepLink(url) {
  if (!url || typeof url !== "string") return null;
  const raw = url.trim();
  if (!raw) return null;

  // Same-origin relative path
  if (raw.startsWith("/") && !raw.startsWith("//")) {
    try {
      return new URL(raw, window.location.origin).href;
    } catch {
      return null;
    }
  }

  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    return null;
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
  const host = parsed.hostname.toLowerCase();
  if (ALLOWED_HOSTS.has(host)) return parsed.href;
  if (ALLOWED_HOST_SUFFIXES.some((sfx) => host.endsWith(sfx))) return parsed.href;
  return null;
}

/**
 * @param {object} item — inbox / realtime notification
 * @returns {string|null}
 */
export function resolveNotificationUrl(item) {
  if (!item) return null;
  const data = asRecord(item.data);
  const explicit = firstString(
    data.url,
    data.href,
    data.link,
    data.openUrl,
    data.open_url,
    data.action_url,
    data.actionUrl,
    data.result_url,
    data.resultUrl
  );
  if (explicit) {
    const safe = sanitizeDeepLink(explicit);
    if (safe) return safe;
  }

  const quizId = firstString(data.quiz_id, data.quizId, data.quiz);
  const projectId = firstString(
    data.project_id,
    data.projectId,
    data.slide_id,
    data.slideId
  );
  const assignmentId = firstString(
    data.assignment_id,
    data.assignmentId,
    data.homework_id,
    data.homeworkId,
    data.aggregateId,
    data.aggregate_id
  );
  const examId = firstString(data.exam_id, data.examId, data.examID);
  const inviteCode = firstString(data.invite_code, data.inviteCode, data.code);
  const hint = hintText(item, data);

  if (examId || hint.includes("exam") || hint.includes("hsk") || hint.includes("graded")) {
    if (examId) {
      return sanitizeDeepLink(
        `${STUDY}/exam-result-v3?examID=${encodeURIComponent(examId)}`
      );
    }
  }

  if (quizId || hint.includes("quiz")) {
    if (quizId) {
      return sanitizeDeepLink(`${APP}/quiz-editor/edit/${encodeURIComponent(quizId)}`);
    }
    if (hint.includes("quiz")) return sanitizeDeepLink(`${APP}/quiz-editor/`);
  }

  if (projectId || hint.includes("slide")) {
    if (projectId) {
      return sanitizeDeepLink(
        `${APP}/slide-studio/editor/${encodeURIComponent(projectId)}`
      );
    }
    if (hint.includes("slide")) return sanitizeDeepLink(`${APP}/slide-studio/`);
  }

  if (assignmentId || hint.includes("assignment") || hint.includes("homework")) {
    if (assignmentId) {
      return sanitizeDeepLink(
        `${APP}/assignment/assignments?assignmentId=${encodeURIComponent(assignmentId)}`
      );
    }
    if (inviteCode) {
      return sanitizeDeepLink(
        `https://play.quizzman.com/homework/${encodeURIComponent(inviteCode)}`
      );
    }
    if (hint.includes("homework") || hint.includes("assignment")) {
      return sanitizeDeepLink(`${CLASS}/homework`);
    }
  }

  return null;
}

/**
 * Mark read + emit + navigate when a deep link exists.
 * @param {import('./index.js').LegatusRuntime | object} runtime
 * @param {string|null} receiverId
 * @param {object} [item]
 */
export function handleNotificationClick(runtime, receiverId, item) {
  const found =
    item ||
    runtime?.store
      ?.get()
      ?.items?.find(
        (it) =>
          String(it.receiver_id || "") === String(receiverId || "") ||
          String(it.notification_id || "") === String(receiverId || "")
      ) ||
    null;

  if (receiverId && runtime?.client?.markRead) {
    runtime.client.markRead(receiverId).catch(() => {});
  }

  const data = asRecord(found?.data);
  const url = resolveNotificationUrl(found || { data });
  const payload = {
    receiver_id: receiverId,
    title: found?.title || null,
    data,
    url,
    event_type: found?.event_type || data.event_type || data.eventType || null,
  };
  try {
    runtime?.bus?.emit("notification:click", payload);
  } catch {
    /* ignore */
  }

  if (!url) return false;

  const openNew =
    data.open_in_new_tab === true ||
    data.openInNewTab === true ||
    data.target === "_blank";

  try {
    if (openNew) {
      window.open(url, "_blank", "noopener,noreferrer");
    } else {
      window.location.assign(url);
    }
    return true;
  } catch {
    return false;
  }
}
