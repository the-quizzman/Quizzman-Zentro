/**
 * @qmf/header - Unified Header Module
 * 3-Zone Layout: [LEFT: Site Logo + Title] [CENTER: Quizzman Logo] [RIGHT: Social + User]
 * 
 * Follows QMF lifecycle: init → mount → connect → ready → destroy
 */

import { z, validateConfig, type QMFPlugin, getGlobalEventBus, createLifecycle } from '@qmf/core';
import { createElement, mountComponent, resolveToken, resolveCurrentUser, createLogger, createEventEmitter } from '@qmf/utils';
import { createDropdown, createBadge, updateBadge, createAvatar, type DropdownItem } from '@qmf/ui';

// ─── Config Schema ──────────────────────────────────────────

export const HeaderConfigSchema = z.object({
  // Branding (LEFT zone)
  logoSrc: z.string().optional(),
  logoSrcDark: z.string().optional(),
  brandName: z.string().default('QuizzMan'),
  pageTitle: z.string().optional(),

  // Main logo (CENTER zone)
  mainLogoUrl: z.string().optional(),
  mainLogoDarkUrl: z.string().optional(),
  mainLogoLink: z.string().default('https://quizzman.com'),

  // Features (RIGHT zone)
  showHamburger: z.boolean().default(false),
  showChat: z.boolean().default(false),
  showFriend: z.boolean().default(false),
  showNotification: z.boolean().default(false),
  showUserDropdown: z.boolean().default(true),

  // URLs
  loginUrl: z.string().url().default('https://id.quizzman.com/login'),
  profileUrl: z.string().url().default('https://id.quizzman.com/account'),
  settingsUrl: z.string().url().default('https://id.quizzman.com/settings'),

  // Navigation items
  navItems: z.array(z.object({
    label: z.string(),
    href: z.string(),
    active: z.boolean().optional(),
  })).optional(),

  // User menu items
  userMenuItems: z.array(z.object({
    icon: z.string().optional(),
    label: z.string(),
    action: z.string().optional(),
    url: z.string().optional(),
    danger: z.boolean().optional(),
    divider: z.boolean().optional(),
  })).optional(),

  // Callbacks
  onHamburgerClick: z.function().optional(),
  onChatClick: z.function().optional(),
  onFriendClick: z.function().optional(),
  onNotificationClick: z.function().optional(),

  // Auth
  getToken: z.function().optional(),
  getUser: z.function().optional(),

  // Debug
  debug: z.boolean().default(false),
});

export type HeaderConfig = z.infer<typeof HeaderConfigSchema>;

// ─── Header Class ───────────────────────────────────────────

export class QMFHeader {
  private config: HeaderConfig;
  private container: HTMLElement | null = null;
  private headerEl: HTMLElement | null = null;
  private emitter = createEventEmitter();
  private logger;
  private badges = {
    chat: null as HTMLElement | null,
    friend: null as HTMLElement | null,
    notification: null as HTMLElement | null,
  };
  private cleanup: (() => void) | null = null;

  constructor(config: Partial<HeaderConfig> = {}) {
    this.config = validateConfig(HeaderConfigSchema, config, 'Header');
    this.logger = createLogger('Header', this.config.debug ? 'debug' : 'warn');
  }

  /** Mount header into container */
  mount(container: string | HTMLElement): void {
    this.cleanup = mountComponent(container, (el) => {
      this.container = el;
      this.render();
      this.checkAuthState();
      this.bindGlobalEvents();
      // Dynamic favicon per theme
      this.applyThemeFavicon(
        'https://ui.quizzman.com/qmf/assets/logo/favicon-32.png',
        'https://ui.quizzman.com/qmf/assets/logo/favicon-dark-32.png',
      );
      this.logger.debug('Header mounted');
      return () => this.destroy();
    });
  }

  /** Update chat badge count */
  updateChatBadge(count: number): void {
    if (this.badges.chat) updateBadge(this.badges.chat, count);
  }

