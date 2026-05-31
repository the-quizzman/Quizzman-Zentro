/**
 * @qmf/chat-embed - Floating Chat Panel with WebSocket Realtime
 * 
 * Features:
 * - Floating chat button with unread badge
 * - Sliding panel with conversation list + message view
 * - WebSocket connection to chat.quizzman.com
 * - Typing indicators, seen/delivered, emoji reactions
 * - Sound notifications
 */

import { z, validateConfig, type QMFPlugin, getGlobalEventBus, getGlobalStore } from '@qmf/core';
import { createElement, mountComponent, createLogger, safeFetch, resolveToken, createEventEmitter, debounce, formatRelativeTime } from '@qmf/utils';
import { createPanel, type PanelInstance, createToast, createBadge, updateBadge } from '@qmf/ui';

// ─── Config Schema ──────────────────────────────────────────

export const ChatConfigSchema = z.object({
  wsUrl: z.string().url().default('wss://chat.quizzman.com/ws'),
  apiUrl: z.string().url().default('https://chat.quizzman.com/api'),
  
  // Auth
  getToken: z.function().optional(),

  // Sound
  soundEnabled: z.boolean().default(true),
  soundUrl: z.string().optional(),

  // Position
  position: z.enum(['bottom-right', 'bottom-left']).default('bottom-right'),

  // Max open conversations
  maxOpenConversations: z.number().default(3),

  // Features
  enableTypingIndicator: z.boolean().default(true),
  enableReadReceipts: z.boolean().default(true),
  enableReactions: z.boolean().default(true),
  enableFileUpload: z.boolean().default(true),

  // Reconnect
  reconnectAttempts: z.number().default(5),
  reconnectDelay: z.number().default(3000),

  debug: z.boolean().default(false),
});

export type ChatConfig = z.infer<typeof ChatConfigSchema>;

// ─── Types ──────────────────────────────────────────────────

interface Conversation {
  id: string;
  participants: { id: string; name: string; avatar?: string }[];
  lastMessage?: ChatMessage;
  unreadCount: number;
  updatedAt: string;
}

interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  type: 'text' | 'image' | 'file' | 'system';
  reactions?: Record<string, string[]>;
  createdAt: string;
  status: 'sending' | 'sent' | 'delivered' | 'seen';
}

// ─── Chat Embed Class ──────────────────────────────────────

export class QMFChat {
  private config: ChatConfig;
  private logger;
  private emitter = createEventEmitter();

  private ws: WebSocket | null = null;
  private reconnectCount = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  private panel: PanelInstance | null = null;
  private fabEl: HTMLElement | null = null;
  private badgeEl: HTMLElement | null = null;
  private panelContentEl: HTMLElement | null = null;
  private containerEl: HTMLElement | null = null;
  private cleanup: (() => void) | null = null;

  private conversations: Conversation[] = [];
  private activeConversation: string | null = null;
  private messages: Map<string, ChatMessage[]> = new Map();
  private totalUnread = 0;
  private isOpen = false;

  private soundAudio: HTMLAudioElement | null = null;

  constructor(config: Partial<ChatConfig> = {}) {
    this.config = validateConfig(ChatConfigSchema, config, 'ChatEmbed');
    this.logger = createLogger('ChatEmbed', this.config.debug ? 'debug' : 'warn');

    if (this.config.soundEnabled) {
      this.soundAudio = new Audio(this.config.soundUrl || '/assets/sounds/message.mp3');
      this.soundAudio.volume = 0.3;
    }
  }

  // ─── Public API ─────────────────────────────────────────

  mount(container: string | HTMLElement): void {
    this.cleanup = mountComponent(container, (el) => {
      this.containerEl = el;
      this.renderFAB();
      this.renderPanel();
      this.connect();
      this.fetchConversations();
      this.logger.debug('ChatEmbed mounted');
      return () => this.destroy();
    });
  }

  /** Open the chat panel */
  open(): void {
    this.isOpen = true;
    this.panel?.show();
    this.fabEl?.classList.add('qmf-chat-fab--active');
    this.emitter.emit('open');
  }

  /** Close the chat panel */
  close(): void {
    this.isOpen = false;
    this.panel?.hide();
    this.fabEl?.classList.remove('qmf-chat-fab--active');
    this.emitter.emit('close');
  }

  /** Toggle the chat panel */
  toggle(): void {
    this.isOpen ? this.close() : this.open();
  }

