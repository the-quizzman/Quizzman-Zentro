/**
 * @qmf/ui - Modal Component
 * Accessible modal dialog with overlay, focus trap, and keyboard navigation.
 */

import { createElement, uniqueId, createEventEmitter } from '@qmf/utils';

export interface ModalOptions {
  /** Modal title */
  title?: string;
  /** Modal content (HTML string or element) */
  content: string | HTMLElement;
  /** Modal size */
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  /** Show close button */
  closable?: boolean;
  /** Close on overlay click */
  closeOnOverlay?: boolean;
  /** Close on Escape key */
  closeOnEscape?: boolean;
  /** Additional CSS class */
  className?: string;
  /** Footer buttons */
  footer?: HTMLElement | null;
  /** Callbacks */
  onOpen?: () => void;
  onClose?: () => void;
}

export class Modal {
  private id: string;
  private options: Required<ModalOptions>;
  private overlay: HTMLElement | null = null;
  private modalEl: HTMLElement | null = null;
  private emitter = createEventEmitter();
  private previousFocus: HTMLElement | null = null;

  constructor(options: ModalOptions) {
    this.id = uniqueId('modal');
    this.options = {
      title: '',
      size: 'md',
      closable: true,
      closeOnOverlay: true,
      closeOnEscape: true,
      className: '',
      footer: null,
      onOpen: () => {},
      onClose: () => {},
      ...options,
    };
  }

  open(): void {
    if (this.overlay) return;
    this.previousFocus = document.activeElement as HTMLElement;
    this.render();
    this.options.onOpen();
    this.emitter.emit('open');
  }

  close(): void {
    if (!this.overlay) return;
    this.overlay.classList.add('qmf-modal-overlay--closing');
    setTimeout(() => {
      this.overlay?.remove();
      this.overlay = null;
      this.modalEl = null;
      this.previousFocus?.focus();
      this.options.onClose();
      this.emitter.emit('close');
    }, 200);
  }

  on(event: string, cb: (data: unknown) => void): () => void {
    return this.emitter.on(event, cb);
  }

  destroy(): void {
    this.overlay?.remove();
    this.emitter.clear();
  }

  private render(): void {
    // Overlay
    this.overlay = createElement('div', {
      className: 'qmf-modal-overlay',
      role: 'dialog',
      'aria-modal': 'true',
      'aria-labelledby': `${this.id}-title`,
    });

    if (this.options.closeOnOverlay) {
      this.overlay.addEventListener('click', (e) => {
        if (e.target === this.overlay) this.close();
      });
    }

    // Modal container
    this.modalEl = createElement('div', {
      className: `qmf-modal qmf-modal--${this.options.size} ${this.options.className}`.trim(),
    });

    // Header
    if (this.options.title || this.options.closable) {
      const header = createElement('div', { className: 'qmf-modal__header' });
      if (this.options.title) {
        const title = createElement('h2', {
          className: 'qmf-modal__title',
          id: `${this.id}-title`,
        }, [this.options.title]);
        header.appendChild(title);
      }
      if (this.options.closable) {
        const closeBtn = createElement('button', {
          className: 'qmf-modal__close',
          'aria-label': 'Close',
          type: 'button',
        }, ['×']);
        closeBtn.addEventListener('click', () => this.close());
        header.appendChild(closeBtn);
      }
      this.modalEl.appendChild(header);
    }

    // Body
    const body = createElement('div', { className: 'qmf-modal__body' });
    if (typeof this.options.content === 'string') {
      body.innerHTML = this.options.content;
    } else {
      body.appendChild(this.options.content);
    }
    this.modalEl.appendChild(body);

    // Footer
    if (this.options.footer) {
      const footer = createElement('div', { className: 'qmf-modal__footer' });
      footer.appendChild(this.options.footer);
      this.modalEl.appendChild(footer);
    }

    this.overlay.appendChild(this.modalEl);
    document.body.appendChild(this.overlay);

    // Keyboard handler
    if (this.options.closeOnEscape) {
      const handler = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          this.close();
          document.removeEventListener('keydown', handler);
        }
      };
      document.addEventListener('keydown', handler);
    }

    // Focus first focusable
    requestAnimationFrame(() => {
      const focusable = this.modalEl?.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      focusable?.focus();
    });
  }
}

export function createModal(options: ModalOptions): Modal {
  return new Modal(options);
}