  /** Update friend badge count */
  updateFriendBadge(count: number): void {
    if (this.badges.friend) updateBadge(this.badges.friend, count);
  }

  /** Update notification badge count */
  updateNotificationBadge(count: number): void {
    if (this.badges.notification) updateBadge(this.badges.notification, count);
  }

  /** Update user info display */
  updateUserInfo(user: { display_name?: string; avatar?: string }): void {
    const nameEl = this.headerEl?.querySelector('.qmf-header__user-name');
    const avatarEl = this.headerEl?.querySelector<HTMLImageElement>('.qmf-header__avatar');
    if (nameEl && user.display_name) nameEl.textContent = user.display_name;
    if (avatarEl && user.avatar) avatarEl.src = user.avatar;
  }

  /** Check and update auth state */
  checkAuthState(): void {
    const token = this.config.getToken
      ? (this.config.getToken as () => string | null)()
      : resolveToken();
    const user = this.config.getUser
      ? (this.config.getUser as () => Record<string, unknown> | null)()
      : resolveCurrentUser();

    const userSection = this.headerEl?.querySelector('.qmf-header__user');
    const loginBtn = this.headerEl?.querySelector('.qmf-header__login-btn');

    if (token && user) {
      if (userSection) (userSection as HTMLElement).style.display = '';
      if (loginBtn) (loginBtn as HTMLElement).style.display = 'none';
      this.updateUserInfo({
        display_name: user.display_name as string,
        avatar: user.avatar as string,
      });
    } else {
      if (userSection) (userSection as HTMLElement).style.display = 'none';
      if (loginBtn) (loginBtn as HTMLElement).style.display = '';
    }
  }

  /** Event subscription */
  on(event: string, cb: (data: unknown) => void): () => void {
    return this.emitter.on(event, cb);
  }

  /** Destroy header */
  destroy(): void {
    this.emitter.clear();
    if (this.cleanup) this.cleanup();
    this.headerEl = null;
    this.container = null;
  }

  // ─── Private Render ─────────────────────────────────────

  private render(): void {
    if (!this.container) return;

    this.headerEl = createElement('header', { className: 'qmf-header' });

    const inner = createElement('div', { className: 'qmf-header__inner' });

    // LEFT zone
    inner.appendChild(this.renderLeftZone());

    // CENTER zone
    inner.appendChild(this.renderCenterZone());

    // RIGHT zone
    inner.appendChild(this.renderRightZone());

    this.headerEl.appendChild(inner);
    this.container.appendChild(this.headerEl);
  }

  private renderLeftZone(): HTMLElement {
    const left = createElement('div', { className: 'qmf-header__cluster qmf-header__cluster--left' });

    // Hamburger
    if (this.config.showHamburger) {
      const hamburger = createElement('button', {
        className: 'qmf-header__btn qmf-header__hamburger',
        type: 'button',
        'aria-label': 'Toggle sidebar',
      });
      hamburger.innerHTML = '<i class="fas fa-bars"></i>';
      hamburger.addEventListener('click', () => {
        if (this.config.onHamburgerClick) (this.config.onHamburgerClick as () => void)();
        this.emitter.emit('hamburger:click');
      });
      left.appendChild(hamburger);
    }

    // Brand
    const brand = createElement('a', {
      className: 'qmf-header__brand',
      href: '/',
    });

    if (this.config.logoSrc) {
      const logo = createElement('img', {
        className: 'qmf-header__logo',
        src: this.config.logoSrc,
        alt: this.config.brandName,
      });
      // Support dark mode logo swap via CSS media query
      if (this.config.logoSrcDark) {
        logo.setAttribute('data-dark-src', this.config.logoSrcDark);
        logo.setAttribute('data-light-src', this.config.logoSrc);
        this.applyThemeLogo(logo);
      }
      brand.appendChild(logo);
    }

    const brandText = createElement('div', { className: 'qmf-header__brand-text' });
    const brandName = createElement('span', { className: 'qmf-header__brand-name' }, [this.config.brandName]);
    brandText.appendChild(brandName);

    if (this.config.pageTitle) {
      const pageTitle = createElement('span', { className: 'qmf-header__page-title' }, [this.config.pageTitle]);
      brandText.appendChild(pageTitle);
    }

    brand.appendChild(brandText);
    left.appendChild(brand);

    return left;
  }