  /** Open a specific conversation */
  openConversation(conversationId: string): void {
    this.activeConversation = conversationId;
    this.open();
    this.loadMessages(conversationId);
    this.renderConversationView(conversationId);
  }

  /** Send a message */
  sendMessage(conversationId: string, content: string): void {
    if (!content.trim()) return;

    const msg: Partial<ChatMessage> = {
      conversationId,
      content: content.trim(),
      type: 'text',
      status: 'sending',
    };

    this.wsSend({ type: 'message:send', payload: msg });
    this.emitter.emit('message:send', msg);
  }

  /** Set typing state */
  setTyping(conversationId: string, isTyping: boolean): void {
    if (!this.config.enableTypingIndicator) return;
    this.wsSend({ type: 'typing', payload: { conversationId, isTyping } });
  }

  /** Get total unread count */
  getUnreadCount(): number {
    return this.totalUnread;
  }

  /** Subscribe to events */
  on(event: string, cb: (data: unknown) => void): () => void {
    return this.emitter.on(event, cb);
  }

  /** Destroy */
  destroy(): void {
    this.disconnect();
    this.panel?.destroy();
    this.fabEl?.remove();
    this.emitter.clear();
    if (this.cleanup) this.cleanup();
    this.containerEl = null;
  }

  // ─── WebSocket ──────────────────────────────────────────

  private connect(): void {
    const token = this.config.getToken
      ? (this.config.getToken as () => string | null)()
      : resolveToken();

    if (!token) {
      this.logger.warn('No auth token, skipping WebSocket connection');
      return;
    }

    try {
      this.ws = new WebSocket(`${this.config.wsUrl}?token=${token}`);

      this.ws.addEventListener('open', () => {
        this.logger.debug('WebSocket connected');
        this.reconnectCount = 0;
        this.emitter.emit('ws:connected');
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
        this.logger.debug('WebSocket disconnected');
        this.emitter.emit('ws:disconnected');
        this.scheduleReconnect();
      });

      this.ws.addEventListener('error', (e) => {
        this.logger.error('WebSocket error', e);
      });
    } catch (e) {
      this.logger.error('WebSocket connection failed', e);
      this.scheduleReconnect();
    }
  }

