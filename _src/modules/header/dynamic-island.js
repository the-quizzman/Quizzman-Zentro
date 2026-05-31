/**
 * QMF Dynamic Island — System notification pill for the header zone.
 * Sits at top-center of viewport, compact by default.
 * Expands on hover/click to show notification details.
 *
 * @version 1.0.0
 *
 * Usage:
 *   <script src="https://ui.quizzman.com/qmf/dist/modules/header/dynamic-island.js"></script>
 *   <script>
 *     const island = new QMFDynamicIsland();
 *     island.push({ title: 'Cập nhật', message: 'Phiên bản mới!', icon: 'fas fa-bolt', priority: 'info' });
 *   </script>
 */

(function () {
  'use strict';

  const VERSION = '1.0.0';
  const AUTO_DISMISS_MS = 6000;
  const EXPAND_HOVER_DELAY = 400;

  class QMFDynamicIsland {
    constructor(opts = {}) {
      this.opts = Object.assign({
        autoDismiss: AUTO_DISMISS_MS,
        maxQueue: 10,
        hoverExpand: true,
        container: document.body
      }, opts);

      this.queue = [];
      this.current = null;
      this.expanded = false;
      this._timers = {};

      this._injectDOM();
      this._bind();

      if (typeof window !== 'undefined') {
        window.QMFDynamicIsland = this;
      }
      console.log(`[QMF DynamicIsland] v${VERSION} ready`);
    }

    /* ---- DOM ---- */

    _injectDOM() {
      if (document.getElementById('qmfIsland')) {
        this.el = document.getElementById('qmfIsland');
        this._cacheEls();
        return;
      }

      const d = document.createElement('div');
      d.id = 'qmfIsland';
      d.className = 'qmf-island';
      d.setAttribute('role', 'status');
      d.setAttribute('aria-live', 'polite');
      d.innerHTML = `
        <div class="qmf-island__compact">
          <div class="qmf-island__icon qmf-island__icon--info">
            <i class="fas fa-bell"></i>
          </div>
          <span class="qmf-island__label">Thông báo</span>
          <span class="qmf-island__dot"></span>
        </div>
        <div class="qmf-island__body">
          <div class="qmf-island__head">
            <div class="qmf-island__title">
              <i class="fas fa-bell"></i>
              <span>Thông báo</span>
            </div>
            <button class="qmf-island__close" aria-label="Đóng">
              <i class="fas fa-times"></i>
            </button>
          </div>
          <div class="qmf-island__message">—</div>
          <div class="qmf-island__actions"></div>
        </div>
        <div class="qmf-island__queue"></div>
      `;

      this.opts.container.appendChild(d);
      this.el = d;
      this._cacheEls();
    }

    _cacheEls() {
      this.els = {
        compact: this.el.querySelector('.qmf-island__compact'),
        icon: this.el.querySelector('.qmf-island__icon'),
        iconI: this.el.querySelector('.qmf-island__icon i'),
        label: this.el.querySelector('.qmf-island__label'),
        body: this.el.querySelector('.qmf-island__body'),
        titleI: this.el.querySelector('.qmf-island__title i'),
        titleSpan: this.el.querySelector('.qmf-island__title span'),
        close: this.el.querySelector('.qmf-island__close'),
        message: this.el.querySelector('.qmf-island__message'),
        actions: this.el.querySelector('.qmf-island__actions'),
        queue: this.el.querySelector('.qmf-island__queue')
      };
    }

    /* ---- Events ---- */

    _bind() {
      // Click compact → expand
      this.els.compact.addEventListener('click', () => this.expand());

      // Close button
      this.els.close.addEventListener('click', (e) => {
        e.stopPropagation();
        this.dismiss();
      });

      // Hover expand (desktop)
      if (this.opts.hoverExpand) {
        let hoverTimer = null;
        this.el.addEventListener('mouseenter', () => {
          clearTimeout(this._timers.autoDismiss);
          hoverTimer = setTimeout(() => this.expand(), EXPAND_HOVER_DELAY);
        });
        this.el.addEventListener('mouseleave', () => {
          clearTimeout(hoverTimer);
          if (this.expanded) {
            this.collapse();
            this._scheduleAutoDismiss();
          }
        });
      }

      // Click outside → collapse
      document.addEventListener('click', (e) => {
        if (this.expanded && !this.el.contains(e.target)) {
          this.collapse();
        }
      });
    }

    /* ---- Public API ---- */

    /**
     * Push a notification into the island.
     * @param {Object} data
     * @param {string} data.title     — Heading text
     * @param {string} data.message   — Body text or HTML
     * @param {string} [data.icon]    — FontAwesome class, default 'fas fa-bell'
     * @param {string} [data.priority] — 'info'|'success'|'warning'|'error'|'promo'
     * @param {number} [data.duration] — ms before auto dismiss (0 = sticky)
     * @param {Array}  [data.actions]  — [{label, href?, onClick?, primary?}]
     */
    push(data) {
      const item = Object.assign({
        id: Date.now() + Math.random(),
        icon: 'fas fa-bell',
        priority: 'info',
        duration: this.opts.autoDismiss,
        actions: [],
        timestamp: Date.now()
      }, data);

      this.queue.push(item);
      if (this.queue.length > this.opts.maxQueue) {
        this.queue.shift();
      }

      if (!this.current) {
        this._showNext();
      } else {
        this._renderQueueDots();
      }
    }

    /** Dismiss current notification; show next in queue or hide. */
    dismiss() {
      clearTimeout(this._timers.autoDismiss);
      this.expanded = false;
      this.el.classList.remove('qmf-island--expanded');
      this.current = null;

      if (this.queue.length > 0) {
        setTimeout(() => this._showNext(), 300);
      } else {
        this._hide();
      }
    }

    /** Expand the island to show full content. */
    expand() {
      if (!this.current) return;
      this.expanded = true;
      this.el.classList.add('qmf-island--expanded');
      clearTimeout(this._timers.autoDismiss);
    }

    /** Collapse back to compact pill. */
    collapse() {
      this.expanded = false;
      this.el.classList.remove('qmf-island--expanded');
    }

    /** Clear all queued + current notifications. */
    clear() {
      this.queue = [];
      this.dismiss();
    }

    /* ---- Internals ---- */

    _showNext() {
      if (this.queue.length === 0) {
        this._hide();
        return;
      }

      this.current = this.queue.shift();
      this._render(this.current);
      this._show();
      this._renderQueueDots();
      this._scheduleAutoDismiss();
    }

    _render(item) {
      const { icon, priority, title, message, actions } = item;

      // Compact
      this.els.iconI.className = icon;
      this.els.icon.className = 'qmf-island__icon qmf-island__icon--' + priority;
      this.els.label.textContent = title;

      // Expanded
      this.els.titleI.className = icon;
      this.els.titleSpan.textContent = title;
      this.els.message.textContent = message;

      // Actions
      this.els.actions.innerHTML = '';
      if (actions && actions.length > 0) {
        actions.forEach(act => {
          const btn = act.href ? document.createElement('a') : document.createElement('button');
          btn.className = 'qmf-island__action' + (act.primary ? ' qmf-island__action--primary' : '');
          btn.textContent = act.label;
          if (act.href) {
            btn.href = act.href;
            btn.target = '_blank';
            btn.rel = 'noopener';
          }
          if (act.onClick && typeof act.onClick === 'function') {
            btn.addEventListener('click', (e) => {
              e.stopPropagation();
              act.onClick();
            });
          }
          this.els.actions.appendChild(btn);
        });
        this.els.actions.style.display = '';
      } else {
        this.els.actions.style.display = 'none';
      }
    }

    _renderQueueDots() {
      const total = this.queue.length + (this.current ? 1 : 0);
      if (total <= 1) {
        this.el.classList.remove('qmf-island--has-queue');
        this.els.queue.innerHTML = '';
        return;
      }
      this.el.classList.add('qmf-island--has-queue');
      this.els.queue.innerHTML = Array.from({ length: Math.min(total, 5) }, (_, i) =>
        `<span class="qmf-island__queue-dot${i === 0 ? ' qmf-island__queue-dot--active' : ''}"></span>`
      ).join('');
    }

    _show() {
      this.el.classList.add('qmf-island--visible');
    }

    _hide() {
      this.el.classList.remove('qmf-island--visible', 'qmf-island--expanded', 'qmf-island--has-queue');
      this.expanded = false;
      this.current = null;
    }

    _scheduleAutoDismiss() {
      clearTimeout(this._timers.autoDismiss);
      const dur = this.current?.duration;
      if (dur && dur > 0) {
        this._timers.autoDismiss = setTimeout(() => {
          if (!this.expanded) this.dismiss();
        }, dur);
      }
    }
  }

  /* ---- Export ---- */
  window.QMFDynamicIsland = QMFDynamicIsland;

})();
