import { createElement, createEventEmitter, uniqueId } from '@qmf/utils';

// src/button/index.ts
function createButton(options) {
  const {
    label,
    variant = "primary",
    size = "md",
    icon,
    iconPosition = "left",
    disabled = false,
    loading = false,
    className = "",
    onClick
  } = options;
  const classes = [
    "qmf-btn",
    `qmf-btn--${variant}`,
    `qmf-btn--${size}`,
    loading ? "qmf-btn--loading" : "",
    className
  ].filter(Boolean).join(" ");
  const btn = createElement("button", {
    className: classes,
    type: "button",
    ...disabled || loading ? { disabled: "" } : {}
  });
  if (loading) {
    const spinner = createElement("span", { className: "qmf-btn__spinner" });
    btn.appendChild(spinner);
  }
  if (icon && iconPosition === "left" && !loading) {
    const iconEl = createElement("i", { className: icon });
    btn.appendChild(iconEl);
  }
  const textEl = createElement("span", { className: "qmf-btn__label" }, [label]);
  btn.appendChild(textEl);
  if (icon && iconPosition === "right" && !loading) {
    const iconEl = createElement("i", { className: icon });
    btn.appendChild(iconEl);
  }
  if (onClick) {
    btn.addEventListener("click", onClick);
  }
  return btn;
}
var Modal = class {
  constructor(options) {
    this.overlay = null;
    this.modalEl = null;
    this.emitter = createEventEmitter();
    this.previousFocus = null;
    this.id = uniqueId("modal");
    this.options = {
      title: "",
      size: "md",
      closable: true,
      closeOnOverlay: true,
      closeOnEscape: true,
      className: "",
      footer: null,
      onOpen: () => {
      },
      onClose: () => {
      },
      ...options
    };
  }
  open() {
    if (this.overlay) return;
    this.previousFocus = document.activeElement;
    this.render();
    this.options.onOpen();
    this.emitter.emit("open");
  }
  close() {
    if (!this.overlay) return;
    this.overlay.classList.add("qmf-modal-overlay--closing");
    setTimeout(() => {
      this.overlay?.remove();
      this.overlay = null;
      this.modalEl = null;
      this.previousFocus?.focus();
      this.options.onClose();
      this.emitter.emit("close");
    }, 200);
  }
  on(event, cb) {
    return this.emitter.on(event, cb);
  }
  destroy() {
    this.overlay?.remove();
    this.emitter.clear();
  }
  render() {
    this.overlay = createElement("div", {
      className: "qmf-modal-overlay",
      role: "dialog",
      "aria-modal": "true",
      "aria-labelledby": `${this.id}-title`
    });
    if (this.options.closeOnOverlay) {
      this.overlay.addEventListener("click", (e) => {
        if (e.target === this.overlay) this.close();
      });
    }
    this.modalEl = createElement("div", {
      className: `qmf-modal qmf-modal--${this.options.size} ${this.options.className}`.trim()
    });
    if (this.options.title || this.options.closable) {
      const header = createElement("div", { className: "qmf-modal__header" });
      if (this.options.title) {
        const title = createElement("h2", {
          className: "qmf-modal__title",
          id: `${this.id}-title`
        }, [this.options.title]);
        header.appendChild(title);
      }
      if (this.options.closable) {
        const closeBtn = createElement("button", {
          className: "qmf-modal__close",
          "aria-label": "Close",
          type: "button"
        }, ["\xD7"]);
        closeBtn.addEventListener("click", () => this.close());
        header.appendChild(closeBtn);
      }
      this.modalEl.appendChild(header);
    }
    const body = createElement("div", { className: "qmf-modal__body" });
    if (typeof this.options.content === "string") {
      body.innerHTML = this.options.content;
    } else {
      body.appendChild(this.options.content);
    }
    this.modalEl.appendChild(body);
    if (this.options.footer) {
      const footer = createElement("div", { className: "qmf-modal__footer" });
      footer.appendChild(this.options.footer);
      this.modalEl.appendChild(footer);
    }
    this.overlay.appendChild(this.modalEl);
    document.body.appendChild(this.overlay);
    if (this.options.closeOnEscape) {
      const handler = (e) => {
        if (e.key === "Escape") {
          this.close();
          document.removeEventListener("keydown", handler);
        }
      };
      document.addEventListener("keydown", handler);
    }
    requestAnimationFrame(() => {
      const focusable = this.modalEl?.querySelector(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      focusable?.focus();
    });
  }
};
function createModal(options) {
  return new Modal(options);
}
var Dropdown = class {
  constructor(options) {
    this.menuEl = null;
    this.emitter = createEventEmitter();
    this.isOpen = false;
    this.outsideClickHandler = null;
    this.id = uniqueId("dropdown");
    this.options = options;
    this.setup();
  }
  toggle() {
    this.isOpen ? this.close() : this.open();
  }
  open() {
    if (this.isOpen) return;
    this.isOpen = true;
    this.render();
    this.emitter.emit("open");
  }
  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.menuEl?.remove();
    this.menuEl = null;
    if (this.outsideClickHandler) {
      document.removeEventListener("click", this.outsideClickHandler);
      this.outsideClickHandler = null;
    }
    this.emitter.emit("close");
  }
  on(event, cb) {
    return this.emitter.on(event, cb);
  }
  destroy() {
    this.close();
    this.emitter.clear();
  }
  setup() {
    this.options.trigger.addEventListener("click", (e) => {
      e.stopPropagation();
      this.toggle();
    });
  }
  render() {
    const { items, align = "right", className = "" } = this.options;
    this.menuEl = createElement("div", {
      className: `qmf-dropdown qmf-dropdown--${align} ${className}`.trim(),
      role: "menu",
      id: this.id
    });
    for (const item of items) {
      if (item.divider) {
        const divider = createElement("div", { className: "qmf-dropdown__divider", role: "separator" });
        this.menuEl.appendChild(divider);
        continue;
      }
      const el = createElement("button", {
        className: `qmf-dropdown__item ${item.danger ? "qmf-dropdown__item--danger" : ""} ${item.disabled ? "qmf-dropdown__item--disabled" : ""}`.trim(),
        role: "menuitem",
        type: "button",
        ...item.disabled ? { disabled: "" } : {}
      });
      if (item.icon) {
        const icon = createElement("i", { className: item.icon });
        el.appendChild(icon);
      }
      const label = createElement("span", { className: "qmf-dropdown__label" }, [item.label]);
      el.appendChild(label);
      if (!item.disabled) {
        el.addEventListener("click", () => {
          this.options.onSelect?.(item);
          this.emitter.emit("select", item);
          this.close();
        });
      }
      this.menuEl.appendChild(el);
    }
    const trigger = this.options.trigger;
    trigger.parentElement?.appendChild(this.menuEl);
    this.outsideClickHandler = (e) => {
      if (!this.menuEl?.contains(e.target) && !trigger.contains(e.target)) {
        this.close();
      }
    };
    setTimeout(() => {
      document.addEventListener("click", this.outsideClickHandler);
    }, 0);
  }
};
function createDropdown(options) {
  return new Dropdown(options);
}
var Panel = class {
  constructor(options) {
    this.overlayEl = null;
    this.panelEl = null;
    this.emitter = createEventEmitter();
    this._isOpen = false;
    this.id = uniqueId("panel");
    this.options = {
      position: "right",
      size: "360px",
      overlay: true,
      closeOnOverlay: true,
      closeOnEscape: true,
      className: "",
      onOpen: () => {
      },
      onClose: () => {
      },
      ...options
    };
  }
  get isOpen() {
    return this._isOpen;
  }
  open() {
    if (this._isOpen) return;
    this._isOpen = true;
    this.render();
    this.options.onOpen();
    this.emitter.emit("open");
  }
  close() {
    if (!this._isOpen) return;
    this._isOpen = false;
    this.panelEl?.classList.remove("qmf-panel--open");
    setTimeout(() => {
      this.overlayEl?.remove();
      this.overlayEl = null;
      this.panelEl = null;
      this.options.onClose();
      this.emitter.emit("close");
    }, 300);
  }
  toggle() {
    this._isOpen ? this.close() : this.open();
  }
  on(event, cb) {
    return this.emitter.on(event, cb);
  }
  destroy() {
    this.close();
    this.emitter.clear();
  }
  render() {
    const { position, size, overlay, closeOnOverlay, closeOnEscape, className, content } = this.options;
    if (overlay) {
      this.overlayEl = createElement("div", { className: "qmf-panel-overlay" });
      if (closeOnOverlay) {
        this.overlayEl.addEventListener("click", () => this.close());
      }
      document.body.appendChild(this.overlayEl);
    }
    this.panelEl = createElement("div", {
      className: `qmf-panel qmf-panel--${position} ${className}`.trim(),
      id: this.id
    });
    const sizeStyleProp = ["left", "right"].includes(position) ? "width" : "height";
    this.panelEl.style[sizeStyleProp] = size;
    if (typeof content === "string") {
      this.panelEl.innerHTML = content;
    } else {
      this.panelEl.appendChild(content);
    }
    document.body.appendChild(this.panelEl);
    requestAnimationFrame(() => {
      this.panelEl?.classList.add("qmf-panel--open");
    });
    if (closeOnEscape) {
      const handler = (e) => {
        if (e.key === "Escape") {
          this.close();
          document.removeEventListener("keydown", handler);
        }
      };
      document.addEventListener("keydown", handler);
    }
  }
};
function createPanel(options) {
  return new Panel(options);
}
var Overlay = class {
  constructor(options = {}) {
    this.el = null;
    this.emitter = createEventEmitter();
    this.keyHandler = null;
    this.options = {
      closeOnClick: true,
      closeOnEscape: true,
      className: "",
      opacity: 0.5,
      zIndex: 400,
      onClose: () => {
      },
      ...options
    };
  }
  show() {
    if (this.el) return;
    this.el = createElement("div", {
      className: `qmf-overlay ${this.options.className}`.trim()
    });
    this.el.style.cssText = `
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, ${this.options.opacity});
      z-index: ${this.options.zIndex};
      transition: opacity var(--qmf-transition-fast);
    `;
    if (this.options.closeOnClick) {
      this.el.addEventListener("click", () => this.hide());
    }
    if (this.options.closeOnEscape) {
      this.keyHandler = (e) => {
        if (e.key === "Escape") this.hide();
      };
      document.addEventListener("keydown", this.keyHandler);
    }
    document.body.appendChild(this.el);
    document.body.style.overflow = "hidden";
    this.emitter.emit("show");
  }
  hide() {
    if (!this.el) return;
    this.el.remove();
    this.el = null;
    document.body.style.overflow = "";
    if (this.keyHandler) {
      document.removeEventListener("keydown", this.keyHandler);
      this.keyHandler = null;
    }
    this.options.onClose();
    this.emitter.emit("hide");
  }
  on(event, cb) {
    return this.emitter.on(event, cb);
  }
  destroy() {
    this.hide();
    this.emitter.clear();
  }
};
function createOverlay(options) {
  return new Overlay(options);
}
function getToastContainer(position) {
  const id = `qmf-toast-container--${position}`;
  let container = document.getElementById(id);
  if (!container) {
    container = createElement("div", {
      id,
      className: `qmf-toast-container qmf-toast-container--${position}`
    });
    document.body.appendChild(container);
  }
  return container;
}
function toast(options) {
  const {
    message,
    type = "info",
    title,
    duration = 5e3,
    position = "top-right",
    closable = true,
    action
  } = options;
  const id = uniqueId("toast");
  const container = getToastContainer(position);
  const toastEl = createElement("div", {
    className: `qmf-toast qmf-toast--${type}`,
    role: "alert",
    id
  });
  const iconMap = {
    info: "\u2139\uFE0F",
    success: "\u2705",
    warning: "\u26A0\uFE0F",
    error: "\u274C"
  };
  const iconEl = createElement("span", { className: "qmf-toast__icon" }, [iconMap[type]]);
  toastEl.appendChild(iconEl);
  const contentEl = createElement("div", { className: "qmf-toast__content" });
  if (title) {
    const titleEl = createElement("div", { className: "qmf-toast__title" }, [title]);
    contentEl.appendChild(titleEl);
  }
  const msgEl = createElement("div", { className: "qmf-toast__message" }, [message]);
  contentEl.appendChild(msgEl);
  if (action) {
    const actionBtn = createElement("button", { className: "qmf-toast__action", type: "button" }, [action.label]);
    actionBtn.addEventListener("click", action.onClick);
    contentEl.appendChild(actionBtn);
  }
  toastEl.appendChild(contentEl);
  const dismiss = () => {
    toastEl.classList.add("qmf-toast--closing");
    setTimeout(() => toastEl.remove(), 200);
  };
  if (closable) {
    const closeBtn = createElement("button", {
      className: "qmf-toast__close",
      "aria-label": "Close",
      type: "button"
    }, ["\xD7"]);
    closeBtn.addEventListener("click", dismiss);
    toastEl.appendChild(closeBtn);
  }
  container.appendChild(toastEl);
  if (duration > 0) {
    setTimeout(dismiss, duration);
  }
  return { dismiss };
}
function toastSuccess(message, options) {
  return toast({ message, type: "success", ...options });
}
function toastError(message, options) {
  return toast({ message, type: "error", duration: 8e3, ...options });
}
function toastWarning(message, options) {
  return toast({ message, type: "warning", ...options });
}
function toastInfo(message, options) {
  return toast({ message, type: "info", ...options });
}
function getInitials(name) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");
}
function createAvatar(options) {
  const { src, name = "", size = "md", online, className = "" } = options;
  const wrapper = createElement("div", {
    className: `qmf-avatar qmf-avatar--${size} ${className}`.trim()
  });
  if (src) {
    const img = createElement("img", {
      className: "qmf-avatar__img",
      src,
      alt: name || "Avatar"
    });
    img.addEventListener("error", () => {
      img.remove();
      const fallback = createElement("span", { className: "qmf-avatar__initials" }, [getInitials(name)]);
      wrapper.appendChild(fallback);
    });
    wrapper.appendChild(img);
  } else {
    const initials = createElement("span", { className: "qmf-avatar__initials" }, [getInitials(name) || "?"]);
    wrapper.appendChild(initials);
  }
  if (online !== void 0) {
    const status = createElement("span", {
      className: `qmf-avatar__status ${online ? "qmf-avatar__status--online" : "qmf-avatar__status--offline"}`
    });
    wrapper.appendChild(status);
  }
  return wrapper;
}
function createBadge(options = {}) {
  const { count = 0, max = 99, dot = false, variant = "danger", className = "" } = options;
  const badge = createElement("span", {
    className: `qmf-badge qmf-badge--${variant} ${dot ? "qmf-badge--dot" : ""} ${className}`.trim()
  });
  if (!dot && count > 0) {
    badge.textContent = count > max ? `${max}+` : String(count);
  }
  if (count === 0 && !dot) {
    badge.style.display = "none";
  }
  return badge;
}
function updateBadge(el, count, max = 99) {
  if (count > 0) {
    el.textContent = count > max ? `${max}+` : String(count);
    el.style.display = "";
  } else {
    el.style.display = "none";
    el.textContent = "";
  }
}

export { Dropdown, Modal, Overlay, Panel, createAvatar, createBadge, createButton, createDropdown, createModal, createOverlay, createPanel, toast, toastError, toastInfo, toastSuccess, toastWarning, updateBadge };
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map