  private disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectCount >= this.config.reconnectAttempts) {
      this.logger.warn('Max reconnect attempts reached');
      return;
    }
    this.reconnectCount++;
    const delay = this.config.reconnectDelay * this.reconnectCount;
    this.logger.debug(`Reconnecting in ${delay}ms (attempt ${this.reconnectCount})`);
    this.reconnectTimer = setTimeout(() => this.connect(), delay);
  }

  private wsSend(data: unknown): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  private handleWsMessage(data: { type: string; payload: unknown }): void {
    switch (data.type) {
      case 'message:new': {
        const msg = data.payload as ChatMessage;
        this.onNewMessage(msg);
        break;
      }
      case 'message:seen': {
        const { conversationId, messageIds } = data.payload as { conversationId: string; messageIds: string[] };
        this.markMessagesSeen(conversationId, messageIds);
        break;
      }
      case 'typing': {
        const { conversationId, userId, isTyping } = data.payload as { conversationId: string; userId: string; isTyping: boolean };
        this.onTypingIndicator(conversationId, userId, isTyping);
        break;
      }
      case 'conversation:update': {
        this.fetchConversations();
        break;
      }
    }
  }

  // ─── Message Handlers ───────────────────────────────────

  private onNewMessage(msg: ChatMessage): void {
    // Store message
    const msgs = this.messages.get(msg.conversationId) || [];
    msgs.push(msg);
    this.messages.set(msg.conversationId, msgs);

    // Update unread
    if (msg.conversationId !== this.activeConversation || !this.isOpen) {
      this.totalUnread++;
      if (this.badgeEl) updateBadge(this.badgeEl, this.totalUnread);
      getGlobalEventBus().emit('chat:unread', this.totalUnread);

      // Play sound
      if (this.config.soundEnabled && this.soundAudio) {
        this.soundAudio.currentTime = 0;
        this.soundAudio.play().catch(() => {});
      }

      // Toast notification
      createToast({
        message: `${msg.content.slice(0, 80)}${msg.content.length > 80 ? '…' : ''}`,
        variant: 'info',
        position: 'top-right',
        duration: 4000,
      });
    }

    // Re-render if viewing this conversation
    if (this.activeConversation === msg.conversationId && this.isOpen) {
      this.appendMessageToView(msg);
      // Mark as seen
      if (this.config.enableReadReceipts) {
        this.wsSend({ type: 'message:seen', payload: { conversationId: msg.conversationId, messageIds: [msg.id] } });
      }
    }

    this.emitter.emit('message:new', msg);
  }

  private markMessagesSeen(conversationId: string, messageIds: string[]): void {
    const msgs = this.messages.get(conversationId);
    if (!msgs) return;
    for (const msg of msgs) {
      if (messageIds.includes(msg.id)) msg.status = 'seen';
    }
  }

  private onTypingIndicator(conversationId: string, userId: string, isTyping: boolean): void {
    this.emitter.emit('typing', { conversationId, userId, isTyping });
    // Update UI if viewing this conversation
    if (this.activeConversation === conversationId) {
      const indicator = this.panelContentEl?.querySelector('.qmf-chat__typing');
      if (indicator) {
        indicator.textContent = isTyping ? 'Đang nhập...' : '';
      }
    }
  }

  // ─── API Calls ──────────────────────────────────────────

  private async fetchConversations(): Promise<void> {
    const token = this.config.getToken
      ? (this.config.getToken as () => string | null)()
      : resolveToken();
    if (!token) return;

    const result = await safeFetch(`${this.config.apiUrl}/conversations`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (result.ok && result.data) {
      this.conversations = (result.data as { data: Conversation[] }).data || [];
      this.totalUnread = this.conversations.reduce((sum, c) => sum + c.unreadCount, 0);
      if (this.badgeEl) updateBadge(this.badgeEl, this.totalUnread);
      getGlobalEventBus().emit('chat:unread', this.totalUnread);
      if (this.isOpen && !this.activeConversation) {
        this.renderConversationList();
      }
    }
  }

  private async loadMessages(conversationId: string): Promise<void> {
    const token = this.config.getToken
      ? (this.config.getToken as () => string | null)()
      : resolveToken();
    if (!token) return;

    const result = await safeFetch(`${this.config.apiUrl}/conversations/${conversationId}/messages`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (result.ok && result.data) {
      this.messages.set(conversationId, (result.data as { data: ChatMessage[] }).data || []);
    }
  }

  // ─── Render ─────────────────────────────────────────────

  private renderFAB(): void {
    if (!this.containerEl) return;

    this.fabEl = createElement('button', {
      className: `qmf-chat-fab qmf-chat-fab--${this.config.position}`,
      type: 'button',
      'aria-label': 'Open chat',
    });
    this.fabEl.innerHTML = '<i class="fas fa-comments"></i>';

    this.badgeEl = createBadge({ variant: 'danger' });
    this.fabEl.appendChild(this.badgeEl);

    this.fabEl.addEventListener('click', () => this.toggle());
    this.containerEl.appendChild(this.fabEl);
  }

  private renderPanel(): void {
    if (!this.containerEl) return;

    this.panelContentEl = createElement('div', { className: 'qmf-chat__content' });

    this.panel = createPanel({
      position: this.config.position === 'bottom-right' ? 'right' : 'left',
      width: '380px',
      showOverlay: false,
      onClose: () => this.close(),
    });

    // Panel header
    const header = createElement('div', { className: 'qmf-chat__header' });
    header.innerHTML = `
      <h3 class="qmf-chat__title">Tin nhắn</h3>
      <button class="qmf-chat__close" type="button" aria-label="Close"><i class="fas fa-times"></i></button>
    `;
    header.querySelector('.qmf-chat__close')?.addEventListener('click', () => this.close());

    const body = this.panel.getBody();
    body.appendChild(header);
    body.appendChild(this.panelContentEl);

    this.renderConversationList();
  }

  private renderConversationList(): void {
    if (!this.panelContentEl) return;
    this.panelContentEl.innerHTML = '';
    this.activeConversation = null;

    if (this.conversations.length === 0) {
      this.panelContentEl.innerHTML = '<div class="qmf-chat__empty">Chưa có cuộc trò chuyện nào</div>';
      return;
    }

    const list = createElement('div', { className: 'qmf-chat__list' });
    for (const conv of this.conversations) {
      const item = createElement('div', {
        className: `qmf-chat__conversation${conv.unreadCount > 0 ? ' qmf-chat__conversation--unread' : ''}`,
      });

      const otherParticipant = conv.participants[0];
      item.innerHTML = `
        <img class="qmf-chat__conv-avatar" src="${otherParticipant?.avatar || ''}" alt="" />
        <div class="qmf-chat__conv-info">
          <div class="qmf-chat__conv-name">${otherParticipant?.name || 'Unknown'}</div>
          <div class="qmf-chat__conv-preview">${conv.lastMessage?.content?.slice(0, 50) || ''}</div>
        </div>
        <div class="qmf-chat__conv-meta">
          <span class="qmf-chat__conv-time">${conv.lastMessage ? formatRelativeTime(new Date(conv.lastMessage.createdAt)) : ''}</span>
          ${conv.unreadCount > 0 ? `<span class="qmf-badge qmf-badge--danger">${conv.unreadCount}</span>` : ''}
        </div>
      `;

      item.addEventListener('click', () => this.openConversation(conv.id));
      list.appendChild(item);
    }

    this.panelContentEl.appendChild(list);
  }

  private renderConversationView(conversationId: string): void {
    if (!this.panelContentEl) return;
    this.panelContentEl.innerHTML = '';

    // Back button
    const topBar = createElement('div', { className: 'qmf-chat__topbar' });
    const backBtn = createElement('button', { className: 'qmf-chat__back', type: 'button' });
    backBtn.innerHTML = '<i class="fas fa-arrow-left"></i>';
    backBtn.addEventListener('click', () => this.renderConversationList());
    topBar.appendChild(backBtn);

    const conv = this.conversations.find(c => c.id === conversationId);
    if (conv) {
      const name = createElement('span', { className: 'qmf-chat__topbar-name' }, [conv.participants[0]?.name || 'Unknown']);
      topBar.appendChild(name);
    }
    this.panelContentEl.appendChild(topBar);

    // Messages area
    const messagesEl = createElement('div', { className: 'qmf-chat__messages' });
    const msgs = this.messages.get(conversationId) || [];
    for (const msg of msgs) {
      messagesEl.appendChild(this.createMessageEl(msg));
    }
    this.panelContentEl.appendChild(messagesEl);

    // Typing indicator
    const typing = createElement('div', { className: 'qmf-chat__typing' });
    this.panelContentEl.appendChild(typing);

    // Input area
    const inputArea = createElement('div', { className: 'qmf-chat__input-area' });
    const input = createElement('input', {
      className: 'qmf-chat__input',
      type: 'text',
      placeholder: 'Nhập tin nhắn...',
    }) as HTMLInputElement;

    const sendTyping = debounce(() => this.setTyping(conversationId, false), 2000);

    input.addEventListener('input', () => {
      this.setTyping(conversationId, true);
      sendTyping();
    });

    input.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage(conversationId, input.value);
        input.value = '';
        this.setTyping(conversationId, false);
      }
    });

    const sendBtn = createElement('button', {
      className: 'qmf-chat__send',
      type: 'button',
    });
    sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i>';
    sendBtn.addEventListener('click', () => {
      this.sendMessage(conversationId, input.value);
      input.value = '';
    });

    inputArea.appendChild(input);
    inputArea.appendChild(sendBtn);
    this.panelContentEl.appendChild(inputArea);

    // Scroll to bottom
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  private createMessageEl(msg: ChatMessage): HTMLElement {
    const el = createElement('div', {
      className: `qmf-chat__msg qmf-chat__msg--${msg.status}`,
    });
    el.innerHTML = `
      <div class="qmf-chat__msg-content">${this.escapeHtml(msg.content)}</div>
      <div class="qmf-chat__msg-meta">
        <span class="qmf-chat__msg-time">${formatRelativeTime(new Date(msg.createdAt))}</span>
        ${msg.status === 'seen' ? '<i class="fas fa-check-double qmf-chat__msg-seen"></i>' : ''}
      </div>
    `;
    return el;
  }

  private appendMessageToView(msg: ChatMessage): void {
    const messagesEl = this.panelContentEl?.querySelector('.qmf-chat__messages');
    if (!messagesEl) return;
    messagesEl.appendChild(this.createMessageEl(msg));
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  private escapeHtml(str: string): string {
    const div = createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}

// ─── Convenience ──────────────────────────────────────────

export function createChatEmbed(container: string | HTMLElement, config?: Partial<ChatConfig>): QMFChat {
  const chat = new QMFChat(config);
  chat.mount(container);
  return chat;
}

export function createChatPlugin(config?: Partial<ChatConfig>): QMFPlugin {
  let instance: QMFChat | null = null;
  return {
    name: 'chat-embed',
    version: '3.0.0',
    dependencies: ['auth-shell'],
    hooks: {
      onMount: () => {
        instance = new QMFChat(config);
        instance.mount('#qmf-chat');
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
