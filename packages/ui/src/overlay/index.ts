/**
 * @qmf/ui - Overlay Component
 * Fullscreen overlay with configurable opacity and dismiss behavior.
 */

import { createElement, createEventEmitter } from '@qmf/utils';

export interface OverlayOptions {
  /** Close on click */
  closeOnClick?: boolean;
  /** Close on Escape */
  closeOnEscape?: boolean;
  /** CSS class */
  className?: string;
  /** Opacity (0-1) */
  opacity?: number;
  /** Z-index */
  zIndex?: number;
  /** Callbacks */
  onClose?: () => void;
}

export class Overlay {
  private el: HTMLElement | null = null;
  private emitter = createEventEmitter();
  private options: Required<OverlayOptions>;
  private keyHandler: ((e: KeyboardEvent) => void) | null = null;

  constructor(options: OverlayOptions = {}) {
    this.options = {
      closeOnClick: true,
      closeOnEscape: true,
      className: '',
      opacity: 0.5,
      zIndex: 400,
      onClose: () => {},
      ...options,
    };
  }

  show(): void {
    if (this.el) return;

    this.el = createElement('div', {
      className: `qmf-overlay ${this.options.className}`.trim(),
    });
    this.el.style.cssText = `
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, ${this.options.opacity});
      z-index: ${this.options.zIndex};
      transition: opacity var(--qmf-transition-fast);
    `;

    if (this.options.closeOnClick) {
      this.el.addEventListener('click', () => this.hide());
    }

    if (this.options.closeOnEscape) {
      this.keyHandler = (e: KeyboardEvent) => {
        if (e.key === 'Escape') this.hide();
      };
      document.addEventListener('keydown', this.keyHandler);
    }

    document.body.appendChild(this.el);
    document.body.style.overflow = 'hidden';
    this.emitter.emit('show');
  }

  hide(): void {
    if (!this.el) return;
    this.el.remove();
    this.el = null;
    document.body.style.overflow = '';

    if (this.keyHandler) {
      document.removeEventListener('keydown', this.keyHandler);
      this.keyHandler = null;
    }

    this.options.onClose();
    this.emitter.emit('hide');
  }

  on(event: string, cb: (data: unknown) => void): () => void {
    return this.emitter.on(event, cb);
  }

  destroy(): void {
    this.hide();
    this.emitter.clear();
  }
}

export function createOverlay(options?: OverlayOptions): Overlay {
  return new Overlay(options);
}
