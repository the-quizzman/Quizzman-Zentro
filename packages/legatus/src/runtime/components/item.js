/**
 * Shared notification row + actor mascot stack (Facebook-style).
 * Actors come from notification.data.actors | people | faces.
 */

import {
  handleNotificationClick,
  openNotificationLink,
  resolveNotificationUrl,
} from "../core/deepLink.js";

const SPECIES_TINT = {
  panda: { soft: "#eef2ff", accent: "#4338ca" },
  fox: { soft: "#fff7ed", accent: "#c2410c" },
  frog: { soft: "#ecfdf5", accent: "#047857" },
  cat: { soft: "#fdf4ff", accent: "#a21caf" },
  bunny: { soft: "#fff1f2", accent: "#be123c" },
  bear: { soft: "#fffbeb", accent: "#b45309" },
  owl: { soft: "#f0f9ff", accent: "#0369a1" },
  dog: { soft: "#fefce8", accent: "#a16207" },
  default: { soft: "#f1f5f9", accent: "#475569" },
};

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(s) {
  return escapeHtml(s).replace(/'/g, "&#39;");
}

function hashHue(seed) {
  let h = 0;
  const str = String(seed || "");
  for (let i = 0; i < str.length; i += 1) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h % 360;
}

function normalizeAvatarId(raw) {
  const id = String(raw || "panda")
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "");
  return SPECIES_TINT[id] ? id : "default";
}

/**
 * @param {object} it
 * @returns {Array<{name:string,avatarId:string,state?:string}>}
 */
export function actorsFromItem(it) {
  const data = it?.data;
  if (!data || typeof data !== "object" || Array.isArray(data)) return [];
  const raw = data.actors || data.people || data.faces || [];
  if (!Array.isArray(raw)) return [];
  const out = [];
  const seen = new Set();
  for (const entry of raw) {
    if (entry == null) continue;
    let name = "";
    let avatarId = "panda";
    let state = "";
    if (typeof entry === "string") {
      name = entry.trim();
    } else if (typeof entry === "object") {
      name = String(entry.name || entry.nickname || entry.displayName || "").trim();
      avatarId = normalizeAvatarId(
        entry.avatarId || entry.avatar_id || entry.mascot || entry.species || "panda"
      );
      state = String(entry.state || "");
    }
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ name, avatarId, state });
  }
  return out;
}

function faceSvg(avatarId, accent) {
  // Tiny decorative faces — enough to read as Quizzman mascots in a 28px chip.
  const a = accent || "#475569";
  switch (avatarId) {
    case "fox":
      return `<svg viewBox="0 0 32 32" aria-hidden="true"><path fill="${a}" d="M6 14 16 4l10 10v8a6 6 0 0 1-6 6H12a6 6 0 0 1-6-6z"/><circle cx="12.5" cy="16" r="1.6" fill="#fff"/><circle cx="19.5" cy="16" r="1.6" fill="#fff"/><path d="M14 21h4" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/></svg>`;
    case "frog":
      return `<svg viewBox="0 0 32 32" aria-hidden="true"><ellipse cx="16" cy="18" rx="11" ry="9" fill="${a}"/><circle cx="10" cy="12" r="3.2" fill="${a}"/><circle cx="22" cy="12" r="3.2" fill="${a}"/><circle cx="10" cy="12" r="1.2" fill="#18202a"/><circle cx="22" cy="12" r="1.2" fill="#18202a"/><path d="M12 21q4 3 8 0" fill="none" stroke="#18202a" stroke-width="1.5" stroke-linecap="round"/></svg>`;
    case "cat":
      return `<svg viewBox="0 0 32 32" aria-hidden="true"><path fill="${a}" d="M7 12 11 4l5 6 5-6 4 8v10a6 6 0 0 1-6 6h-6a6 6 0 0 1-6-6z"/><circle cx="12.5" cy="16" r="1.5" fill="#18202a"/><circle cx="19.5" cy="16" r="1.5" fill="#18202a"/><path d="M14 21h4" stroke="#18202a" stroke-width="1.5" stroke-linecap="round"/></svg>`;
    case "bunny":
      return `<svg viewBox="0 0 32 32" aria-hidden="true"><ellipse cx="11" cy="7" rx="3" ry="7" fill="${a}"/><ellipse cx="21" cy="7" rx="3" ry="7" fill="${a}"/><circle cx="16" cy="18" r="9" fill="${a}"/><circle cx="13" cy="17" r="1.4" fill="#18202a"/><circle cx="19" cy="17" r="1.4" fill="#18202a"/><ellipse cx="16" cy="21" rx="2" ry="1.4" fill="#fda4af"/></svg>`;
    case "bear":
      return `<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="9" cy="10" r="4" fill="${a}"/><circle cx="23" cy="10" r="4" fill="${a}"/><circle cx="16" cy="18" r="10" fill="${a}"/><circle cx="12.5" cy="16.5" r="1.5" fill="#18202a"/><circle cx="19.5" cy="16.5" r="1.5" fill="#18202a"/><ellipse cx="16" cy="21" rx="3" ry="2.2" fill="#fff7ed"/></svg>`;
    case "owl":
      return `<svg viewBox="0 0 32 32" aria-hidden="true"><ellipse cx="16" cy="18" rx="11" ry="10" fill="${a}"/><path d="M8 10 16 4l8 6" fill="${a}"/><circle cx="12" cy="16" r="3.2" fill="#fff"/><circle cx="20" cy="16" r="3.2" fill="#fff"/><circle cx="12" cy="16" r="1.3" fill="#18202a"/><circle cx="20" cy="16" r="1.3" fill="#18202a"/></svg>`;
    case "dog":
      return `<svg viewBox="0 0 32 32" aria-hidden="true"><ellipse cx="8" cy="14" rx="4" ry="6" fill="${a}"/><ellipse cx="24" cy="14" rx="4" ry="6" fill="${a}"/><circle cx="16" cy="18" r="10" fill="${a}"/><circle cx="12.5" cy="16" r="1.4" fill="#18202a"/><circle cx="19.5" cy="16" r="1.4" fill="#18202a"/><ellipse cx="16" cy="21" rx="2.4" ry="1.6" fill="#fff7ed"/></svg>`;
    case "panda":
    default:
      return `<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="9" cy="10" r="4.2" fill="#18202a"/><circle cx="23" cy="10" r="4.2" fill="#18202a"/><circle cx="16" cy="18" r="10" fill="#f8fafc"/><ellipse cx="11.5" cy="16.5" rx="3.2" ry="3.6" fill="#18202a"/><ellipse cx="20.5" cy="16.5" rx="3.2" ry="3.6" fill="#18202a"/><circle cx="12.2" cy="15.8" r="1" fill="#fff"/><circle cx="21.2" cy="15.8" r="1" fill="#fff"/><ellipse cx="16" cy="22" rx="2.2" ry="1.5" fill="#18202a"/></svg>`;
  }
}

