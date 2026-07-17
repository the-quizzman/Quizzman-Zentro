/**
 * QMF Markdown Viewer
 * Portal-grade reading shell for /qmf/docs/*.md
 */
(function () {
  "use strict";

  const ALLOWED_PREFIX = "/qmf/";
  const INDEX_URL = "/qmf/docs-index.json";
  const SEARCH_URL = "/qmf/search.json";
  const DEFAULT_SRC = "/qmf/docs/USAGE.md";

  const CAT_MARK = {
    "Getting Started": "↓",
    Core: "◇",
    Components: "▣",
    API: "↦",
    Guides: "≡",
    Registry: "◎",
    AI: "✶",
    Advanced: "△",
    Examples: "▷",
    Docs: "◉",
  };

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  let tocObserver = null;
  let searchEntries = [];
  let cmdActive = -1;

  function resolveSrc() {
    const params = new URLSearchParams(location.search);
    const fromQuery = params.get("src") || params.get("path");
    if (fromQuery) return normalizeSrc(fromQuery);
    if (/\.md$/i.test(location.pathname)) return normalizeSrc(location.pathname);
    const hash = location.hash.replace(/^#/, "");
    if (hash && /\.md$/i.test(hash)) return normalizeSrc(hash);
    return DEFAULT_SRC;
  }

  function normalizeSrc(raw) {
    let src = String(raw || "").trim();
    if (!src) return DEFAULT_SRC;
    try {
      if (/^https?:\/\//i.test(src)) {
        const u = new URL(src);
        if (u.origin !== location.origin) throw new Error("Cross-origin markdown blocked");
        src = u.pathname;
      }
    } catch (e) {
      throw e;
    }
    if (!src.startsWith("/")) src = "/" + src;
    if (src.startsWith("/docs/")) src = "/qmf" + src;
    if (!src.startsWith(ALLOWED_PREFIX)) throw new Error("Path must be under /qmf/");
    if (src.includes("..")) throw new Error("Invalid path");
    if (!/\.md$/i.test(src)) throw new Error("Only .md files are supported");
    if (/\.internal\.md$/i.test(src)) throw new Error("Document not available");
    return src;
  }

  function normalizeSafe(href) {
    try {
      return normalizeSrc(href);
    } catch (_) {
      return "";
    }
  }

  function rawUrl(src) {
    const u = new URL(src, location.origin);
    u.searchParams.set("raw", "1");
    return u.pathname + u.search;
  }

  function titleFromPath(src) {
    const base = src.split("/").pop() || src;
    return base.replace(/\.md$/i, "").replace(/[-_]/g, " ");
  }

  function slugify(text) {
    return String(text)
      .toLowerCase()
      .trim()
      .replace(/<[^>]+>/g, "")
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 80);
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function estimateReadMinutes(text) {
    const words = String(text).trim().split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.round(words / 200));
  }

  function formatDate(iso) {
    if (!iso) return "";
    const d = new Date(iso + (iso.length <= 10 ? "T00:00:00" : ""));
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  function stabilityLabel(doc) {
    if (!doc) return null;
    if (doc.new) return { text: "New", kind: "new" };
    if (/v4|alpha/i.test(doc.href || "") || /v4|alpha/i.test(doc.title || "")) {
      return { text: "Alpha", kind: "alpha" };
    }
    return { text: "Stable", kind: "stable" };
  }

  function initTheme() {
    const stored = localStorage.getItem("qmf-theme");
    if (stored === "light" || stored === "dark") {
      document.documentElement.setAttribute("data-theme", stored);
    }
    const btn = $("#theme-toggle");
    if (btn) {
      btn.addEventListener("click", () => {
        const cur = document.documentElement.getAttribute("data-theme");
        const preferDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        const nowDark = cur ? cur === "dark" : preferDark;
        const next = nowDark ? "light" : "dark";
        document.documentElement.setAttribute("data-theme", next);
        localStorage.setItem("qmf-theme", next);
      });
    }
  }

  function syncKbdHint() {
    const isMac = /Mac|iPhone|iPad/.test(navigator.platform || "") || /Mac/.test(navigator.userAgent || "");
    $$(".mv-search-trigger .mv-kbd").forEach((el) => {
      el.textContent = isMac ? "⌘K" : "Ctrl K";
    });
  }

  function createMd() {
    if (!window.markdownit) throw new Error("markdown-it failed to load");
    const md = window.markdownit({
      html: false,
      linkify: true,
      typographer: true,
      breaks: false,
      highlight(str, lang) {
        if (lang && window.hljs && window.hljs.getLanguage(lang)) {
          try {
            return (
              '<pre><code class="hljs language-' +
              md.utils.escapeHtml(lang) +
              '">' +
              window.hljs.highlight(str, { language: lang, ignoreIllegals: true }).value +
              "</code></pre>"
            );
          } catch (_) {
            /* fall through */
          }
        }
        return '<pre><code class="hljs">' + md.utils.escapeHtml(str) + "</code></pre>";
      },
    });

    const defaultLinkOpen =
      md.renderer.rules.link_open ||
      function (tokens, idx, options, env, self) {
        return self.renderToken(tokens, idx, options);
      };

    md.renderer.rules.link_open = function (tokens, idx, options, env, self) {
      const token = tokens[idx];
      const hrefIdx = token.attrIndex("href");
      if (hrefIdx >= 0) {
        const href = token.attrs[hrefIdx][1];
        if (/^https?:\/\//i.test(href) && !href.includes(location.host)) {
          token.attrPush(["target", "_blank"]);
          token.attrPush(["rel", "noopener noreferrer"]);
        } else if (/\.md($|#|\?)/i.test(href) || href.endsWith(".md")) {
          try {
            const base = env.srcPath || location.pathname;
            const abs = new URL(href, location.origin + base);
            if (abs.pathname.startsWith(ALLOWED_PREFIX) && /\.md$/i.test(abs.pathname)) {
              token.attrs[hrefIdx][1] = abs.pathname + abs.hash;
            }
          } catch (_) {
            /* keep */
          }
        }
      }
      return defaultLinkOpen(tokens, idx, options, env, self);
    };

    return md;
  }

  function enhanceHeadings(root) {
    const used = new Set();
    $$("h1, h2, h3", root).forEach((el) => {
      let id = el.id || slugify(el.textContent);
      let n = 0;
      let candidate = id;
      while (used.has(candidate)) {
        n += 1;
        candidate = id + "-" + n;
      }
      id = candidate;
      used.add(id);
      el.id = id;
      const a = document.createElement("a");
      a.className = "heading-anchor";
      a.href = "#" + id;
      a.setAttribute("aria-label", "Link to section");
      a.textContent = "#";
      el.appendChild(a);
    });
  }

  function langLabel(code) {
    const cls = code.className || "";
    const m = cls.match(/language-([\w+-]+)/i);
    if (!m) return "Code";
    const map = {
      js: "JavaScript",
      javascript: "JavaScript",
      ts: "TypeScript",
      typescript: "TypeScript",
      html: "HTML",
      css: "CSS",
      json: "JSON",
      bash: "Bash",
      sh: "Shell",
      shell: "Shell",
      md: "Markdown",
      markdown: "Markdown",
      yaml: "YAML",
      yml: "YAML",
      xml: "XML",
      sql: "SQL",
      python: "Python",
      py: "Python",
      text: "Plain text",
    };
    const key = m[1].toLowerCase();
    return map[key] || m[1].toUpperCase();
  }

  function enhanceCodeBlocks(root) {
    $$("pre", root).forEach((pre) => {
      if (pre.closest(".code-block")) return;
      const code = pre.querySelector("code");
      const wrap = document.createElement("div");
      wrap.className = "code-block";
      const header = document.createElement("div");
      header.className = "code-header";
      const lang = document.createElement("span");
      lang.className = "code-lang";
      lang.textContent = langLabel(code || pre);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "code-copy";
      btn.textContent = "Copy";
      btn.addEventListener("click", async () => {
        const text = code ? code.innerText : pre.innerText;
        try {
          await navigator.clipboard.writeText(text);
          btn.textContent = "Copied";
          btn.classList.add("copied");
          setTimeout(() => {
            btn.textContent = "Copy";
            btn.classList.remove("copied");
          }, 1400);
        } catch (_) {
          btn.textContent = "Failed";
        }
      });
      header.appendChild(lang);
      header.appendChild(btn);
      pre.parentNode.insertBefore(wrap, pre);
      wrap.appendChild(header);
      wrap.appendChild(pre);
    });
  }

  function buildToc(root) {
    const toc = $("#toc-list");
    if (!toc) return [];
    toc.innerHTML = "";
    const headings = $$("h2, h3", root);
    if (!headings.length) {
      toc.innerHTML = '<li class="mv-toc-empty">No sections</li>';
      return [];
    }

    const items = [];
    let currentH2 = null;

    headings.forEach((h) => {
      const depth = Number(h.tagName.slice(1));
      const text = h.textContent.replace(/#$/, "").trim();
      const a = document.createElement("a");
      a.href = "#" + h.id;
      a.textContent = text;
      a.addEventListener("click", () => closeDrawers());

      if (depth === 2) {
        const li = document.createElement("li");
        li.className = "toc-item toc-h2";
        const row = document.createElement("div");
        row.className = "toc-row";
        row.appendChild(a);
        li.appendChild(row);
        const children = document.createElement("ul");
        children.className = "toc-children";
        li.appendChild(children);
        toc.appendChild(li);
        currentH2 = { li, children, a, kids: [] };
        items.push({ id: h.id, el: h, link: a, depth: 2, parent: null });
      } else {
        const li = document.createElement("li");
        li.className = "toc-item toc-h3";
        li.appendChild(a);
        if (currentH2) {
          currentH2.children.appendChild(li);
          if (!currentH2.toggle) {
            const parent = currentH2;
            const toggle = document.createElement("button");
            toggle.type = "button";
            toggle.className = "toc-toggle";
            toggle.setAttribute("aria-label", "Collapse section");
            toggle.setAttribute("aria-expanded", "true");
            toggle.textContent = "▾";
            toggle.addEventListener("click", (e) => {
              e.preventDefault();
              const collapsed = parent.li.classList.toggle("is-collapsed");
              toggle.setAttribute("aria-expanded", collapsed ? "false" : "true");
              toggle.textContent = collapsed ? "▸" : "▾";
            });
            currentH2.li.querySelector(".toc-row").appendChild(toggle);
            currentH2.toggle = toggle;
          }
          currentH2.kids.push(a);
          items.push({ id: h.id, el: h, link: a, depth: 3, parent: currentH2 });
        } else {
          toc.appendChild(li);
          items.push({ id: h.id, el: h, link: a, depth: 3, parent: null });
        }
      }
    });

    return items;
  }

  function setActiveToc(items, id) {
    items.forEach((i) => {
      i.link.classList.remove("is-active", "is-active-parent");
    });
    const active = items.find((i) => i.id === id);
    if (!active) return;
    active.link.classList.add("is-active");
    if (active.parent) {
      active.parent.li.classList.remove("is-collapsed");
      if (active.parent.toggle) {
        active.parent.toggle.setAttribute("aria-expanded", "true");
        active.parent.toggle.textContent = "▾";
      }
      active.parent.a.classList.add("is-active-parent");
    } else if (active.depth === 2) {
      active.link.classList.add("is-active-parent");
    }

    const idx = items.findIndex((i) => i.id === id);
    const fill = $("#toc-rail-fill");
    if (fill && items.length) {
      fill.style.height = (((idx + 1) / items.length) * 100).toFixed(1) + "%";
    }
  }

  function watchToc(items) {
    if (tocObserver) {
      tocObserver.disconnect();
      tocObserver = null;
    }
    if (!items.length || !("IntersectionObserver" in window)) return;

    tocObserver = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (!visible.length) return;
        setActiveToc(items, visible[0].target.id);
      },
      { rootMargin: "-18% 0px -62% 0px", threshold: [0, 0.25, 1] }
    );
    items.forEach((i) => tocObserver.observe(i.el));
    if (items[0]) setActiveToc(items, items[0].id);
  }

  function updateProgress() {
    const bar = $("#reading-progress");
    if (!bar) return;
    const doc = document.documentElement;
    const max = doc.scrollHeight - doc.clientHeight;
    const pct = max > 0 ? (window.scrollY / max) * 100 : 0;
    bar.style.width = pct.toFixed(2) + "%";
  }

  async function loadIndex() {
    try {
      const res = await fetch(INDEX_URL, { credentials: "omit" });
      if (!res.ok) return null;
      return await res.json();
    } catch (_) {
      return null;
    }
  }

  async function loadSearchIndex(docsIndex) {
    const fromDocs = (docsIndex && docsIndex.documents ? docsIndex.documents : [])
      .filter((d) => d.href)
      .map((d) => ({
        title: d.title,
        href: d.href,
        category: d.category || "Docs",
        keywords: [],
        new: !!d.new,
      }));

    try {
      const res = await fetch(SEARCH_URL, { credentials: "omit" });
      if (res.ok) {
        const data = await res.json();
        const entries = Array.isArray(data.entries) ? data.entries : [];
        const map = new Map();
        fromDocs.forEach((e) => map.set(e.href, e));
        entries.forEach((e) => {
          const prev = map.get(e.href) || {};
          map.set(e.href, {
            title: e.title || prev.title,
            href: e.href,
            category: e.category || prev.category || "Docs",
            keywords: e.keywords || [],
            new: prev.new,
          });
        });
        searchEntries = Array.from(map.values());
        return;
      }
    } catch (_) {
      /* fall back */
    }
    searchEntries = fromDocs;
  }

  function renderNav(index, currentSrc) {
    const host = $("#nav-groups");
    if (!host || !index || !Array.isArray(index.documents)) return [];

    const docs = index.documents.filter(
      (d) => d.href && String(d.href).endsWith(".md") && !String(d.href).includes(".internal.")
    );
    const groups = new Map();
    docs.forEach((d) => {
      const cat = d.category || "Docs";
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat).push(d);
    });

    host.innerHTML = "";
    groups.forEach((items, cat) => {
      const group = document.createElement("div");
      group.className = "mv-nav-group";

      const label = document.createElement("div");
      label.className = "mv-nav-cat";
      const mark = document.createElement("span");
      mark.className = "mv-nav-mark";
      mark.setAttribute("aria-hidden", "true");
      mark.textContent = CAT_MARK[cat] || "•";
      const name = document.createElement("span");
      name.textContent = cat;
      label.appendChild(mark);
      label.appendChild(name);
      group.appendChild(label);

      const ul = document.createElement("ul");
      ul.className = "mv-nav-list";
      items.forEach((d) => {
        const li = document.createElement("li");
        const a = document.createElement("a");
        a.href = d.href;
        a.textContent = d.title;
        if (d.new) {
          const b = document.createElement("span");
          b.className = "badge";
          b.textContent = "New";
          a.appendChild(b);
        }
        if (normalizeSafe(d.href) === currentSrc) a.classList.add("is-active");
        a.addEventListener("click", () => closeDrawers());
        li.appendChild(a);
        ul.appendChild(li);
      });
      group.appendChild(ul);
      host.appendChild(group);
    });

    return docs;
  }

  function renderPager(docs, currentSrc) {
    const pager = $("#pager");
    if (!pager || !docs.length) {
      if (pager) pager.hidden = true;
      return;
    }
    const idx = docs.findIndex((d) => normalizeSafe(d.href) === currentSrc);
    if (idx < 0) {
      pager.hidden = true;
      return;
    }
    pager.hidden = false;
    pager.innerHTML = "";
    if (idx > 0) {
      const prev = docs[idx - 1];
      const a = document.createElement("a");
      a.className = "prev";
      a.href = prev.href;
      a.innerHTML = "<span>Previous</span><strong></strong>";
      a.querySelector("strong").textContent = prev.title;
      pager.appendChild(a);
    }
    if (idx < docs.length - 1) {
      const next = docs[idx + 1];
      const a = document.createElement("a");
      a.className = "next";
      a.href = next.href;
      a.innerHTML = "<span>Next</span><strong></strong>";
      a.querySelector("strong").textContent = next.title;
      pager.appendChild(a);
    }
  }

  function setHero(src, indexDoc, markdownText) {
    const title = (indexDoc && indexDoc.title) || titleFromPath(src);
    const crumb = $("#crumb-title");
    if (crumb) crumb.textContent = title;
    document.title = title + " — QMF Docs";

    const hero = $("#doc-hero");
    const titleEl = $("#doc-title");
    const meta = $("#doc-meta");
    if (titleEl) titleEl.textContent = title;
    if (meta) {
      const bits = [];
      if (indexDoc && indexDoc.updated) {
        bits.push(
          '<span class="mv-meta-item"><span class="mv-meta-k">Updated</span> ' +
            escapeHtml(formatDate(indexDoc.updated)) +
            "</span>"
        );
      }
      bits.push(
        '<span class="mv-meta-item"><span class="mv-meta-k">Read</span> ' +
          estimateReadMinutes(markdownText || "") +
          " min</span>"
      );
      if (indexDoc && indexDoc.category) {
        bits.push('<span class="pill">' + escapeHtml(indexDoc.category) + "</span>");
      }
      const stab = stabilityLabel(indexDoc);
      if (stab) {
        bits.push('<span class="pill pill-' + stab.kind + '">' + escapeHtml(stab.text) + "</span>");
      }
      bits.push('<span class="mv-meta-path">' + escapeHtml(src.replace(/^\/qmf\//, "")) + "</span>");
      meta.innerHTML = bits.join("");
    }
    if (hero) hero.hidden = false;

    const raw = $("#raw-link");
    if (raw) raw.href = rawUrl(src);

    const copyLink = $("#copy-link");
    if (copyLink) {
      copyLink.onclick = async () => {
        try {
          await navigator.clipboard.writeText(location.href);
          copyLink.textContent = "Copied";
          setTimeout(() => {
            copyLink.textContent = "Copy link";
          }, 1200);
        } catch (_) {
          /* ignore */
        }
      };
    }
  }

  function hideDuplicateH1(article, heroTitle) {
    const h1 = article.querySelector("h1");
    if (!h1 || !heroTitle) return;
    const a = h1.textContent.replace(/#$/, "").trim().toLowerCase();
    const b = String(heroTitle).trim().toLowerCase();
    if (a === b || a.includes(b) || b.includes(a)) {
      h1.classList.add("mv-h1-dup");
    }
  }

  function closeDrawers() {
    $$(".is-drawer").forEach((el) => el.classList.remove("is-open"));
    const bd = $("#drawer-backdrop");
    if (bd) bd.classList.remove("is-open");
  }

  function initDrawers() {
    const backdrop = $("#drawer-backdrop");
    const nav = $("#doc-nav");
    const toc = $("#doc-toc");
    const openNav = $("#open-nav");
    const openToc = $("#open-toc");

    function open(el) {
      closeDrawers();
      if (!el) return;
      el.classList.add("is-drawer", "is-open");
      if (backdrop) backdrop.classList.add("is-open");
    }

    if (openNav) openNav.addEventListener("click", () => open(nav));
    if (openToc) openToc.addEventListener("click", () => open(toc));
    if (backdrop) backdrop.addEventListener("click", closeDrawers);
  }

  function scoreEntry(entry, q) {
    if (!q) return 1;
    const title = (entry.title || "").toLowerCase();
    const cat = (entry.category || "").toLowerCase();
    const href = (entry.href || "").toLowerCase();
    const keys = (entry.keywords || []).join(" ").toLowerCase();
    let score = 0;
    if (title === q) score += 100;
    if (title.startsWith(q)) score += 60;
    if (title.includes(q)) score += 40;
    if (keys.includes(q)) score += 30;
    if (cat.includes(q)) score += 15;
    if (href.includes(q)) score += 10;
    q.split(/\s+/).forEach((part) => {
      if (part.length < 2) return;
      if (title.includes(part)) score += 8;
      if (keys.includes(part)) score += 6;
    });
    return score;
  }

  function renderCmdResults(query) {
    const list = $("#cmd-results");
    if (!list) return;
    const q = String(query || "").trim().toLowerCase();
    const ranked = searchEntries
      .map((e) => ({ e, score: scoreEntry(e, q) }))
      .filter((x) => (q ? x.score > 0 : true))
      .sort((a, b) => b.score - a.score)
      .slice(0, 12);

    list.innerHTML = "";
    if (!ranked.length) {
      list.innerHTML = '<li class="mv-cmd-empty">No matches</li>';
      cmdActive = -1;
      return;
    }

    ranked.forEach((row, i) => {
      const li = document.createElement("li");
      li.className = "mv-cmd-item" + (i === 0 ? " is-active" : "");
      li.setAttribute("role", "option");
      li.dataset.href = row.e.href;
      li.innerHTML =
        '<span class="mv-cmd-title"></span><span class="mv-cmd-cat"></span>';
      li.querySelector(".mv-cmd-title").textContent = row.e.title;
      li.querySelector(".mv-cmd-cat").textContent = row.e.category || "";
      li.addEventListener("mouseenter", () => {
        $$(".mv-cmd-item", list).forEach((n) => n.classList.remove("is-active"));
        li.classList.add("is-active");
        cmdActive = i;
      });
      li.addEventListener("click", () => {
        location.href = row.e.href;
      });
      list.appendChild(li);
    });
    cmdActive = 0;
  }

  function openSearch() {
    const palette = $("#cmd-palette");
    const input = $("#cmd-input");
    if (!palette) return;
    palette.hidden = false;
    document.body.classList.add("mv-cmd-open");
    renderCmdResults("");
    requestAnimationFrame(() => {
      if (input) {
        input.value = "";
        input.focus();
      }
    });
  }

  function closeSearch() {
    const palette = $("#cmd-palette");
    if (!palette) return;
    palette.hidden = true;
    document.body.classList.remove("mv-cmd-open");
    cmdActive = -1;
  }

  function initSearch() {
    const openBtn = $("#open-search");
    const scrim = $("#cmd-scrim");
    const input = $("#cmd-input");
    if (openBtn) openBtn.addEventListener("click", openSearch);
    if (scrim) scrim.addEventListener("click", closeSearch);
    if (input) {
      input.addEventListener("input", () => renderCmdResults(input.value));
      input.addEventListener("keydown", (e) => {
        const items = $$(".mv-cmd-item");
        if (e.key === "ArrowDown") {
          e.preventDefault();
          if (!items.length) return;
          cmdActive = Math.min(items.length - 1, cmdActive + 1);
          items.forEach((n, i) => n.classList.toggle("is-active", i === cmdActive));
          items[cmdActive].scrollIntoView({ block: "nearest" });
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          if (!items.length) return;
          cmdActive = Math.max(0, cmdActive - 1);
          items.forEach((n, i) => n.classList.toggle("is-active", i === cmdActive));
          items[cmdActive].scrollIntoView({ block: "nearest" });
        } else if (e.key === "Enter") {
          e.preventDefault();
          const active = items[cmdActive] || items[0];
          if (active && active.dataset.href) location.href = active.dataset.href;
        }
      });
    }

    document.addEventListener("keydown", (e) => {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        const palette = $("#cmd-palette");
        if (palette && !palette.hidden) closeSearch();
        else openSearch();
        return;
      }
      if (e.key === "Escape") {
        const palette = $("#cmd-palette");
        if (palette && !palette.hidden) {
          closeSearch();
          return;
        }
        closeDrawers();
      }
      if (e.key === "/" && !meta && !e.altKey) {
        const tag = (e.target && e.target.tagName) || "";
        if (/INPUT|TEXTAREA|SELECT/.test(tag) || (e.target && e.target.isContentEditable)) return;
        e.preventDefault();
        openSearch();
      }
    });
  }

  async function loadDocument(src, indexDoc) {
    const article = $("#article");
    const status = $("#status");
    if (status) {
      status.hidden = false;
      status.className = "mv-status";
      status.innerHTML = '<div class="mv-spinner"></div>Loading document…';
    }
    if (article) {
      article.hidden = true;
      article.innerHTML = "";
    }

    const res = await fetch(rawUrl(src), {
      credentials: "omit",
      headers: { Accept: "text/markdown, text/plain;q=0.9, */*;q=0.8" },
    });
    if (!res.ok) throw new Error("Could not load " + src + " (" + res.status + ")");
    const text = await res.text();

    if (/^\s*<!DOCTYPE html>/i.test(text) || /id="article"/i.test(text.slice(0, 500))) {
      throw new Error("Received HTML instead of markdown. Try " + rawUrl(src));
    }

    setHero(src, indexDoc, text);

    const md = createMd();
    const html = md.render(text, { srcPath: src });
    if (article) {
      article.innerHTML = html;
      enhanceHeadings(article);
      enhanceCodeBlocks(article);
      hideDuplicateH1(article, (indexDoc && indexDoc.title) || titleFromPath(src));
      const tocItems = buildToc(article);
      watchToc(tocItems);
      article.hidden = false;
    }
    if (status) status.hidden = true;

    if (location.hash) {
      const el = document.getElementById(location.hash.slice(1));
      if (el) requestAnimationFrame(() => el.scrollIntoView());
    } else {
      window.scrollTo(0, 0);
    }
  }

  async function main() {
    initTheme();
    syncKbdHint();
    initDrawers();
    initSearch();
    window.addEventListener("scroll", updateProgress, { passive: true });
    updateProgress();

    let src;
    try {
      src = resolveSrc();
    } catch (err) {
      const status = $("#status");
      if (status) {
        status.hidden = false;
        status.className = "mv-status error";
        status.textContent = err.message || String(err);
      }
      return;
    }

    const index = await loadIndex();
    await loadSearchIndex(index);
    const docs = renderNav(index, src) || [];
    const indexDoc = docs.find((d) => normalizeSafe(d.href) === src) || null;
    renderPager(docs, src);

    try {
      await loadDocument(src, indexDoc);
    } catch (err) {
      const status = $("#status");
      if (status) {
        status.hidden = false;
        status.className = "mv-status error";
        status.textContent = err.message || String(err);
      }
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", main);
  } else {
    main();
  }

  // Shared embed API lives in markdown-embed.js — keep a pointer for docs tooling.
  window.QuizzmanMarkdownViewer = {
    version: "2026.07.17",
    embedScript: "/qmf/assets/markdown-embed.js",
    embedCss: "/qmf/assets/markdown-embed.css",
  };
})();
