/**
 * @qmf/noti-embed - Realtime Notification Center
 * 
 * Features:
 * - Dropdown notification panel from header bell
 * - Category tabs: All, System, Social, Academic
 * - WebSocket realtime push
 * - Mark as read / Mark all as read
 * - Toast notifications for important items
 * - Sound notifications
 */

import { z, validateConfig, type QMFPlugin, getGlobalEventBus } from '@qmf/core';
import { createElement, mountComponent, createLogger, safeFetch, resolveToken, createEventEmitter, formatRelativeTime } from '@qmf/utils';
import { createToast, createBadge, updateBadge } from '@qmf/ui';

// ─── Config Schema ──────────────────────────────────────────

export const NotiConfigSchema = z.object({
  wsUrl: z.string().url().default('wss://noti.quizzman.com/ws'),
  apiUrl: z.string().url().default('https://noti.quizzman.com/api'),

  // Auth
  getToken: z.function().optional(),

  // Categories
  categories: z.array(z.object({
    key: z.string(),
    label: z.string(),
    icon: z.string().optional(),
  })).default([
    { key: 'all', label: 'Tất cả', icon: 'fas fa-globe' },
    { key: 'system', label: 'Hệ thống', icon: 'fas fa-cog' },
    { key: 'social', label: 'Xã hội', icon: 'fas fa-users' },
    { key: 'academic', label: 'Học tập', icon: 'fas fa-graduation-cap' },
  ]),

  // Sound
  soundEnabled: z.boolean().default(true),
  soundUrl: z.string().optional(),

  // Toast notifications for push
  showToastOnPush: z.boolean().default(true),

  // How many to fetch per page
  pageSize: z.number().default(20),

  // Reconnect
  reconnectAttempts: z.number().default(5),
  reconnectDelay: z.number().default(3000),

  debug: z.boolean().default(false),
});

export type NotiConfig = z.infer<typeof NotiConfigSchema>;

// ─── Types ──────────────────────────────────────────────────

interface Notification {
  id: string;
  category: string;
  title: string;
  body: string;
  icon?: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

// ─── Noti Embed Class ──────────────────────────────────────

export class QMFNotiEmbed {
  private config: NotiConfig;
  private logger;
  private emitter = createEventEmitter();

  private ws: WebSocket | null = null;
  private reconnectCount = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  private containerEl: HTMLElement | null = null;
  private panelEl: HTMLElement | null = null;
  private listEl: HTMLElement | null = null;
  private cleanup: (() => void) | null = null;

  private notifications: Notification[] = [];
  private activeCategory = 'all';
  private totalUnread = 0;
  private isOpen = false;
  private page = 1;
  private hasMore = true;
  private loading = false;

  private soundAudio: HTMLAudioElement | null = null;

  constructor(config: Partial<NotiConfig> = {}) {
    this.config = validateConfig(NotiConfigSchema, config, 'NotiEmbed');
    this.logger = createLogger('NotiEmbed', this.config.debug ? 'debug' : 'warn');

    if (this.config.soundEnabled) {
      this.soundAudio = new Audio(this.config.soundUrl || '/assets/sounds/notification.mp3');
      this.soundAudio.volume = 0.4;
    }
  }

  // ─── Public API ─────────────────────────────────────────

  mount(container: string | HTMLElement): void {
    this.cleanup = mountComponent(container, (el) => {
      this.containerEl = el;
      this.renderPanel();
      this.connect();
      this.fetchNotifications();
      this.logger.debug('NotiEmbed mounted');
      return () => this.destroy();
    });
  }

  open(): void {
    if (!this.panelEl) return;
    this.isOpen = true;
    this.panelEl.classList.add('qmf-noti--open');
    this.emitter.emit('open');
  }

  close(): void {
    if (!this.panelEl) return;
    this.isOpen = false;
    this.panelEl.classList.remove('qmf-noti--open');
    this.emitter.emit('close');
  }

  toggle(): void {
    this.isOpen ? this.close() : this.open();
  }

  getUnreadCount(): number {
    return this.totalUnread;
  }

  async markAsRead(notificationId: string): Promise<void> {
    const token = this.getAuthToken();
    if (!token) return;

    await safeFetch(`${this.config.apiUrl}/notifications/${notificationId}/read`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
    });

    const noti = this.notifications.find(n => n.id === notificationId);
    if (noti && !noti.isRead) {
      noti.isRead = true;
      this.totalUnread = Math.max(0, this.totalUnread - 1);
      this.broadcastUnread();
      this.renderList();
    }
  }