/**
 * Overlapping mascot faces (+N).
 * @param {Array<{name:string,avatarId:string}>} actors
 * @param {{ max?: number }} [opts]
 */
export function facesHtml(actors, { max = 3 } = {}) {
  const list = Array.isArray(actors) ? actors : [];
  if (!list.length) return "";
  const shown = list.slice(0, max);
  const extra = Math.max(0, list.length - shown.length);
  const faces = shown
    .map((actor, index) => {
      const tint = SPECIES_TINT[actor.avatarId] || SPECIES_TINT.default;
      const hue = hashHue(actor.name || actor.avatarId);
      const soft = tint.soft || `hsl(${hue} 70% 92%)`;
      const accent = tint.accent || `hsl(${hue} 45% 42%)`;
      const letter = escapeHtml((actor.name.trim()[0] || "?").toUpperCase());
      return `<span class="lg-face" style="--lg-face-z:${shown.length - index};--lg-face-soft:${soft};--lg-face-accent:${accent}" title="${escapeAttr(actor.name)}">${faceSvg(actor.avatarId, accent)}<span class="lg-face-letter">${letter}</span></span>`;
    })
    .join("");
  const more =
    extra > 0
      ? `<span class="lg-face lg-face--more" style="--lg-face-z:0" aria-hidden="true">+${extra}</span>`
      : "";
  return `<span class="lg-faces" aria-hidden="true">${faces}${more}</span>`;
}

/**
 * Strip raw URLs from body text (shown as an open-link control instead).
 * Preserves paragraph newlines — do not collapse `\n` via `\s`.
 * @param {string} text
 */
