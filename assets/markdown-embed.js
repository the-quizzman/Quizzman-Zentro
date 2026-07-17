/**
 * Quizzman Markdown Embed — shared reading surface for Mentis / Wiki / Dictionary / Docs.
 *
 * Load order:
 *   markdown-it → (optional) highlight.js → markdown-embed.js
 *   + markdown-embed.css
 *
 * API:
 *   QuizzmanMarkdown.mount(container, { markdown, srcPath? })
 *   QuizzmanMarkdown.render(markdown, { srcPath? }) → HTML string
 *   QuizzmanMarkdown.enhance(rootElement)
 */
(function (global) {
  "use strict";

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

  function createMd() {
    if (!global.markdownit) {
      throw new Error("QuizzmanMarkdown requires markdown-it");
    }
    var md = global.markdownit({
      html: false,
      linkify: true,
      typographer: true,
      breaks: false,
      highlight: function (str, lang) {
        if (lang && global.hljs && global.hljs.getLanguage(lang)) {
          try {
            return (
              '<pre><code class="hljs language-' +
              md.utils.escapeHtml(lang) +
              '">' +
              global.hljs.highlight(str, { language: lang, ignoreIllegals: true }).value +
              "</code></pre>"
            );
          } catch (_) {
            /* fall through */
          }
        }
        return '<pre><code class="hljs">' + md.utils.escapeHtml(str) + "</code></pre>";
      },
    });
    return md;
  }

  function langLabel(code) {
    var cls = (code && code.className) || "";
    var m = cls.match(/language-([\w+-]+)/i);
    if (!m) return "Code";
    var map = {
      js: "JavaScript",
      javascript: "JavaScript",
      ts: "TypeScript",
      bash: "Bash",
      sh: "Shell",
      md: "Markdown",
      json: "JSON",
      python: "Python",
      py: "Python",
    };
    var key = m[1].toLowerCase();
    return map[key] || m[1].toUpperCase();
  }

  function enhanceHeadings(root) {
    var used = {};
    var nodes = root.querySelectorAll("h1, h2, h3");
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      var id = el.id || slugify(el.textContent);
      var n = 0;
      var candidate = id;
      while (used[candidate]) {
        n += 1;
        candidate = id + "-" + n;
      }
      used[candidate] = true;
      el.id = candidate;
      if (!el.querySelector(".heading-anchor")) {
        var a = document.createElement("a");
        a.className = "heading-anchor";
        a.href = "#" + candidate;
        a.setAttribute("aria-label", "Link to section");
        a.textContent = "#";
        el.appendChild(a);
      }
    }
  }

  function enhanceCodeBlocks(root) {
    var pres = root.querySelectorAll("pre");
    for (var i = 0; i < pres.length; i++) {
      var pre = pres[i];
      if (pre.closest(".code-block")) continue;
      var code = pre.querySelector("code");
      var wrap = document.createElement("div");
      wrap.className = "code-block";
      var header = document.createElement("div");
      header.className = "code-header";
      var lang = document.createElement("span");
      lang.className = "code-lang";
      lang.textContent = langLabel(code || pre);
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "code-copy";
      btn.textContent = "Copy";
      btn.addEventListener("click", function (preEl, codeEl, button) {
        return async function () {
          var text = codeEl ? codeEl.innerText : preEl.innerText;
          try {
            await navigator.clipboard.writeText(text);
            button.textContent = "Copied";
            button.classList.add("copied");
            setTimeout(function () {
              button.textContent = "Copy";
              button.classList.remove("copied");
            }, 1400);
          } catch (_) {
            button.textContent = "Failed";
          }
        };
      }(pre, code, btn));
      header.appendChild(lang);
      header.appendChild(btn);
      pre.parentNode.insertBefore(wrap, pre);
      wrap.appendChild(header);
      wrap.appendChild(pre);
    }
  }

  function isArrowP(el) {
    if (!el || el.tagName !== "P") return false;
    return /^(↓|→|⟶|⇓|⇒)$/.test((el.textContent || "").trim());
  }

  /**
   * Group runs of "node → arrow → node" paragraphs into a compact horizontal
   * flow diagram. Wraps instead of overflowing so nothing is clipped, and stays
   * packed (not stretched full-width).
   */
  function enhanceFlow(root) {
    var kids = Array.prototype.slice.call(root.children);
    var runs = [];
    var k = 0;
    while (k < kids.length) {
      if (kids[k].tagName === "P" && !isArrowP(kids[k])) {
        var nodes = [kids[k]];
        var arrows = [];
        var m = k + 1;
        while (
          m + 1 < kids.length &&
          isArrowP(kids[m]) &&
          kids[m + 1].tagName === "P" &&
          !isArrowP(kids[m + 1])
        ) {
          arrows.push(kids[m]);
          nodes.push(kids[m + 1]);
          m += 2;
        }
        if (nodes.length >= 2) {
          runs.push({ nodes: nodes, arrows: arrows });
          k = m;
          continue;
        }
      }
      k += 1;
    }

    for (var r = 0; r < runs.length; r++) {
      var run = runs[r];
      var flow = document.createElement("div");
      flow.className = "mv-flow";
      root.insertBefore(flow, run.nodes[0]);
      for (var n = 0; n < run.nodes.length; n++) {
        if (n > 0) {
          var arrow = document.createElement("span");
          arrow.className = "mv-flow__arrow";
          arrow.setAttribute("aria-hidden", "true");
          arrow.textContent = "→";
          flow.appendChild(arrow);
        }
        run.nodes[n].classList.add("mv-flow__node");
        flow.appendChild(run.nodes[n]);
      }
      for (var a = 0; a < run.arrows.length; a++) {
        if (run.arrows[a].parentNode) run.arrows[a].parentNode.removeChild(run.arrows[a]);
      }
    }
  }

  /** Academic reading aids shared across Fanqie / Mentis / Docs */
  function enhanceAcademic(root) {
    enhanceFlow(root);

    var paragraphs = root.querySelectorAll("p");
    for (var i = 0; i < paragraphs.length; i++) {
      var p = paragraphs[i];
      var raw = (p.textContent || "").trim();
      if (raw === "↓" || raw === "→" || raw === "⟶") {
        p.classList.add("mv-flow-arrow");
        p.setAttribute("aria-hidden", "true");
        continue;
      }
      // Lone bold reading (MC / HV result) → hero reading style
      if (
        p.childNodes.length === 1 &&
        p.firstChild.nodeType === 1 &&
        p.firstChild.tagName === "STRONG" &&
        raw.length > 0 &&
        raw.length < 48
      ) {
        p.classList.add("mv-reading");
      }
    }

    var quotes = root.querySelectorAll("blockquote");
    for (var j = 0; j < quotes.length; j++) {
      quotes[j].classList.add("mv-callout");
      enhanceCalloutKv(quotes[j]);
    }

    var h1 = root.querySelector(":scope > h1");
    if (h1) h1.classList.add("mv-formula-title");

    // Two-column property tables (label | value)
    var tables = root.querySelectorAll("table");
    for (var t = 0; t < tables.length; t++) {
      var table = tables[t];
      var firstRow = table.querySelector("tr");
      var cells = firstRow ? firstRow.querySelectorAll("th, td") : [];
      if (cells.length === 2) {
        table.classList.add("mv-props-table");
      } else if (cells.length >= 3) {
        table.classList.add("mv-data-table");
      }
    }

    // List items that start with a bold label
    var listItems = root.querySelectorAll("li");
    for (var li = 0; li < listItems.length; li++) {
      var item = listItems[li];
      var strong = item.querySelector(":scope > strong, :scope > p > strong");
      if (strong && /[：:]\s*$/.test(strong.textContent || "")) {
        item.classList.add("mv-labeled-item");
        strong.classList.add("mv-kv__k");
      }
    }
  }

  /**
   * Turn callout lines like "**Thượng tự：** 博" into a semantic key/value grid.
   */
  function enhanceCalloutKv(quote) {
    if (!quote || quote.querySelector(".mv-kv")) return;

    var text = (quote.textContent || "").trim();
    if (!/[：:]/.test(text)) return;

    // Collect leaf text lines from <p> / <br>-split content
    var lines = [];
    var paragraphs = quote.querySelectorAll("p");
    if (paragraphs.length) {
      for (var i = 0; i < paragraphs.length; i++) {
        var html = paragraphs[i].innerHTML || "";
        var parts = html.split(/<br\s*\/?>/i);
        for (var p = 0; p < parts.length; p++) {
          var tmp = document.createElement("div");
          tmp.innerHTML = parts[p];
          var line = (tmp.textContent || "").trim();
          if (line) lines.push({ text: line, html: parts[p].trim() });
        }
      }
    } else {
      lines.push({ text: text, html: quote.innerHTML });
    }

    var rows = [];
    for (var r = 0; r < lines.length; r++) {
      var m = lines[r].text.match(/^(.+?)\s*[：:]\s*(.+)$/);
      if (!m) {
        rows = null;
        break;
      }
      rows.push({ k: m[1].replace(/\*+/g, "").trim(), v: m[2].trim() });
    }
    if (!rows || !rows.length) return;

    var grid = document.createElement("dl");
    grid.className = "mv-kv";
    for (var k = 0; k < rows.length; k++) {
      var row = document.createElement("div");
      row.className = "mv-kv__row";
      var dt = document.createElement("dt");
      dt.className = "mv-kv__k";
      dt.textContent = rows[k].k;
      var dd = document.createElement("dd");
      dd.className = "mv-kv__v";
      dd.textContent = rows[k].v;
      row.appendChild(dt);
      row.appendChild(dd);
      grid.appendChild(row);
    }
    quote.replaceChildren(grid);
    quote.classList.add("mv-callout--kv");
  }

  function enhance(root) {
    if (!root) return root;
    enhanceHeadings(root);
    enhanceCodeBlocks(root);
    enhanceAcademic(root);
    return root;
  }

  function render(markdown, options) {
    options = options || {};
    var md = createMd();
    return md.render(String(markdown || ""), { srcPath: options.srcPath || "" });
  }

  /**
   * @param {HTMLElement|string} container
   * @param {{ markdown: string, srcPath?: string, className?: string, fluid?: boolean }} options
   */
  function mount(container, options) {
    options = options || {};
    var el =
      typeof container === "string" ? document.querySelector(container) : container;
    if (!el) throw new Error("QuizzmanMarkdown.mount: container not found");

    var host = el;
    if (!el.classList.contains("mv-embed")) {
      var existing = el.querySelector(":scope > .mv-embed");
      if (existing) {
        host = existing;
      } else {
        host = document.createElement("div");
        host.className = "mv-embed";
        el.replaceChildren(host);
      }
    }

    if (options.fluid !== false) {
      host.classList.add("mv-embed--fluid");
    } else {
      host.classList.remove("mv-embed--fluid");
    }

    var article = host.querySelector(":scope > .mv-article");
    if (!article) {
      article = document.createElement("article");
      article.className = "mv-article markdown-body";
      host.replaceChildren(article);
    }

    if (options.className) {
      article.className = "mv-article markdown-body " + options.className;
    }

    article.innerHTML = render(options.markdown, options);
    enhance(article);
    return { host: host, article: article };
  }

  function clear(container) {
    var el =
      typeof container === "string" ? document.querySelector(container) : container;
    if (el) el.replaceChildren();
  }

  global.QuizzmanMarkdown = {
    version: "2026.07.17",
    mount: mount,
    render: render,
    enhance: enhance,
    clear: clear,
  };
})(typeof window !== "undefined" ? window : globalThis);
