/**
 * @qmf/ui - Panel Component
 * Sliding panel (drawer) with positions.
 */

import { createElement, uniqueId, createEventEmitter } from '@qmf/utils';

export type PanelPosition = 'left' | 'right' | 'top' | 'bottom';

export interface PanelOptions {
  /** Panel content */
  content: string | HTMLElement;
  /** Panel position */
  position?: PanelPosition;
  /** Panel size (CSS value) */
  size?: string;
  /** Show overlay */
  overlay?: boolean;
  /** Close on overlay click */
  closeOnOverlay?: boolean;
  /** Close on Escape */
  closeOnEscape?: boolean;
  /** Additional CSS class */
  className?: string;
  /** Callbacks */
  onOpen?: () => void;
  onClose?: () => void;
}

export class Panel {
  private id: string;
  private options: Required<PanelOptions>;
  private overlayEl: HTMLElement | null = null;
  private panelEl: HTMLElement | null = null;
  private emitter = createEventEmitter();
  private _isOpen = false;

  get isOpen(): boolean {
    return this._isOpen;
  }

  constructor(options: PanelOptions) {
    this.id = uniqueId('panel');
    this.options = {
      position: 'right',
      size: '360px',
      overlay: true,
      closeOnOverlay: true,
      closeOnEscape: true,
      className: '',
      onOpen: () => {},
      onClose: () => {},
      ...options,
    };
  }

  open(): void {
    if (this._isOpen) return;
    this._isOpen = true;
    this.render();
    this.options.onOpen();
    this.emitter.emit('open');
  }

  close(): void {
    if (!this._isOpen) return;
    this._isOpen = false;
    this.panelEl?.classList.remove('qmf-panel--open');
    setTimeout(() => {
      this.overlayEl?.remove();
      this.overlayEl = null;
      this.panelEl = null;
      this.options.onClose();
      this.emitter.emit('close');
    }, 300);
  }

  toggle(): void {
    this._isOpen ? this.close() : this.open();
  }

  on(event: string, cb: (data: unknown) => void): () => void {
    return this.emitter.on(event, cb);
  }

  destroy(): void {
    this.close();
    this.emitter.clear();
  }

  private render(): void {
    const { position, size, overlay, closeOnOverlay, closeOnEscape, className, content } = this.options;

    // Overlay
    if (overlay) {
      this.overlayEl = createElement('div', { className: 'qmf-panel-overlay' });
      if (closeOnOverlay) {
        this.overlayEl.addEventListener('click', () => this.close());
      }
      document.body.appendChild(this.overlayEl);
    }

    // Panel
    this.panelEl = createElement('div', {
      className: `qmf-panel qmf-panel--${position} ${className}`.trim(),
      id: this.id,
    });

    const sizeStyleProp = ['left', 'right'].includes(position) ? 'width' : 'height';
    this.panelEl.style[sizeStyleProp] = size;

    if (typeof content === 'string') {
      this.panelEl.innerHTML = content;
    } else {
      this.panelEl.appendChild(content);
    }

    document.body.appendChild(this.panelEl);

    requestAnimationFrame(() => {
      this.panelEl?.classList.add('qmf-panel--open');
    });

    if (closeOnEscape) {
      const handler = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          this.close();
          document.removeEventListener('keydown', handler);
        }
      };
      document.addEventListener('keydown', handler);
    }
  }
}

export function createPanel(options: PanelOptions): Panel {
  return new Panel(options);
}
