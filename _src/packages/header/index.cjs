'use strict';

var core = require('@qmf/core');
var utils = require('@qmf/utils');
var ui = require('@qmf/ui');

// src/index.ts
var HeaderConfigSchema = core.z.object({
  // Branding (LEFT zone)
  logoSrc: core.z.string().optional(),
  brandName: core.z.string().default("Quizzman"),
  pageTitle: core.z.string().optional(),
  // Main logo (CENTER zone)
  mainLogoUrl: core.z.string().optional(),
  mainLogoLink: core.z.string().default("https://quizzman.com"),
  // Features (RIGHT zone)
  showHamburger: core.z.boolean().default(false),
  showChat: core.z.boolean().default(false),
  showFriend: core.z.boolean().default(false),
  showNotification: core.z.boolean().default(false),
  showUserDropdown: core.z.boolean().default(true),
  // URLs
  loginUrl: core.z.string().url().default("https://id.quizzman.com/login"),
  profileUrl: core.z.string().url().default("https://id.quizzman.com/account"),
  settingsUrl: core.z.string().url().default("https://id.quizzman.com/settings"),
  // Navigation items
  navItems: core.z.array(core.z.object({
    label: core.z.string(),
    href: core.z.string(),
    active: core.z.boolean().optional()
  })).optional(),
  // User menu items
  userMenuItems: core.z.array(core.z.object({
    icon: core.z.string().optional(),
    label: core.z.string(),
    action: core.z.string().optional(),
    url: core.z.string().optional(),
    danger: core.z.boolean().optional(),
    divider: core.z.boolean().optional()
  })).optional(),
  // Callbacks
  onHamburgerClick: core.z.function().optional(),
  onChatClick: core.z.function().optional(),
  onFriendClick: core.z.function().optional(),
  onNotificationClick: core.z.function().optional(),
  // Auth
  getToken: core.z.function().optional(),
  getUser: core.z.function().optional(),
  // Debug
  debug: core.z.boolean().default(false)
});
var QMFHeader = class {
  constructor(config = {}) {
    this.container = null;
    this.headerEl = null;
    this.emitter = utils.createEventEmitter();
    this.badges = {
      chat: null,
      friend: null,
      notification: null
    };
    this.cleanup = null;
    this.config = core.validateConfig(HeaderConfigSchema, config, "Header");
    this.logger = utils.createLogger("Header", this.config.debug ? "debug" : "warn");
  }
  /** Mount header into container */
  mount(container) {
    this.cleanup = utils.mountComponent(container, (el) => {
      this.container = el;
      this.render();
      this.checkAuthState();
      this.bindGlobalEvents();
      this.logger.debug("Header mounted");
      return () => this.destroy();
    });
  }
  /** Update chat badge count */
  updateChatBadge(count) {
    if (this.badges.chat) ui.updateBadge(this.badges.chat, count);
  }
  /** Update friend badge count */
  updateFriendBadge(count) {
    if (this.badges.friend) ui.updateBadge(this.badges.friend, count);
  }
  /** Update notification badge count */
  updateNotificationBadge(count) {
    if (this.badges.notification) ui.updateBadge(this.badges.notification, count);
  }
  /** Update user info display */
  updateUserInfo(user) {
    const nameEl = this.headerEl?.querySelector(".qmf-header__user-name");
    const avatarEl = this.headerEl?.querySelector(".qmf-header__avatar");
    if (nameEl && user.display_name) nameEl.textContent = user.display_name;
    if (avatarEl && user.avatar) avatarEl.src = user.avatar;
  }
  /** Check and update auth state */
  checkAuthState() {
    const token = this.config.getToken ? this.config.getToken() : utils.resolveToken();
    const user = this.config.getUser ? this.config.getUser() : utils.resolveCurrentUser();
    const userSection = this.headerEl?.querySelector(".qmf-header__user");
    const loginBtn = this.headerEl?.querySelector(".qmf-header__login-btn");
    if (token && user) {
      if (userSection) userSection.style.display = "";
      if (loginBtn) loginBtn.style.display = "none";
      this.updateUserInfo({
        display_name: user.display_name,
        avatar: user.avatar
      });
    } else {
      if (userSection) userSection.style.display = "none";
      if (loginBtn) loginBtn.style.display = "";
    }
  }
  /** Event subscription */
  on(event, cb) {
    return this.emitter.on(event, cb);
  }
  /** Destroy header */
  destroy() {
    this.emitter.clear();
    if (this.cleanup) this.cleanup();
    this.headerEl = null;
    this.container = null;
  }
  // ─── Private Render ─────────────────────────────────────
  render() {
    if (!this.container) return;
    this.headerEl = utils.createElement("header", { className: "qmf-header" });
    const inner = utils.createElement("div", { className: "qmf-header__inner" });
    inner.appendChild(this.renderLeftZone());
    inner.appendChild(this.renderCenterZone());
    inner.appendChild(this.renderRightZone());
    this.headerEl.appendChild(inner);
    this.container.appendChild(this.headerEl);
  }
  renderLeftZone() {
    const left = utils.createElement("div", { className: "qmf-header__cluster qmf-header__cluster--left" });
    if (this.config.showHamburger) {
      const hamburger = utils.createElement("button", {
        className: "qmf-header__btn qmf-header__hamburger",
        type: "button",
        "aria-label": "Toggle sidebar"
      });
      hamburger.innerHTML = '<i class="fas fa-bars"></i>';
      hamburger.addEventListener("click", () => {
        if (this.config.onHamburgerClick) this.config.onHamburgerClick();
        this.emitter.emit("hamburger:click");
      });
      left.appendChild(hamburger);
    }
    const brand = utils.createElement("a", {
      className: "qmf-header__brand",
      href: "/"
    });
    if (this.config.logoSrc) {
      const logo = utils.createElement("img", {
        className: "qmf-header__logo",
        src: this.config.logoSrc,
        alt: this.config.brandName
      });
      brand.appendChild(logo);
    }
    const brandText = utils.createElement("div", { className: "qmf-header__brand-text" });
    const brandName = utils.createElement("span", { className: "qmf-header__brand-name" }, [this.config.brandName]);
    brandText.appendChild(brandName);
    if (this.config.pageTitle) {
      const pageTitle = utils.createElement("span", { className: "qmf-header__page-title" }, [this.config.pageTitle]);
      brandText.appendChild(pageTitle);
    }
    brand.appendChild(brandText);
    left.appendChild(brand);
    return left;
  }
  renderCenterZone() {
    const center = utils.createElement("div", { className: "qmf-header__cluster qmf-header__cluster--center" });
    if (this.config.mainLogoUrl) {
      const link = utils.createElement("a", {
        className: "qmf-header__main-logo",
        href: this.config.mainLogoLink
      });
      const img = utils.createElement("img", {
        className: "qmf-header__logo-img",
        src: this.config.mainLogoUrl,
        alt: "Quizzman"
      });
      link.appendChild(img);
      const name = utils.createElement("span", { className: "qmf-header__main-name" }, ["Quizzman"]);
      link.appendChild(name);
      center.appendChild(link);
    }
    return center;
  }
  renderRightZone() {
    const right = utils.createElement("div", { className: "qmf-header__cluster qmf-header__cluster--right" });
    if (this.config.showChat) {
      const chatBtn = this.createSocialBtn("fas fa-comments", "Chat", () => {
        if (this.config.onChatClick) this.config.onChatClick();
        this.emitter.emit("chat:click");
      });
      this.badges.chat = ui.createBadge({ variant: "danger" });
      chatBtn.appendChild(this.badges.chat);
      right.appendChild(chatBtn);
    }
    if (this.config.showFriend) {
      const friendBtn = this.createSocialBtn("fas fa-user-friends", "Friends", () => {
        if (this.config.onFriendClick) this.config.onFriendClick();
        this.emitter.emit("friend:click");
      });
      this.badges.friend = ui.createBadge({ variant: "danger" });
      friendBtn.appendChild(this.badges.friend);
      right.appendChild(friendBtn);
    }
    if (this.config.showNotification) {
      const notiBtn = this.createSocialBtn("fas fa-bell", "Notifications", () => {
        if (this.config.onNotificationClick) this.config.onNotificationClick();
        this.emitter.emit("notification:click");
      });
      this.badges.notification = ui.createBadge({ variant: "danger" });
      notiBtn.appendChild(this.badges.notification);
      right.appendChild(notiBtn);
    }
    const loginBtn = utils.createElement("a", {
      className: "qmf-header__login-btn qmf-btn qmf-btn--primary qmf-btn--sm",
      href: this.config.loginUrl
    }, ["\u0110\u0103ng nh\u1EADp"]);
    loginBtn.style.display = "none";
    right.appendChild(loginBtn);
    if (this.config.showUserDropdown) {
      right.appendChild(this.renderUserDropdown());
    }
    return right;
  }
  createSocialBtn(icon, label, onClick) {
    const btn = utils.createElement("button", {
      className: "qmf-header__btn",
      type: "button",
      "aria-label": label,
      title: label
    });
    btn.innerHTML = `<i class="${icon}"></i>`;
    btn.addEventListener("click", onClick);
    return btn;
  }
  renderUserDropdown() {
    const wrapper = utils.createElement("div", { className: "qmf-header__user" });
    const toggle = utils.createElement("button", {
      className: "qmf-header__user-toggle",
      type: "button"
    });
    const avatar = utils.createElement("img", {
      className: "qmf-header__avatar",
      src: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%239ca3af"><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 10-16 0"/></svg>',
      alt: "User"
    });
    toggle.appendChild(avatar);
    const userName = utils.createElement("span", { className: "qmf-header__user-name" }, ["User"]);
    toggle.appendChild(userName);
    const chevron = utils.createElement("i", { className: "fas fa-chevron-down" });
    toggle.appendChild(chevron);
    wrapper.appendChild(toggle);
    const defaultItems = this.config.userMenuItems?.map((item) => ({
      label: item.label,
      icon: item.icon,
      action: item.action,
      danger: item.danger,
      divider: item.divider
    })) ?? [
      { label: "H\u1ED3 s\u01A1", icon: "fas fa-user", action: "profile" },
      { label: "C\xE0i \u0111\u1EB7t", icon: "fas fa-cog", action: "settings" },
      { label: "Giao di\u1EC7n", icon: "fas fa-palette", action: "theme" },
      { divider: true, label: "" },
      { label: "Tr\u1EE3 gi\xFAp", icon: "fas fa-question-circle", action: "help" },
      { label: "\u0110\u0103ng xu\u1EA5t", icon: "fas fa-sign-out-alt", action: "logout", danger: true }
    ];
    ui.createDropdown({
      trigger: toggle,
      items: defaultItems,
      align: "right",
      onSelect: (item) => {
        this.emitter.emit("menu:action", item.action);
        core.getGlobalEventBus().emit("qmf:menu-action", { action: item.action });
      }
    });
    return wrapper;
  }
  bindGlobalEvents() {
    const bus = core.getGlobalEventBus();
    bus.on("auth:stateChange", () => this.checkAuthState());
    bus.on("chat:unread", (count) => this.updateChatBadge(count));
    bus.on("noti:unread", (count) => this.updateNotificationBadge(count));
  }
};
function createUnifiedHeader(container, config) {
  const header = new QMFHeader(config);
  header.mount(container);
  if (typeof window !== "undefined") {
    window.qmfHeader = header;
  }
  return header;
}
function createHeaderPlugin(config) {
  let headerInstance = null;
  return {
    name: "header",
    version: "3.0.0",
    dependencies: ["auth-shell"],
    hooks: {
      onMount: () => {
        headerInstance = new QMFHeader(config);
        headerInstance.mount("#qmf-header");
      },
      onDestroy: () => {
        headerInstance?.destroy();
      }
    },
    setup: (ctx) => {
      ctx.expose("instance", headerInstance);
      ctx.expose("updateChatBadge", (count) => headerInstance?.updateChatBadge(count));
      ctx.expose("updateNotificationBadge", (count) => headerInstance?.updateNotificationBadge(count));
    }
  };
}

exports.HeaderConfigSchema = HeaderConfigSchema;
exports.QMFHeader = QMFHeader;
exports.createHeaderPlugin = createHeaderPlugin;
exports.createUnifiedHeader = createUnifiedHeader;
//# sourceMappingURL=index.cjs.map
//# sourceMappingURL=index.cjs.map