  private renderCenterZone(): HTMLElement {
    const center = createElement('div', { className: 'qmf-header__cluster qmf-header__cluster--center' });

    if (this.config.mainLogoUrl) {
      const link = createElement('a', {
        className: 'qmf-header__main-logo',
        href: this.config.mainLogoLink,
      });
      const img = createElement('img', {
        className: 'qmf-header__logo-img',
        src: this.config.mainLogoUrl,
        alt: 'Quizzman',
      });
      // Dark mode logo swap for center zone
      if (this.config.mainLogoDarkUrl) {
        img.setAttribute('data-dark-src', this.config.mainLogoDarkUrl);
        img.setAttribute('data-light-src', this.config.mainLogoUrl);
        this.applyThemeLogo(img);
      }
      link.appendChild(img);
      const name = createElement('span', { className: 'qmf-header__main-name' }, ['Quizzman']);
      link.appendChild(name);
      center.appendChild(link);
    }

    return center;
  }

  private renderRightZone(): HTMLElement {
    const right = createElement('div', { className: 'qmf-header__cluster qmf-header__cluster--right' });

    // Social buttons
    if (this.config.showChat) {
      const chatBtn = this.createSocialBtn('fas fa-comments', 'Chat', () => {
        if (this.config.onChatClick) (this.config.onChatClick as () => void)();
        this.emitter.emit('chat:click');
      });
      this.badges.chat = createBadge({ variant: 'danger' });
      chatBtn.appendChild(this.badges.chat);
      right.appendChild(chatBtn);
    }

    if (this.config.showFriend) {
      const friendBtn = this.createSocialBtn('fas fa-user-friends', 'Friends', () => {
        if (this.config.onFriendClick) (this.config.onFriendClick as () => void)();
        this.emitter.emit('friend:click');
      });
      this.badges.friend = createBadge({ variant: 'danger' });
      friendBtn.appendChild(this.badges.friend);
      right.appendChild(friendBtn);
    }

    if (this.config.showNotification) {
      const notiBtn = this.createSocialBtn('fas fa-bell', 'Notifications', () => {
        if (this.config.onNotificationClick) (this.config.onNotificationClick as () => void)();
        this.emitter.emit('notification:click');
      });
      this.badges.notification = createBadge({ variant: 'danger' });
      notiBtn.appendChild(this.badges.notification);
      right.appendChild(notiBtn);
    }

    // Login button (shown when not authenticated)
    const loginBtn = createElement('a', {
      className: 'qmf-header__login-btn qmf-btn qmf-btn--primary qmf-btn--sm',
      href: this.config.loginUrl,
    }, ['Đăng nhập']);
    loginBtn.style.display = 'none';
    right.appendChild(loginBtn);

    // User dropdown (shown when authenticated)
    if (this.config.showUserDropdown) {
      right.appendChild(this.renderUserDropdown());
    }

    return right;
  }

  private createSocialBtn(icon: string, label: string, onClick: () => void): HTMLElement {
    const btn = createElement('button', {
      className: 'qmf-header__btn',
      type: 'button',
      'aria-label': label,
      title: label,
    });
    btn.innerHTML = `<i class="${icon}"></i>`;
    btn.addEventListener('click', onClick);
    return btn;
  }