  async markAllAsRead(): Promise<void> {
    const token = this.getAuthToken();
    if (!token) return;

    await safeFetch(`${this.config.apiUrl}/notifications/read-all`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
    });

    for (const n of this.notifications) n.isRead = true;
    this.totalUnread = 0;
    this.broadcastUnread();
    this.renderList();
  }

  on(event: string, cb: (data: unknown) => void): () => void {
    return this.emitter.on(event, cb);
  }

  destroy(): void {
    this.disconnect();
    this.panelEl?.remove();
    this.emitter.clear();
    if (this.cleanup) this.cleanup();
    this.containerEl = null;
  }

  // ─── Auth Helpers ───────────────────────────────────────

  private getAuthToken(): string | null {
    return this.config.getToken
      ? (this.config.getToken as () => string | null)()
      : resolveToken();
  }

  // ─── WebSocket ──────────────────────────────────────────

  private connect(): void {
    const token = this.getAuthToken();
    if (!token) {
      this.logger.warn('No auth token, skipping WebSocket');
      return;
    }

    try {
      this.ws = new WebSocket(`${this.config.wsUrl}?token=${token}`);

      this.ws.addEventListener('open', () => {
        this.logger.debug('WS connected');
        this.reconnectCount = 0;
      });

      this.ws.addEventListener('message', (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleWsMessage(data);
        } catch (e) {
          this.logger.error('Failed to parse WS message', e);
        }
      });

      this.ws.addEventListener('close', () => {
        this.scheduleReconnect();
      });

      this.ws.addEventListener('error', (e) => {
        this.logger.error('WS error', e);
      });
    } catch (e) {
      this.logger.error('WS connection failed', e);
      this.scheduleReconnect();
    }
  }

  private disconnect(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
    this.ws = null;
  }

  private scheduleReconnect(): void {
    if (this.reconnectCount >= this.config.reconnectAttempts) return;
    this.reconnectCount++;
    const delay = this.config.reconnectDelay * this.reconnectCount;
    this.reconnectTimer = setTimeout(() => this.connect(), delay);
  }

  private handleWsMessage(data: { type: string; payload: unknown }): void {
    switch (data.type) {
      case 'notification:new': {
        const noti = data.payload as Notification;
        this.onNewNotification(noti);
        break;
      }
      case 'notification:read': {
        const { id } = data.payload as { id: string };
        const n = this.notifications.find(x => x.id === id);
        if (n) n.isRead = true;
        this.recalcUnread();
        this.renderList();
        break;
      }
    }
  }

  private onNewNotification(noti: Notification): void {
    // Prepend to list
    this.notifications.unshift(noti);
    if (!noti.isRead) {
      this.totalUnread++;
      this.broadcastUnread();
    }

    // Toast
    if (this.config.showToastOnPush) {
      createToast({
        message: noti.title,
        variant: 'info',
        position: 'top-right',
        duration: 5000,
      });
    }

    // Sound
    if (this.config.soundEnabled && this.soundAudio) {
      this.soundAudio.currentTime = 0;
      this.soundAudio.play().catch(() => {});
    }

    this.renderList();
    this.emitter.emit('notification:new', noti);
  }

  private recalcUnread(): void {
    this.totalUnread = this.notifications.filter(n => !n.isRead).length;
    this.broadcastUnread();
  }

  private broadcastUnread(): void {
    getGlobalEventBus().emit('noti:unread', this.totalUnread);
  }

  // ─── API ────────────────────────────────────────────────

  private async fetchNotifications(): Promise<void> {
    const token = this.getAuthToken();
    if (!token) return;
    if (this.loading) return;
    this.loading = true;

    const category = this.activeCategory === 'all' ? '' : `&category=${this.activeCategory}`;
    const result = await safeFetch(
      `${this.config.apiUrl}/notifications?page=${this.page}&limit=${this.config.pageSize}${category}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );

    this.loading = false;

    if (result.ok && result.data) {
      const { data, total } = result.data as { data: Notification[]; total: number };
      if (this.page === 1) {
        this.notifications = data;
      } else {
        this.notifications.push(...data);
      }
      this.hasMore = this.notifications.length < total;
      this.recalcUnread();
      this.renderList();
    }
  }

  // ─── Render ─────────────────────────────────────────────

  private renderPanel(): void {
    if (!this.containerEl) return;

    this.panelEl = createElement('div', { className: 'qmf-noti' });

    // Header
    const header = createElement('div', { className: 'qmf-noti__header' });
    header.innerHTML = `
      <h3 class="qmf-noti__title">Thông báo</h3>
      <button class="qmf-noti__mark-all" type="button">Đánh dấu đã đọc tất cả</button>
    `;
    header.querySelector('.qmf-noti__mark-all')?.addEventListener('click', () => this.markAllAsRead());
    this.panelEl.appendChild(header);

    // Category tabs
    const tabs = createElement('div', { className: 'qmf-noti__tabs' });
    for (const cat of this.config.categories) {
      const tab = createElement('button', {
        className: `qmf-noti__tab${cat.key === this.activeCategory ? ' qmf-noti__tab--active' : ''}`,
        type: 'button',
        'data-category': cat.key,
      });
      if (cat.icon) tab.innerHTML = `<i class="${cat.icon}"></i> `;
      tab.appendChild(document.createTextNode(cat.label));
      tab.addEventListener('click', () => {
        this.activeCategory = cat.key;
        this.page = 1;
        this.hasMore = true;
        tabs.querySelectorAll('.qmf-noti__tab').forEach(t => t.classList.remove('qmf-noti__tab--active'));
        tab.classList.add('qmf-noti__tab--active');
        this.fetchNotifications();
      });
      tabs.appendChild(tab);
    }
    this.panelEl.appendChild(tabs);

    // List
    this.listEl = createElement('div', { className: 'qmf-noti__list' });

    // Infinite scroll
    this.listEl.addEventListener('scroll', () => {
      if (!this.hasMore || this.loading) return;
      const el = this.listEl!;
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 50) {
        this.page++;
        this.fetchNotifications();
      }
    });

    this.panelEl.appendChild(this.listEl);

    // Close on outside click
    document.addEventListener('click', (e) => {
      if (this.isOpen && !this.panelEl?.contains(e.target as Node)) {
        this.close();
      }
    });

    this.containerEl.appendChild(this.panelEl);
  }

  private renderList(): void {
    if (!this.listEl) return;
    this.listEl.innerHTML = '';

    const filtered = this.activeCategory === 'all'
      ? this.notifications
      : this.notifications.filter(n => n.category === this.activeCategory);

    if (filtered.length === 0) {
      this.listEl.innerHTML = '<div class="qmf-noti__empty">Không có thông báo nào</div>';
      return;
    }

    for (const noti of filtered) {
      const item = createElement('div', {
        className: `qmf-noti__item${noti.isRead ? '' : ' qmf-noti__item--unread'}`,
      });

      item.innerHTML = `
        <div class="qmf-noti__item-icon">
          <i class="${noti.icon || 'fas fa-bell'}"></i>
        </div>
        <div class="qmf-noti__item-body">
          <div class="qmf-noti__item-title">${this.escapeHtml(noti.title)}</div>
          <div class="qmf-noti__item-text">${this.escapeHtml(noti.body)}</div>
          <div class="qmf-noti__item-time">${formatRelativeTime(new Date(noti.createdAt))}</div>
        </div>
        ${!noti.isRead ? '<div class="qmf-noti__item-dot"></div>' : ''}
      `;

      item.addEventListener('click', () => {
        this.markAsRead(noti.id);
        if (noti.link) window.location.href = noti.link;
        this.emitter.emit('notification:click', noti);
      });

      this.listEl.appendChild(item);
    }

    if (this.loading) {
      this.listEl.innerHTML += '<div class="qmf-noti__loading">Đang tải...</div>';
    }
  }

  private escapeHtml(str: string): string {
    const div = createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}

// ─── Convenience ──────────────────────────────────────────

export function createNotiEmbed(container: string | HTMLElement, config?: Partial<NotiConfig>): QMFNotiEmbed {
  const noti = new QMFNotiEmbed(config);
  noti.mount(container);
  return noti;
}

export function createNotiPlugin(config?: Partial<NotiConfig>): QMFPlugin {
  let instance: QMFNotiEmbed | null = null;
  return {
    name: 'noti-embed',
    version: '3.0.0',
    dependencies: ['auth-shell'],
    hooks: {
      onMount: () => {
        instance = new QMFNotiEmbed(config);
        instance.mount('#qmf-notifications');
      },
      onDestroy: () => instance?.destroy(),
    },
    setup: (ctx) => {
      ctx.expose('instance', instance);
      ctx.expose('open', () => instance?.open());
      ctx.expose('close', () => instance?.close());
      ctx.expose('getUnreadCount', () => instance?.getUnreadCount());
    },
  };
}