export function bodyWithoutUrls(text) {
  return String(text || "")
    .replace(/https?:\/\/[^\s<>"'）】)\]]+/gi, "")
    .replace(/[^\S\n]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Long enough that a 2-line clamp likely hides content. */
export function bodyNeedsExpand(text) {
  const s = bodyWithoutUrls(text);
  if (!s) return false;
  if (s.includes("\n")) return true;
  return s.length > 110;
}

/**
 * Render body with paragraph breaks (`\n\n` → blocks, `\n` → <br>).
 * @param {string} text
 * @param {string} [className]
 */
export function formatBodyHtml(text, className = "lg-item-body") {
  const clean = bodyWithoutUrls(text);
  if (!clean) return "";
  const paras = clean
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => escapeHtml(p).replace(/\n/g, "<br>"));
  if (!paras.length) return "";
  if (paras.length === 1) {
    return `<div class="${className}">${paras[0]}</div>`;
  }
  return `<div class="${className} ${className}--rich">${paras
    .map((p) => `<p>${p}</p>`)
    .join("")}</div>`;
}

const OPEN_LINK_SVG = `<svg class="lg-link-icon" viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false"><path fill="currentColor" d="M12 4 10.59 5.41 16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"/></svg>`;

/** Survives list re-paints triggered by markRead / unread updates. */
const expandedReceivers = new Set();

/**
 * One inbox row HTML (bell + hub).
 * @param {object} it
 * @param {{ relativeTime: (iso:string)=>string, t?: (key:string)=>string }} i18n
 */
export function notificationItemHtml(it, i18n) {
  const actors = actorsFromItem(it);
  const faces = facesHtml(actors);
  const unread = !it.read_at;
  const hasFaces = Boolean(faces);
  const url = resolveNotificationUrl(it);
  const bodyText = bodyWithoutUrls(it.body || "");
  const canExpand = bodyNeedsExpand(bodyText);
  const receiverKey = String(it.receiver_id || "");
  const isExpanded = receiverKey && expandedReceivers.has(receiverKey);
  const t = typeof i18n?.t === "function" ? i18n.t.bind(i18n) : (k) => k;
  const openLabel = t("openLink");
  const moreLabel = t(isExpanded ? "readLess" : "readMore");
  const bodyHtml = formatBodyHtml(it.body || "", "lg-item-body");
  const expandHtml = canExpand
    ? `<button class="lg-item-more" type="button" data-action="expand">${escapeHtml(moreLabel)}</button>`
    : "";
  const linkHtml = url
    ? `<button class="lg-item-open" type="button" data-action="open-link" title="${escapeAttr(openLabel)}" aria-label="${escapeAttr(openLabel)}">${OPEN_LINK_SVG}</button>`
    : "";
  const expandedClass = isExpanded ? " lg-item--expanded" : "";
  return `
    <div class="lg-item${hasFaces ? " lg-item--faces" : ""}${url ? " lg-item--link" : ""}${canExpand ? " lg-item--expandable" : ""}${expandedClass}" data-unread="${unread}" data-receiver="${escapeAttr(
    it.receiver_id
  )}" data-title="${escapeAttr(it.title)}"${url ? ` data-has-link="true"` : ""} role="button" tabindex="0">
      <span class="lg-dot"></span>
      ${hasFaces ? faces : ""}
      <span class="lg-item-copy">
        <p class="lg-item-title">${escapeHtml(it.title)}${linkHtml}</p>
        ${bodyHtml}
        ${expandHtml}
        <div class="lg-item-meta">${escapeHtml(i18n.relativeTime(it.created_at))}</div>
      </span>
    </div>`;
}

/**
 * Bind expand / open-link / mark-read on a list root.
 * @param {ParentNode} root
 * @param {import('../index.js').LegatusRuntime} runtime
 * @param {{ onActivate?: (receiverId:string)=>void }} [opts]
 */
export function bindNotificationList(root, runtime, opts = {}) {
  if (!root) return;

  root.querySelectorAll(".lg-item[data-receiver]").forEach((el) => {
    const receiverId = el.getAttribute("data-receiver");
    const receiverKey = String(receiverId || "");

    el.querySelectorAll('[data-action="expand"]').forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const expanded = el.classList.toggle("lg-item--expanded");
        btn.textContent = runtime.i18n.t(expanded ? "readLess" : "readMore");
        if (receiverKey) {
          if (expanded) expandedReceivers.add(receiverKey);
          else expandedReceivers.delete(receiverKey);
        }
        // Mark read only — do not navigate / close. Expand state is sticky across re-paint.
        if (expanded && receiverId && runtime?.client?.markRead) {
          runtime.client.markRead(receiverId).catch(() => {});
        }
      });
    });

    el.querySelectorAll('[data-action="open-link"]').forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        openNotificationLink(runtime, null, { receiverId });
        opts.onActivate?.(receiverId);
      });
    });

    el.addEventListener("click", (e) => {
      if (e.target.closest("[data-action]")) return;
      // Expandable rows: first click expands full message instead of closing panel.
      if (el.classList.contains("lg-item--expandable") && !el.classList.contains("lg-item--expanded")) {
        el.classList.add("lg-item--expanded");
        if (receiverKey) expandedReceivers.add(receiverKey);
        const btn = el.querySelector('[data-action="expand"]');
        if (btn) btn.textContent = runtime.i18n.t("readLess");
        if (receiverId && runtime?.client?.markRead) {
          runtime.client.markRead(receiverId).catch(() => {});
        }
        return;
      }
      if (receiverId) handleNotificationClick(runtime, receiverId);
      opts.onActivate?.(receiverId);
    });

    el.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      if (e.target.closest("[data-action]")) return;
      e.preventDefault();
      el.click();
    });
  });
}