  private renderUserDropdown(): HTMLElement {
    const wrapper = createElement('div', { className: 'qmf-header__user' });

    const toggle = createElement('button', {
      className: 'qmf-header__user-toggle',
      type: 'button',
    });

    const avatar = createElement('img', {
      className: 'qmf-header__avatar',
      src: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%239ca3af"><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 10-16 0"/></svg>',
      alt: 'User',
    });
    toggle.appendChild(avatar);

    const userName = createElement('span', { className: 'qmf-header__user-name' }, ['User']);
    toggle.appendChild(userName);

    const chevron = createElement('i', { className: 'fas fa-chevron-down' });
    toggle.appendChild(chevron);
    wrapper.appendChild(toggle);

    // Dropdown items
    const defaultItems: DropdownItem[] = this.config.userMenuItems?.map((item) => ({
      label: item.label,
      icon: item.icon,
      action: item.action,
      danger: item.danger,
      divider: item.divider,
    })) ?? [
      { label: 'Hồ sơ', icon: 'fas fa-user', action: 'profile' },
      { label: 'Cài đặt', icon: 'fas fa-cog', action: 'settings' },
      { label: 'Giao diện', icon: 'fas fa-palette', action: 'theme' },
      { divider: true, label: '' },
      { label: 'Trợ giúp', icon: 'fas fa-question-circle', action: 'help' },
      { label: 'Đăng xuất', icon: 'fas fa-sign-out-alt', action: 'logout', danger: true },
    ];

    createDropdown({
      trigger: toggle,
      items: defaultItems,
      align: 'right',
      onSelect: (item) => {
        this.emitter.emit('menu:action', item.action);
        getGlobalEventBus().emit('qmf:menu-action', { action: item.action });
      },
    });

    return wrapper;
  }

  private bindGlobalEvents(): void {
    const bus = getGlobalEventBus();
    bus.on('auth:stateChange', () => this.checkAuthState());
    bus.on('chat:unread', (count) => this.updateChatBadge(count as number));
    bus.on('noti:unread', (count) => this.updateNotificationBadge(count as number));
  }

  private applyThemeLogo(img: HTMLElement): void {
    const update = () => {
      const isDark =
        document.documentElement.getAttribute('data-theme') === 'dark' ||
        (document.documentElement.getAttribute('data-theme') !== 'light' &&
         window.matchMedia('(prefers-color-scheme: dark)').matches);
      const src = isDark
        ? img.getAttribute('data-dark-src')
        : img.getAttribute('data-light-src');
      if (src) (img as HTMLImageElement).src = src;
    };
    update();
    // Watch for theme changes
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', update);
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  }

  /** Swap favicon based on dark/light theme */
  private applyThemeFavicon(lightHref: string, darkHref: string): void {
    const update = () => {
      const isDark =
        document.documentElement.getAttribute('data-theme') === 'dark' ||
        (document.documentElement.getAttribute('data-theme') !== 'light' &&
         window.matchMedia('(prefers-color-scheme: dark)').matches);
      const href = isDark ? darkHref : lightHref;
      let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = href;
    };
    update();
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', update);
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  }
}

// ─── Convenience Function ─────────────────────────────────

/**
 * Create and mount a unified header.
 */
export function createUnifiedHeader(container: string | HTMLElement, config?: Partial<HeaderConfig>): QMFHeader {
  const header = new QMFHeader(config);
  header.mount(container);

  // Expose globally
  if (typeof window !== 'undefined') {
    (window as Record<string, unknown>).qmfHeader = header;
  }

  return header;
}

/** Create header as a QMF plugin */
export function createHeaderPlugin(config?: Partial<HeaderConfig>): QMFPlugin {
  let headerInstance: QMFHeader | null = null;
  const mountTarget =
    (config as { mountTo?: string } | undefined)?.mountTo ||
    '#qmf-header, #qmf-header-root';

  return {
    name: 'header',
    version: '3.0.0',
    dependencies: ['auth-shell'],
    hooks: {
      onMount: () => {
        headerInstance = new QMFHeader(config);
        headerInstance.mount(mountTarget);
      },
      onDestroy: () => {
        headerInstance?.destroy();
      },
    },
    setup: (ctx) => {
      ctx.expose('instance', headerInstance);
      ctx.expose('updateChatBadge', (count: number) => headerInstance?.updateChatBadge(count));
      ctx.expose('updateNotificationBadge', (count: number) => headerInstance?.updateNotificationBadge(count));
    },
  };
}
