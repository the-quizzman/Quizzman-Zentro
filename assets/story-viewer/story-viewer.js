/**
 * Quizzman Story Viewer — reusable Markdown → Report → Story UI
 * Hosted at ui.quizzman.com/qmf/assets/story-viewer/
 *
 * Modes:
 * - I-Ching snapshot: /iching/snapshot/:hash?format=md  (lab) or ?src=…&profile=iching
 * - Generic Markdown: /qmf/story.html?src=/qmf/docs/USAGE.md
 */
(function () {
  "use strict";

  const $ = (selector, root) => (root || document).querySelector(selector);
  const $$ = (selector, root) => Array.from((root || document).querySelectorAll(selector));

  let headings = [];
  let activeResult = -1;
  let tocObserver = null;
  let activeSource = null;

  function snapshotHashFromPath() {
    const match = location.pathname.match(/^\/iching\/snapshot\/([^/]+)$/);
    if (!match) return null;
    const hash = decodeURIComponent(match[1]);
    if (!hash || hash.length > 100 || !/^[A-Za-z0-9_-]+$/.test(hash)) {
      throw new Error("Invalid snapshot ID");
    }
    return hash;
  }

  function normalizeSrc(raw) {
    let value = String(raw || "").trim();
    if (!value) return "";
    if (/^https?:\/\//i.test(value)) return value;
    if (!value.startsWith("/")) value = "/" + value;
    return value;
  }

  function withRawParam(url) {
    try {
      const u = new URL(url, location.origin);
      if (!u.searchParams.has("raw")) u.searchParams.set("raw", "1");
      if (/\/iching\/snapshot\//i.test(u.pathname) && !u.searchParams.has("format")) {
        u.searchParams.set("format", "md");
      }
      if (u.origin !== location.origin) return u.href;
      return u.pathname + u.search;
    } catch (_) {
      return url + (url.includes("?") ? "&" : "?") + "raw=1";
    }
  }

  function resolveSource() {
    const params = new URLSearchParams(location.search);
    const profileParam = (params.get("profile") || "").toLowerCase();
    const srcParam = params.get("src") || params.get("path") || "";
    const hashFromPath = snapshotHashFromPath();

    if (hashFromPath) {
      const raw = new URL(location.pathname, location.origin);
      raw.searchParams.set("format", "md");
      raw.searchParams.set("raw", "1");
      return {
        kind: "iching",
        hash: hashFromPath,
        fetchUrl: raw.pathname + raw.search,
        titleFallback: "I-Ching Snapshot",
      };
    }

    if (srcParam) {
      const src = normalizeSrc(srcParam);
      const isIching =
        profileParam === "iching" ||
        /\/iching\/snapshot\//i.test(src) ||
        /format=md/i.test(src);
      let hash = null;
      const m = src.match(/\/iching\/snapshot\/([^/?#]+)/i);
      if (m) hash = decodeURIComponent(m[1]);
      return {
        kind: isIching ? "iching" : "generic",
        hash,
        fetchUrl: withRawParam(src),
        titleFallback: src.split("/").pop() || "Markdown",
      };
    }

    throw new Error("Thiếu nguồn Markdown. Dùng ?src=/path/to.md hoặc /iching/snapshot/:hash?format=md");
  }

  function snapshotHash() {
    return (activeSource && activeSource.hash) || snapshotHashFromPath() || "";
  }

  function rawUrl() {
    return activeSource ? activeSource.fetchUrl : resolveSource().fetchUrl;
  }

  function slugify(text) {
    return String(text)
      .toLowerCase()
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 90);
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function estimateReadMinutes(text) {
    const words = String(text).trim().split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.round(words / 200));
  }

  function initTheme() {
    const stored = localStorage.getItem("iching-snapshot-theme") || localStorage.getItem("theme");
    if (stored === "light" || stored === "dark") {
      document.documentElement.setAttribute("data-theme", stored);
    }
    $("#theme-toggle").addEventListener("click", () => {
      const current = document.documentElement.getAttribute("data-theme");
      const prefersDark = matchMedia("(prefers-color-scheme: dark)").matches;
      const isDark = current ? current === "dark" : prefersDark;
      const next = isDark ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      localStorage.setItem("iching-snapshot-theme", next);
    });
  }

  function syncShortcut() {
    const isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
    const key = isMac ? "⌘K" : "Ctrl K";
    $$(".mv-search-trigger .mv-kbd").forEach((el) => {
      el.textContent = key;
    });
  }

  function createRenderer() {
    if (!window.markdownit) throw new Error("Markdown renderer failed to load");
    const md = window.markdownit({
      html: false,
      linkify: true,
      typographer: true,
      highlight(code, lang) {
        if (lang && window.hljs && window.hljs.getLanguage(lang)) {
          try {
            return (
              '<pre><code class="hljs language-' +
              md.utils.escapeHtml(lang) +
              '">' +
              window.hljs.highlight(code, { language: lang, ignoreIllegals: true }).value +
              "</code></pre>"
            );
          } catch (_) {
            // Fall through to escaped code.
          }
        }
        return '<pre><code class="hljs">' + md.utils.escapeHtml(code) + "</code></pre>";
      },
    });

    const defaultOpen =
      md.renderer.rules.link_open ||
      function (tokens, index, options, env, self) {
        return self.renderToken(tokens, index, options);
      };
    md.renderer.rules.link_open = function (tokens, index, options, env, self) {
      const token = tokens[index];
      const hrefIndex = token.attrIndex("href");
      if (hrefIndex >= 0) {
        const href = token.attrs[hrefIndex][1];
        if (/^https?:\/\//i.test(href) && !href.includes(location.host)) {
          token.attrPush(["target", "_blank"]);
          token.attrPush(["rel", "noopener noreferrer"]);
        }
      }
      return defaultOpen(tokens, index, options, env, self);
    };
    return md;
  }

  function enhanceHeadings(article) {
    const used = new Set();
    $$("h1, h2, h3", article).forEach((heading) => {
      const text = heading.textContent.trim();
      let id = slugify(text) || "section";
      let suffix = 1;
      while (used.has(id)) {
        id = slugify(text) + "-" + suffix++;
      }
      used.add(id);
      heading.id = id;

      const anchor = document.createElement("a");
      anchor.className = "heading-anchor";
      anchor.href = "#" + id;
      anchor.setAttribute("aria-label", "Link to section");
      anchor.textContent = "#";
      heading.appendChild(anchor);
    });
  }

  function codeLanguage(code) {
    const match = (code.className || "").match(/language-([\w+-]+)/i);
    if (!match) return "Code";
    const labels = {
      js: "JavaScript",
      javascript: "JavaScript",
      ts: "TypeScript",
      typescript: "TypeScript",
      html: "HTML",
      css: "CSS",
      json: "JSON",
      bash: "Bash",
      sh: "Shell",
      python: "Python",
      py: "Python",
      md: "Markdown",
      markdown: "Markdown",
      yaml: "YAML",
      sql: "SQL",
    };
    return labels[match[1].toLowerCase()] || match[1].toUpperCase();
  }

  function enhanceCodeBlocks(article) {
    $$("pre", article).forEach((pre) => {
      if (pre.closest(".code-block")) return;
      const code = $("code", pre);
      const wrapper = document.createElement("div");
      wrapper.className = "code-block";
      const header = document.createElement("div");
      header.className = "code-header";
      const language = document.createElement("span");
      language.className = "code-lang";
      language.textContent = codeLanguage(code || pre);
      const copy = document.createElement("button");
      copy.type = "button";
      copy.className = "code-copy";
      copy.textContent = "Copy";
      copy.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(code ? code.innerText : pre.innerText);
          copy.textContent = "Copied";
          copy.classList.add("copied");
          setTimeout(() => {
            copy.textContent = "Copy";
            copy.classList.remove("copied");
          }, 1400);
        } catch (_) {
          copy.textContent = "Failed";
        }
      });
      header.append(language, copy);
      pre.parentNode.insertBefore(wrapper, pre);
      wrapper.append(header, pre);
    });
  }


  function extractSnapshotInfo(markdown, article) {
    const titleHeading = $("h1", article);
    const title = titleHeading
      ? titleHeading.textContent.replace(/#$/, "").trim()
      : "Kết quả gieo quẻ Kinh Dịch";

    const questionMatch = markdown.match(/>\s*\*\*Câu hỏi:\*\*\s*(.+)/i);
    const hexagramMatch = markdown.match(/>\s*\*\*Quẻ:\*\*\s*(.+)/i);
    const outcomeMatch = markdown.match(/\|\s*Kết luận tổng hợp\s*\|\s*(.+?)\s*\|/i);
    const confidenceMatch = markdown.match(/\|\s*Độ tin cậy\s*\|\s*(.+?)\s*\|/i);
    const actionMatch = markdown.match(/\|\s*Hành động khuyên dùng\s*\|\s*(.+?)\s*\|/i);
    const adviceMatch = markdown.match(/\*\*Lời khuyên hành động:\*\*\s*(.+)/i);
    const oneLinerMatch = markdown.match(/\*\*Kết luận 1 câu:\*\*\s*(.+)/i);

    let epigraph = "";
    if (adviceMatch) epigraph = adviceMatch[1].trim();
    else if (oneLinerMatch) {
      epigraph = oneLinerMatch[1]
        .replace(/\*\*/g, "")
        .replace(/^Quẻ[^—–-]*[—–-]\s*/i, "")
        .trim();
    }

    return {
      title,
      question: questionMatch ? questionMatch[1].trim() : "",
      hexagram: hexagramMatch ? hexagramMatch[1].trim() : "",
      outcome: outcomeMatch ? outcomeMatch[1].replace(/\*\*/g, "").trim() : "",
      confidence: confidenceMatch ? confidenceMatch[1].replace(/\*\*/g, "").trim() : "",
      action: actionMatch ? actionMatch[1].replace(/\*\*/g, "").trim() : "",
      epigraph,
    };
  }

  function outcomeTone(outcome) {
    const text = String(outcome || "").toLowerCase();
    if (/hung|bất lợi|xấu|nguy/.test(text)) return "tone-bad";
    if (/cảnh|thận|chậm|chưa rõ|bình|đan xen/.test(text)) return "tone-warn";
    if (/đại cát|\bcát\b|tốt|hanh/.test(text)) return "tone-good";
    return "tone-neutral";
  }

  function setHero(markdown, info, hash) {
    document.title = (info.hexagram || "I-Ching Snapshot") + " — Quizzman";

    const storyHex = $("#story-hex");
    if (storyHex) {
      if (info.hexagram && !/^#\d+/.test(info.hexagram)) {
        const glued = String(info.hexagram).match(/^([\u4e00-\u9fff]+)(.*)$/);
        storyHex.innerHTML = hexagramHtml({
          num: "",
          zh: glued ? glued[1] : "",
          vi: glued ? glued[2].trim() : info.hexagram,
        });
        const numEl = $(".ic-hex-num", storyHex);
        if (numEl) numEl.remove();
      } else {
        const hexParts = parseHexagramLabel(info.hexagram || "");
        storyHex.innerHTML = hexParts ? hexagramHtml(hexParts) : escapeHtml(info.title);
      }
    }

    const outcomeEl = $("#story-outcome");
    if (outcomeEl) {
      if (info.outcome) {
        outcomeEl.hidden = false;
        outcomeEl.className = "story-outcome " + outcomeTone(info.outcome);
        outcomeEl.textContent = info.outcome + (info.action ? "  ·  " + info.action : "");
      } else outcomeEl.hidden = true;
    }

    const epigraph = $("#story-epigraph");
    if (epigraph) {
      if (info.epigraph) {
        epigraph.hidden = false;
        epigraph.textContent = info.epigraph;
      } else epigraph.hidden = true;
    }

    const question = $("#story-question");
    if (question) {
      if (info.question) {
        question.hidden = false;
        question.innerHTML = "<span>Câu hỏi</span>" + escapeHtml(info.question);
      } else question.hidden = true;
    }

    const meta = $("#doc-meta");
    if (meta) {
      const bits = [];
      if (info.confidence) bits.push('<span class="mv-meta-item">Mức chắc chắn · ' + escapeHtml(info.confidence) + "</span>");
      bits.push('<span class="mv-meta-item">Đọc khoảng ' + estimateReadMinutes(markdown) + " phút</span>");
      bits.push('<span class="mv-meta-path">' + escapeHtml(hash) + "</span>");
      meta.innerHTML = bits.join("");
    }

    $("#doc-hero").hidden = false;
    if ($("#side-hexagram")) $("#side-hexagram").textContent = info.hexagram || "I-Ching";
    if ($("#side-outcome")) $("#side-outcome").textContent = info.outcome || "";

    if (hash) {
      const fullUrl = "https://lab.quizzman.com/tool/iching-divination?hash=" + encodeURIComponent(hash);
      const jsonUrl = "https://lab.quizzman.com/api/snapshot/iching/" + encodeURIComponent(hash);
      if ($("#full-result-link")) {
        $("#full-result-link").href = fullUrl;
        $("#full-result-link").hidden = false;
        $("#full-result-link").style.display = "";
      }
      if ($("#side-full-link")) {
        $("#side-full-link").href = fullUrl;
        $("#side-full-link").style.display = "";
      }
      if ($("#side-json-link")) {
        $("#side-json-link").href = jsonUrl;
        $("#side-json-link").style.display = "";
      }
    }
    if ($("#raw-link")) $("#raw-link").href = rawUrl();
    document.documentElement.setAttribute("data-doc-kind", "iching");

    const copyLink = $("#copy-link");
    if (copyLink && !copyLink.dataset.bound) {
      copyLink.dataset.bound = "1";
      copyLink.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(location.href);
          copyLink.textContent = "Đã copy";
          setTimeout(() => { copyLink.textContent = "Copy link"; }, 1300);
        } catch (_) { copyLink.textContent = "Lỗi"; }
      });
    }
  }

  function sectionKind(headingText) {
    const t = String(headingText || "").toLowerCase();
    if (activeSource && activeSource.kind === "generic") return "reading";
    if (/tóm tắt|cấu trúc quẻ|kết luận trực tiếp|lời khuyên|phản hồi theo câu hỏi|phân tích theo trường phái|tổng hợp và giải/.test(t)) {
      return "reading";
    }
    return "research";
  }

  function readingLabel(headingText) {
    const t = String(headingText || "");
    if (/tóm tắt/i.test(t)) return "Tóm tắt";
    if (/cấu trúc/i.test(t)) return "Cấu trúc quẻ";
    if (/kết luận/i.test(t)) return "Kết luận";
    if (/lời khuyên/i.test(t)) return "Lời khuyên";
    if (/phản hồi|câu hỏi/i.test(t)) return "Trả lời câu hỏi";
    if (/trường phái/i.test(t)) return "Luận giải";
    if (/tổng hợp/i.test(t)) return "Tổng hợp";
    return t.replace(/^\d+\.\s*/, "").replace(/#$/, "").trim();
  }

  let navArticle = null;

  function applyViewMode(mode) {
    const next = mode === "research" ? "research" : "reading";
    document.documentElement.setAttribute("data-view-mode", next);
    localStorage.setItem("iching-snapshot-view-mode", next);
    const readingBtn = $("#mode-reading");
    const researchBtn = $("#mode-research");
    if (readingBtn && researchBtn) {
      readingBtn.classList.toggle("is-active", next === "reading");
      researchBtn.classList.toggle("is-active", next === "research");
      readingBtn.setAttribute("aria-selected", String(next === "reading"));
      researchBtn.setAttribute("aria-selected", String(next === "research"));
    }

    if (navArticle) reorderSectionsForMode(navArticle, next);

    $$(".ic-section-block").forEach((block) => {
      const kind = block.dataset.kind || "research";
      const body = $(".ic-section-body", block);
      const heading = $(".ic-section-heading", block);
      const toggle = $(".ic-section-toggle", block);
      // Reading Mode: research sections are hidden entirely (not just collapsed).
      // Research Mode: everything open by default.
      const collapse = false;
      if (body) body.classList.toggle("is-collapsed", collapse);
      if (heading) heading.classList.toggle("is-collapsed", collapse);
      if (toggle) {
        toggle.textContent = "▾";
        toggle.setAttribute("aria-expanded", "true");
        // Progressive disclosure in Research: optional collapse for deep sections
        if (next === "research" && kind === "research") {
          const title = heading?.textContent || "";
          const deep = /kinh văn|lục hào|ma trận|evidence|hướng dẫn|format|cấm|yêu cầu/i.test(title);
          if (deep) {
            body.classList.add("is-collapsed");
            heading.classList.add("is-collapsed");
            toggle.textContent = "▸";
            toggle.setAttribute("aria-expanded", "false");
          }
        }
      }
    });

    rebuildNavigation();
  }

  function readingPriority(headingText) {
    const t = String(headingText || "");
    if (/tóm tắt/i.test(t)) return 10;
    if (/kết luận trực tiếp/i.test(t)) return 20;
    if (/phản hồi theo câu hỏi/i.test(t)) return 30;
    if (/lời khuyên/i.test(t)) return 40;
    if (/phân tích theo trường phái/i.test(t)) return 50;
    if (/tổng hợp/i.test(t)) return 60;
    if (/cấu trúc/i.test(t)) return 70;
    return 80;
  }

  function reorderSectionsForMode(article, mode) {
    const blocks = $$(".ic-section-block", article);
    if (!blocks.length) return;
    if (!article._sectionOrder) {
      article._sectionOrder = blocks.slice();
    }
    const source = article._sectionOrder.filter((b) => b.isConnected || true);
    // Refresh connected list from original order indices
    const ordered = article._sectionOrder.filter((b) => article.contains(b) || document.body.contains(b));
    const pool = ordered.length ? ordered : blocks;

    if (mode === "research") {
      pool.forEach((block) => article.appendChild(block));
      return;
    }

    const reading = pool
      .filter((b) => b.dataset.kind === "reading")
      .sort((a, b) => {
        const ha = $(".ic-section-heading", a)?.textContent || "";
        const hb = $(".ic-section-heading", b)?.textContent || "";
        return readingPriority(ha) - readingPriority(hb);
      });
    const research = pool.filter((b) => b.dataset.kind !== "reading");
    [...reading, ...research].forEach((block) => article.appendChild(block));
  }

  function initViewMode() {
    const stored = localStorage.getItem("iching-snapshot-view-mode");
    const initial = stored === "research" ? "research" : "reading";
    $("#mode-reading")?.addEventListener("click", () => applyViewMode("reading"));
    $("#mode-research")?.addEventListener("click", () => applyViewMode("research"));
    applyViewMode(initial);
  }

  function headingRawText(heading) {
    const raw = heading && $(".ic-section-raw-title", heading);
    if (raw) return raw.textContent.replace(/#$/, "").trim();
    return String(heading?.textContent || "")
      .replace(/[▾▸]/g, "")
      .replace(/#$/, "")
      .trim();
  }

  function rebuildNavigation() {
    if (!navArticle) return;
    buildSectionNav(navArticle);
    buildToc(navArticle);
    watchHeadings();
  }

  function buildSectionNav(article) {
    navArticle = article;
    const nav = $("#section-nav");
    if (!nav) return;
    nav.innerHTML = "";
    const mode = document.documentElement.getAttribute("data-view-mode") || "reading";
    const readingOrder = [];
    const researchOrder = [];
    $$(".ic-section-block", article).forEach((block) => {
      const heading = $(".ic-section-heading", block);
      if (!heading) return;
      const raw = headingRawText(heading);
      const item = {
        id: heading.id,
        kind: block.dataset.kind || "research",
        label: readingLabel(raw),
        raw,
      };
      (item.kind === "reading" ? readingOrder : researchOrder).push(item);
    });

    const appendList = (items, label) => {
      if (!items.length) return;
      if (label) {
        const p = document.createElement("p");
        p.className = "mv-nav-group-label";
        p.textContent = label;
        nav.appendChild(p);
      }
      const ul = document.createElement("ul");
      ul.className = "mv-nav-list snapshot-section-list";
      items.forEach((entry, index) => {
        const li = document.createElement("li");
        const a = document.createElement("a");
        a.href = "#" + entry.id;
        a.textContent = mode === "reading" || entry.kind === "reading" ? entry.label : entry.raw.replace(/^\d+\.\s*/, "");
        if (index === 0 && !label) a.classList.add("is-active");
        a.addEventListener("click", closeDrawers);
        li.appendChild(a);
        ul.appendChild(li);
      });
      nav.appendChild(ul);
    };

    if (mode === "reading") {
      appendList(readingOrder);
      if (researchOrder.length) {
        const details = document.createElement("details");
        details.className = "nav-details-group";
        details.innerHTML = "<summary>Chi tiết nghiên cứu</summary>";
        const ul = document.createElement("ul");
        ul.className = "mv-nav-list snapshot-section-list";
        researchOrder.forEach((entry) => {
          const li = document.createElement("li");
          const a = document.createElement("a");
          a.href = "#" + entry.id;
          a.textContent = entry.raw.replace(/^\d+\.\s*/, "");
          a.addEventListener("click", () => { applyViewMode("research"); closeDrawers(); });
          li.appendChild(a);
          ul.appendChild(li);
        });
        details.appendChild(ul);
        nav.appendChild(details);
      }
    } else {
      appendList(readingOrder, "Đọc");
      appendList(researchOrder, "Nghiên cứu");
    }
  }

  function buildToc(article) {
    const list = $("#toc-list");
    if (!list) return;
    list.innerHTML = "";
    headings = [];
    const mode = document.documentElement.getAttribute("data-view-mode") || "reading";

    $$(".ic-section-block", article).forEach((block) => {
      const kind = block.dataset.kind || "research";
      if (mode === "reading" && kind === "research") return;
      const heading = $(".ic-section-heading", block);
      if (!heading) return;
      const raw = headingRawText(heading);
      const item = document.createElement("li");
      item.className = "toc-item toc-h2";
      const row = document.createElement("div");
      row.className = "toc-row";
      const anchor = document.createElement("a");
      anchor.href = "#" + heading.id;
      anchor.textContent = mode === "reading" ? readingLabel(raw) : raw.replace(/^\d+\.\s*/, "");
      anchor.addEventListener("click", closeDrawers);
      row.appendChild(anchor);
      item.appendChild(row);

      if (mode === "research") {
        const children = document.createElement("ul");
        children.className = "toc-children";
        $$("h3", block).forEach((h3) => {
          const child = document.createElement("li");
          child.className = "toc-item toc-h3";
          const link = document.createElement("a");
          link.href = "#" + h3.id;
          link.textContent = h3.textContent.replace(/#$/, "").trim();
          link.addEventListener("click", closeDrawers);
          child.appendChild(link);
          children.appendChild(child);
          headings.push({ element: h3, anchor: link, depth: 3, parent: { anchor, item, toggle: null } });
        });
        if (children.children.length) item.appendChild(children);
      }

      list.appendChild(item);
      headings.push({ element: heading, anchor, depth: 2, parent: null });
    });
  }

  function setActiveHeading(index) {
    if (index < 0 || index >= headings.length) return;
    headings.forEach((item) => item.anchor.classList.remove("is-active", "is-active-parent"));
    const active = headings[index];
    active.anchor.classList.add("is-active");
    if (active.parent) {
      active.parent.anchor.classList.add("is-active-parent");
      active.parent.item.classList.remove("is-collapsed");
      if (active.parent.toggle) {
        active.parent.toggle.textContent = "▾";
        active.parent.toggle.setAttribute("aria-expanded", "true");
      }
    }

    const sectionLinks = $$(".snapshot-section-list a");
    const activeH2 = active.depth === 2 ? active.element.id : active.parent?.anchor.hash.slice(1);
    sectionLinks.forEach((link) => link.classList.toggle("is-active", link.hash.slice(1) === activeH2));
    $("#toc-rail-fill").style.height = (((index + 1) / headings.length) * 100).toFixed(1) + "%";
  }

  function watchHeadings() {
    if (!headings.length || !("IntersectionObserver" in window)) return;
    if (tocObserver) tocObserver.disconnect();
    tocObserver = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (!visible.length) return;
        const index = headings.findIndex((item) => item.element === visible[0].target);
        setActiveHeading(index);
      },
      { rootMargin: "-18% 0px -62% 0px", threshold: [0, 0.25, 1] }
    );
    headings.forEach((item) => tocObserver.observe(item.element));
    setActiveHeading(0);
  }

  function updateProgress() {
    const root = document.documentElement;
    const max = root.scrollHeight - root.clientHeight;
    $("#reading-progress").style.width = (max > 0 ? (scrollY / max) * 100 : 0).toFixed(2) + "%";
  }

  function closeDrawers() {
    $$(".is-drawer").forEach((element) => element.classList.remove("is-open"));
    $("#drawer-backdrop").classList.remove("is-open");
  }

  function initDrawers() {
    const open = (element) => {
      closeDrawers();
      element.classList.add("is-drawer", "is-open");
      $("#drawer-backdrop").classList.add("is-open");
    };
    $("#open-nav").addEventListener("click", () => open($("#doc-nav")));
    $("#open-toc").addEventListener("click", () => open($("#doc-toc")));
    $("#drawer-backdrop").addEventListener("click", closeDrawers);
  }

  function searchResults(query) {
    const normalized = query.trim().toLowerCase();
    return headings
      .map((item) => ({
        title: item.element.textContent.replace(/#$/, "").trim(),
        href: "#" + item.element.id,
        category: item.depth === 2 ? "Section" : "Subsection",
      }))
      .filter((item) => !normalized || item.title.toLowerCase().includes(normalized))
      .slice(0, 14);
  }

  function renderSearch(query) {
    const list = $("#cmd-results");
    const results = searchResults(query);
    list.innerHTML = "";
    if (!results.length) {
      list.innerHTML = '<li class="mv-cmd-empty">No matches</li>';
      activeResult = -1;
      return;
    }
    results.forEach((result, index) => {
      const item = document.createElement("li");
      item.className = "mv-cmd-item" + (index === 0 ? " is-active" : "");
      item.dataset.href = result.href;
      item.innerHTML = '<span class="mv-cmd-title"></span><span class="mv-cmd-cat"></span>';
      $(".mv-cmd-title", item).textContent = result.title;
      $(".mv-cmd-cat", item).textContent = result.category;
      item.addEventListener("mouseenter", () => {
        $$(".mv-cmd-item", list).forEach((node) => node.classList.remove("is-active"));
        item.classList.add("is-active");
        activeResult = index;
      });
      item.addEventListener("click", () => {
        closeSearch();
        location.hash = result.href;
      });
      list.appendChild(item);
    });
    activeResult = 0;
  }

  function openSearch() {
    $("#cmd-palette").hidden = false;
    document.body.classList.add("mv-cmd-open");
    renderSearch("");
    requestAnimationFrame(() => {
      $("#cmd-input").value = "";
      $("#cmd-input").focus();
    });
  }

  function closeSearch() {
    $("#cmd-palette").hidden = true;
    document.body.classList.remove("mv-cmd-open");
    activeResult = -1;
  }

  function initSearch() {
    $("#open-search").addEventListener("click", openSearch);
    $("#cmd-scrim").addEventListener("click", closeSearch);
    $("#cmd-input").addEventListener("input", (event) => renderSearch(event.target.value));
    $("#cmd-input").addEventListener("keydown", (event) => {
      const items = $$(".mv-cmd-item");
      if (event.key === "ArrowDown") {
        event.preventDefault();
        if (!items.length) return;
        activeResult = Math.min(items.length - 1, activeResult + 1);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        if (!items.length) return;
        activeResult = Math.max(0, activeResult - 1);
      } else if (event.key === "Enter") {
        event.preventDefault();
        const active = items[activeResult] || items[0];
        if (active) {
          closeSearch();
          location.hash = active.dataset.href;
        }
        return;
      } else {
        return;
      }
      items.forEach((item, index) => item.classList.toggle("is-active", index === activeResult));
      items[activeResult].scrollIntoView({ block: "nearest" });
    });

    document.addEventListener("keydown", (event) => {
      const shortcut = event.metaKey || event.ctrlKey;
      if (shortcut && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if ($("#cmd-palette").hidden) openSearch();
        else closeSearch();
      } else if (event.key === "Escape") {
        if (!$("#cmd-palette").hidden) closeSearch();
        else closeDrawers();
      } else if (
        event.key === "/" &&
        !shortcut &&
        !/INPUT|TEXTAREA|SELECT/.test(event.target.tagName) &&
        !event.target.isContentEditable
      ) {
        event.preventDefault();
        openSearch();
      }
    });
  }

  function initDevMode() {
    const stored = localStorage.getItem("iching-snapshot-dev") === "1";
    document.documentElement.classList.toggle("ic-dev-mode", stored);
    const btn = $("#dev-mode-toggle");
    if (!btn) return;
    btn.setAttribute("aria-pressed", stored ? "true" : "false");
    btn.classList.toggle("is-active", stored);
    btn.addEventListener("click", () => {
      const next = !document.documentElement.classList.contains("ic-dev-mode");
      document.documentElement.classList.toggle("ic-dev-mode", next);
      localStorage.setItem("iching-snapshot-dev", next ? "1" : "0");
      btn.setAttribute("aria-pressed", next ? "true" : "false");
      btn.classList.toggle("is-active", next);
    });
  }

  function isEmptyValue(text) {
    const value = String(text || "")
      .replace(/\u00a0/g, " ")
      .trim();
    return !value || value === "—" || value === "-" || value === "–" || value === "N/A";
  }

  function parseHexagramLabel(raw) {
    const text = String(raw || "")
      .replace(/\*\*/g, "")
      .replace(/\s+/g, " ")
      .trim();
    const match = text.match(/^#(\d+)\s*(.*)$/);
    if (!match) return null;
    const num = match[1];
    let rest = (match[2] || "").trim();
    if (!rest) return { num, zh: "", vi: "" };
    const glued = rest.match(/^([\u4e00-\u9fff]+)(.*)$/);
    if (glued) {
      return { num, zh: glued[1], vi: glued[2].trim() };
    }
    return { num, zh: "", vi: rest };
  }

  function hexagramHtml(parts) {
    return (
      '<span class="ic-hex">' +
      '<span class="ic-hex-num">#' +
      escapeHtml(parts.num) +
      "</span>" +
      (parts.zh
        ? '<span class="ic-hex-zh" lang="zh-Hans">' + escapeHtml(parts.zh) + "</span>"
        : "") +
      (parts.vi ? '<span class="ic-hex-vi">' + escapeHtml(parts.vi) + "</span>" : "") +
      "</span>"
    );
  }

  function enrichInlineHtml(html) {
    let out = String(html || "");
    out = out.replace(/\[(E-[A-Z0-9_-]+)\]/g, '<span class="ic-evidence" title="$1">$1</span>');
    out = out.replace(/#(\d+)\s*([\u4e00-\u9fff]+)?\s*([^<#\n|]*)/g, (full, num, zh, vi) => {
      const parts = {
        num,
        zh: zh || "",
        vi: String(vi || "")
          .replace(/<\/?strong>/gi, "")
          .trim(),
      };
      if (!parts.zh && !parts.vi) return full;
      // Avoid rewriting inside already-built hex spans
      return hexagramHtml(parts);
    });
    return out;
  }

  function cellText(cell) {
    return (cell.textContent || "").replace(/\s+/g, " ").trim();
  }

  function classifyTable(headers) {
    const joined = headers.join(" | ").toLowerCase();
    if (joined.includes("loại quẻ") && joined.includes("tên quẻ")) return "structure";
    if (joined.includes("mục") && joined.includes("kết quả")) return "summary";
    if (joined.includes("trường") && joined.includes("giá trị")) return "fields";
    if (headers.length >= 6) return "wide";
    if (headers.length <= 3) return "kv";
    return "default";
  }

  function roleClass(label) {
    const key = String(label || "").toLowerCase();
    if (key.includes("chủ")) return "role-primary";
    if (key.includes("hỗ") || key.includes("nuclear")) return "role-nuclear";
    if (key.includes("biến")) return "role-changed";
    if (key.includes("động") || key.includes("hào")) return "role-moving";
    return "role-default";
  }

  function enhanceHexagramNodes(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.nodeValue || !node.nodeValue.includes("#")) return NodeFilter.FILTER_REJECT;
        if (node.parentElement && node.parentElement.closest(".ic-hex, .ic-evidence, a, code, pre")) {
          return NodeFilter.FILTER_REJECT;
        }
        return /#\d+/.test(node.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      },
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((node) => {
      const text = node.nodeValue;
      const parts = parseHexagramLabel(text.trim());
      if (!parts) return;
      // Only rewrite when the whole text node is essentially a hexagram label
      if (!/^#\d+\s*.+$/.test(text.trim()) || text.trim().length > 48) {
        // Partial rewrite inside longer text
        const replaced = text.replace(/#(\d+)\s*([\u4e00-\u9fff]+)?\s*([A-Za-zÀ-ỹ][^\[\]\n|]*)?/g, (full, num, zh, vi) => {
          return hexagramHtml({ num, zh: zh || "", vi: (vi || "").trim() });
        });
        if (replaced === text) return;
        const wrap = document.createElement("span");
        wrap.innerHTML = replaced;
        node.parentNode.replaceChild(wrap, node);
        return;
      }
      const wrap = document.createElement("span");
      wrap.innerHTML = hexagramHtml(parts);
      node.parentNode.replaceChild(wrap, node);
    });
  }

  function enhanceEvidenceIds(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.nodeValue || !node.nodeValue.includes("[E-")) return NodeFilter.FILTER_REJECT;
        if (node.parentElement && node.parentElement.closest(".ic-evidence, a, code, pre")) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((node) => {
      const html = node.nodeValue.replace(
        /\[(E-[A-Z0-9_-]+)\]/g,
        '<span class="ic-evidence" title="$1">$1</span>'
      );
      if (html === node.nodeValue) return;
      const wrap = document.createElement("span");
      wrap.innerHTML = html;
      node.parentNode.replaceChild(wrap, node);
    });
  }

  function buildKvCards(table, headers, kind) {
    const cards = document.createElement("div");
    cards.className = "ic-card-grid ic-card-grid--" + kind;
    const bodyRows = $$("tr", table).slice(1);
    bodyRows.forEach((row) => {
      const cells = $$("th, td", row);
      if (!cells.length) return;
      if (kind === "structure" || (kind === "kv" && headers.length === 3)) {
        const label = cellText(cells[0]);
        const value = cellText(cells[1] || cells[0]);
        const evidence = cellText(cells[2] || "");
        if (isEmptyValue(label) && isEmptyValue(value)) return;
        if (isEmptyValue(value) && kind === "structure") {
          // Still show empty changed hex as muted empty card? Hide elegantly.
          const emptyCard = document.createElement("article");
          emptyCard.className = "ic-hex-card is-empty " + roleClass(label);
          emptyCard.innerHTML =
            '<header class="ic-hex-card-head">' +
            escapeHtml(label) +
            '</header><p class="ic-hex-card-empty">Không có</p>';
          cards.appendChild(emptyCard);
          return;
        }
        const card = document.createElement("article");
        card.className = "ic-hex-card " + roleClass(label);
        const hex = parseHexagramLabel(value);
        card.innerHTML =
          '<header class="ic-hex-card-head">' +
          escapeHtml(label) +
          "</header>" +
          (hex
            ? hexagramHtml(hex)
            : '<div class="ic-hex-card-value">' + enrichInlineHtml(escapeHtml(value)) + "</div>") +
          (evidence && !isEmptyValue(evidence)
            ? '<footer class="ic-hex-card-foot ic-hex-card-foot--evidence">' +
              enrichInlineHtml(escapeHtml(evidence)) +
              "</footer>"
            : "");
        cards.appendChild(card);
        return;
      }

      // summary / fields / generic 2-col
      if (headers.length === 2 || kind === "summary" || kind === "fields") {
        const label = cellText(cells[0]);
        const value = cellText(cells[1] || "");
        if (isEmptyValue(value)) return;
        const card = document.createElement("article");
        card.className = "ic-kv-card";
        const hex = parseHexagramLabel(value);
        card.innerHTML =
          '<div class="ic-kv-label">' +
          escapeHtml(label) +
          '</div><div class="ic-kv-value">' +
          (hex ? hexagramHtml(hex) : enrichInlineHtml(cells[1] ? cells[1].innerHTML : escapeHtml(value))) +
          "</div>";
        cards.appendChild(card);
        return;
      }

      // multi-col → stacked field card
      const card = document.createElement("article");
      card.className = "ic-row-card";
      const title = cellText(cells[0]);
      card.innerHTML = '<header class="ic-row-card-head">' + escapeHtml(title || "Row") + "</header>";
      const body = document.createElement("dl");
      body.className = "ic-row-card-body";
      cells.forEach((cell, index) => {
        const value = cellText(cell);
        if (isEmptyValue(value)) return;
        if (index === 0 && headers.length > 2) return;
        const dt = document.createElement("dt");
        dt.textContent = headers[index] || "Field " + (index + 1);
        const dd = document.createElement("dd");
        const hex = parseHexagramLabel(value);
        dd.innerHTML = hex ? hexagramHtml(hex) : enrichInlineHtml(cell.innerHTML);
        body.append(dt, dd);
      });
      if (!body.children.length) return;
      card.appendChild(body);
      cards.appendChild(card);
    });
    return cards;
  }

  function enhanceTables(article) {
    $$("table", article).forEach((table) => {
      if (table.closest(".ic-table-shell")) return;
      const rows = $$("tr", table);
      if (!rows.length) return;
      const headerCells = $$("th, td", rows[0]);
      const headers = headerCells.map((cell) => cellText(cell));
      const kind = classifyTable(headers);

      const shell = document.createElement("div");
      shell.className = "ic-table-shell ic-table--" + kind;
      table.parentNode.insertBefore(shell, table);
      shell.appendChild(table);
      table.classList.add("ic-table-source");

      // Always polish source table cells
      $$("td, th", table).forEach((cell) => {
        if (isEmptyValue(cellText(cell))) {
          cell.classList.add("ic-empty");
          cell.innerHTML = '<span class="ic-empty-mark">—</span>';
          return;
        }
        const hex = parseHexagramLabel(cellText(cell));
        if (hex && /^#\d+/.test(cellText(cell)) && cellText(cell).length < 48) {
          cell.innerHTML = hexagramHtml(hex);
          return;
        }
        cell.innerHTML = enrichInlineHtml(cell.innerHTML);
      });

      if (kind === "structure" || kind === "summary" || kind === "fields" || kind === "kv") {
        const cards = buildKvCards(table, headers, kind === "kv" ? "structure" : kind);
        if (cards.children.length) {
          shell.appendChild(cards);
          table.classList.add("ic-table-desktop-only");
          if (kind === "structure" || kind === "summary") {
            // Prefer cards as primary view for these semantic tables
            table.classList.add("ic-table-hidden-source");
            cards.classList.add("ic-card-grid--primary");
          }
        }
      } else if (kind === "wide" || headers.length >= 4) {
        const cards = buildKvCards(table, headers, "wide");
        if (cards.children.length) {
          cards.classList.add("ic-card-grid--mobile");
          shell.appendChild(cards);
          table.classList.add("ic-table-desktop-only");
        }
      }
    });
  }


  function enhanceCallouts(article) {
    const methodBody = $("#method-drawer-body");
    const methodDrawer = $("#method-drawer");
    $$("blockquote", article).forEach((quote, index) => {
      if (quote.classList.contains("ic-callout")) return;
      const text = (quote.textContent || "").trim();
      let type = "note";
      let label = "Ghi chú";
      if (/luật luận giải/i.test(text)) {
        // Move AI/rules block to the method drawer — not the top of the reading flow.
        if (methodBody && methodDrawer) {
          methodBody.appendChild(quote);
          methodDrawer.hidden = false;
          quote.className = "ic-callout ic-callout--rules";
          const labelEl = document.createElement("div");
          labelEl.className = "ic-callout-label";
          labelEl.textContent = "Phương pháp luận giải";
          quote.insertBefore(labelEl, quote.firstChild);
          return;
        }
        type = "rules";
        label = "Phương pháp luận giải";
      } else if (/câu hỏi:/i.test(text) || /\*\*câu hỏi:\*\*/i.test(quote.innerHTML)) {
        // Question is already featured in the story hero — demote duplicate.
        quote.className = "ic-callout ic-callout--question-dup";
        quote.hidden = true;
        return;
      } else if (/^\s*quẻ:/i.test(text) || /\*\*quẻ:\*\*/i.test(quote.innerHTML)) {
        quote.hidden = true;
        return;
      } else if (/lợi|chớ|hanh|trinh|cát|hung/i.test(text)) {
        type = "scripture";
        label = "Kinh văn";
      }
      quote.className = "ic-callout ic-callout--" + type;
      const labelEl = document.createElement("div");
      labelEl.className = "ic-callout-label";
      labelEl.textContent = label;
      quote.insertBefore(labelEl, quote.firstChild);
      enhanceHexagramNodes(quote);
      enhanceEvidenceIds(quote);
    });
  }

  function enhanceLists(article) {
    $$("ul, ol", article).forEach((list) => {
      list.classList.add("ic-list");
      if (list.children.length >= 8 && list.parentElement === article) list.classList.add("ic-list-long");
    });
  }

  function enhanceCollapsibleSections(article) {
    $$("h2", article).forEach((heading) => {
      if (heading.classList.contains("ic-section-heading")) return;
      const kind = sectionKind(heading.textContent);
      const block = document.createElement("section");
      block.className = "ic-section-block ic-section--" + kind;
      block.dataset.kind = kind;
      heading.parentNode.insertBefore(block, heading);

      heading.classList.add("ic-section-heading");
      const toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "ic-section-toggle";
      toggle.setAttribute("aria-expanded", "true");
      toggle.setAttribute("aria-label", "Thu gọn mục");
      toggle.textContent = "▾";
      heading.appendChild(toggle);

      const body = document.createElement("div");
      body.className = "ic-section-body";
      let node = heading.nextSibling;
      while (node && !(node.nodeType === 1 && /^H[12]$/.test(node.tagName))) {
        const next = node.nextSibling;
        body.appendChild(node);
        node = next;
      }
      block.append(heading, body);

      // Wrap original title so Reading Mode can show a softer label.
      const rawTitle = document.createElement("span");
      rawTitle.className = "ic-section-raw-title";
      while (heading.firstChild && heading.firstChild !== toggle) {
        rawTitle.appendChild(heading.firstChild);
      }
      const soft = document.createElement("span");
      soft.className = "ic-section-soft-label";
      soft.textContent = readingLabel(rawTitle.textContent);
      heading.insertBefore(soft, toggle);
      heading.insertBefore(rawTitle, toggle);

      toggle.addEventListener("click", (event) => {
        event.preventDefault();
        const collapsed = body.classList.toggle("is-collapsed");
        heading.classList.toggle("is-collapsed", collapsed);
        toggle.textContent = collapsed ? "▸" : "▾";
        toggle.setAttribute("aria-expanded", String(!collapsed));
      });
    });
  }

  function enhanceSemantic(article) {
    article.classList.add("ic-semantic");
    enhanceCallouts(article);
    enhanceTables(article);
    enhanceEvidenceIds(article);
    enhanceHexagramNodes(article);
    enhanceLists(article);
    enhanceCollapsibleSections(article);
    $$("code", article).forEach((code) => {
      if (code.parentElement && code.parentElement.tagName === "PRE") return;
      code.classList.add("ic-code-pill");
    });

    // Tone conclusion / advice cards
    $$(".ic-section--reading .ic-kv-card", article).forEach((card) => {
      const label = ($(".ic-kv-label", card)?.textContent || "").toLowerCase();
      const value = ($(".ic-kv-value", card)?.textContent || "").toLowerCase();
      if (/kết luận|phán/.test(label) || /kết luận tổng hợp/.test(label)) {
        card.classList.add("ic-kv-card--verdict", outcomeTone(value));
      } else if (/hành động|khuyên/.test(label)) {
        card.classList.add("ic-kv-card--advice");
      } else if (/câu hỏi/.test(label)) {
        card.classList.add("ic-kv-card--question");
      }
    });
  }

  function looksLikeIchingMarkdown(markdown) {
    return /\*\*Luật luận giải:\*\*|\*\*Quẻ:\*\*|Kết luận tổng hợp|Thủy Lôi|\[E-[A-Z0-9-]+\]/i.test(markdown);
  }

  function extractGenericInfo(markdown, article) {
    const titleHeading = $("h1", article);
    const title = titleHeading
      ? titleHeading.textContent.replace(/#$/, "").trim()
      : (activeSource && activeSource.titleFallback) || "Markdown";
    const firstQuote = markdown.match(/^>\s*(.+)$/m);
    const firstPara = markdown.match(/^[^#>\-|\[][^\n]{20,180}/m);
    return {
      title,
      question: "",
      hexagram: "",
      outcome: "",
      confidence: "",
      action: "",
      epigraph: (firstQuote ? firstQuote[1] : firstPara ? firstPara[0] : "")
        .replace(/\*\*/g, "")
        .trim()
        .slice(0, 220),
    };
  }

  function setGenericHero(markdown, info) {
    document.title = info.title + " — Quizzman";
    const storyHex = $("#story-hex");
    if (storyHex) {
      storyHex.innerHTML = '<div class="story-generic-title">' + escapeHtml(info.title) + "</div>";
    }
    const outcomeEl = $("#story-outcome");
    if (outcomeEl) outcomeEl.hidden = true;
    const epigraph = $("#story-epigraph");
    if (epigraph) {
      if (info.epigraph) {
        epigraph.hidden = false;
        epigraph.textContent = info.epigraph;
      } else epigraph.hidden = true;
    }
    const question = $("#story-question");
    if (question) question.hidden = true;
    const meta = $("#doc-meta");
    if (meta) {
      meta.innerHTML =
        '<span class="mv-meta-item">Đọc khoảng ' +
        estimateReadMinutes(markdown) +
        " phút</span>" +
        (activeSource && activeSource.fetchUrl
          ? '<span class="mv-meta-path">' + escapeHtml(String(activeSource.fetchUrl).replace(/[?&]raw=1/, "")) + "</span>"
          : "");
    }
    $("#doc-hero").hidden = false;
    if ($("#side-hexagram")) $("#side-hexagram").textContent = info.title;
    if ($("#side-outcome")) $("#side-outcome").textContent = "";
    if ($("#side-label")) $("#side-label").textContent = "Tài liệu";
    if ($("#full-result-link")) {
      $("#full-result-link").hidden = true;
      $("#full-result-link").style.display = "none";
    }
    if ($("#side-full-link")) $("#side-full-link").style.display = "none";
    if ($("#side-json-link")) $("#side-json-link").style.display = "none";
    if ($("#raw-link")) $("#raw-link").href = rawUrl();
    document.documentElement.setAttribute("data-doc-kind", "generic");
  }

  function yieldToPaint() {
    return new Promise((resolve) => {
      if (typeof requestAnimationFrame === "function") {
        requestAnimationFrame(() => setTimeout(resolve, 0));
      } else {
        setTimeout(resolve, 0);
      }
    });
  }

  async function loadDocument() {
    activeSource = resolveSource();
    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timeout = setTimeout(() => controller && controller.abort(), 12000);
    let response;
    try {
      response = await fetch(activeSource.fetchUrl, {
        credentials: "omit",
        headers: { Accept: "text/markdown, text/plain;q=0.9, */*;q=0.8" },
        signal: controller ? controller.signal : undefined,
      });
    } catch (err) {
      clearTimeout(timeout);
      throw new Error("Không tải được Markdown (timeout/mạng)");
    }
    clearTimeout(timeout);
    if (!response.ok) throw new Error("Không tải được Markdown (" + response.status + ")");
    const markdown = await response.text();
    if (/^\s*<!doctype html>/i.test(markdown)) throw new Error("Nhận HTML thay vì Markdown — thử thêm &raw=1");

    const kind =
      activeSource.kind === "iching" || looksLikeIchingMarkdown(markdown) ? "iching" : "generic";
    activeSource.kind = kind;
    document.documentElement.setAttribute("data-doc-kind", kind);

    // Paint hero immediately from markdown text — before heavy DOM work.
    if (kind === "iching") {
      setHero(markdown, extractSnapshotInfo(markdown, document.createElement("div")), activeSource.hash || "");
    }

    const article = $("#article");
    article.innerHTML = createRenderer().render(markdown);
    enhanceHeadings(article);

    // Structure first so Reading Mode can show content quickly.
    if (kind === "iching") {
      enhanceCallouts(article);
      enhanceCollapsibleSections(article);
      navArticle = article;
      initViewMode();
    } else {
      enhanceCollapsibleSections(article);
      $$("blockquote", article).forEach((quote) => {
        if (!quote.classList.contains("ic-callout")) {
          quote.classList.add("ic-callout", "ic-callout--note");
        }
      });
      setGenericHero(markdown, extractGenericInfo(markdown, article));
      navArticle = article;
      document.documentElement.setAttribute("data-view-mode", "reading");
      $$(".ic-section-block").forEach((block) => {
        block.dataset.kind = "reading";
        block.classList.remove("ic-section--research");
        block.classList.add("ic-section--reading");
      });
      rebuildNavigation();
    }

    const duplicateH1 = $("h1", article);
    if (duplicateH1) duplicateH1.classList.add("mv-h1-dup");
    article.hidden = false;
    $("#status").hidden = true;

    // Defer expensive polish so first paint is not blocked / frozen.
    await yieldToPaint();
    if (kind === "iching") {
      enhanceTables(article);
      enhanceLists(article);
      enhanceEvidenceIds(article);
      enhanceHexagramNodes(article);
      $$("code", article).forEach((code) => {
        if (code.parentElement && code.parentElement.tagName === "PRE") return;
        code.classList.add("ic-code-pill");
      });
      $$(".ic-section--reading .ic-kv-card", article).forEach((card) => {
        const label = ($(".ic-kv-label", card)?.textContent || "").toLowerCase();
        const value = ($(".ic-kv-value", card)?.textContent || "").toLowerCase();
        if (/kết luận|phán/.test(label) || /kết luận tổng hợp/.test(label)) {
          card.classList.add("ic-kv-card--verdict", outcomeTone(value));
        } else if (/hành động|khuyên/.test(label)) {
          card.classList.add("ic-kv-card--advice");
        } else if (/câu hỏi/.test(label)) {
          card.classList.add("ic-kv-card--question");
        }
      });
      // Code highlighting is optional for I-Ching reports — do it last.
      enhanceCodeBlocks(article);
      rebuildNavigation();
    } else {
      enhanceLists(article);
      enhanceCodeBlocks(article);
      rebuildNavigation();
    }

    if (location.hash) {
      const target = document.getElementById(location.hash.slice(1));
      if (target) {
        const block = target.closest(".ic-section-block");
        if (block && block.dataset.kind === "research") applyViewMode("research");
        requestAnimationFrame(() => target.scrollIntoView());
      }
    }
  }

  async function main() {
    initTheme();
    initDevMode();
    syncShortcut();
    initDrawers();
    initSearch();
    addEventListener("scroll", updateProgress, { passive: true });
    updateProgress();
    try {
      await loadDocument();
    } catch (error) {
      const status = $("#status");
      status.className = "mv-status error";
      status.textContent = error.message || String(error);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", main);
  } else {
    main();
  }
})();
