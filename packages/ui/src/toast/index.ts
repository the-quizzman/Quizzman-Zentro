/**
 * @qmf/ui - Toast Component
 * Notification toasts with auto-dismiss, stacking, and actions.
 */

import { createElement, uniqueId } from '@qmf/utils';

export type ToastType = 'info' | 'success' | 'warning' | 'error';
export type ToastPosition = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';

export interface ToastOptions {
  /** Toast message */
  message: string;
  /** Toast type */
  type?: ToastType;
  /** Title */
  title?: string;
  /** Auto-dismiss after ms (0 = no auto) */
  duration?: number;
  /** Position */
  position?: ToastPosition;
  /** Closable */
  closable?: boolean;
  /** Action button */
  action?: {
    label: string;
    onClick: () => void;
  };
}

function getToastContainer(position: ToastPosition): HTMLElement {
  const id = `qmf-toast-container--${position}`;
  let container = document.getElementById(id);
  if (!container) {
    container = createElement('div', {
      id,
      className: `qmf-toast-container qmf-toast-container--${position}`,
    });
    document.body.appendChild(container);
  }
  return container;
}

export function toast(options: ToastOptions): { dismiss: () => void } {
  const {
    message,
    type = 'info',
    title,
    duration = 5000,
    position = 'top-right',
    closable = true,
    action,
  } = options;

  const id = uniqueId('toast');
  const container = getToastContainer(position);

  const toastEl = createElement('div', {
    className: `qmf-toast qmf-toast--${type}`,
    role: 'alert',
    id,
  });

  // Icon
  const iconMap: Record<ToastType, string> = {
    info: 'ℹ️',
    success: '✅',
    warning: '⚠️',
    error: '❌',
  };
  const iconEl = createElement('span', { className: 'qmf-toast__icon' }, [iconMap[type]]);
  toastEl.appendChild(iconEl);

  // Content
  const contentEl = createElement('div', { className: 'qmf-toast__content' });
  if (title) {
    const titleEl = createElement('div', { className: 'qmf-toast__title' }, [title]);
    contentEl.appendChild(titleEl);
  }
  const msgEl = createElement('div', { className: 'qmf-toast__message' }, [message]);
  contentEl.appendChild(msgEl);

  if (action) {
    const actionBtn = createElement('button', { className: 'qmf-toast__action', type: 'button' }, [action.label]);
    actionBtn.addEventListener('click', action.onClick);
    contentEl.appendChild(actionBtn);
  }
  toastEl.appendChild(contentEl);

  // Close button
  const dismiss = () => {
    toastEl.classList.add('qmf-toast--closing');
    setTimeout(() => toastEl.remove(), 200);
  };

  if (closable) {
    const closeBtn = createElement('button', {
      className: 'qmf-toast__close',
      'aria-label': 'Close',
      type: 'button',
    }, ['×']);
    closeBtn.addEventListener('click', dismiss);
    toastEl.appendChild(closeBtn);
  }

  container.appendChild(toastEl);

  // Auto dismiss
  if (duration > 0) {
    setTimeout(dismiss, duration);
  }

  return { dismiss };
}

export function toastSuccess(message: string, options?: Partial<ToastOptions>) {
  return toast({ message, type: 'success', ...options });
}

export function toastError(message: string, options?: Partial<ToastOptions>) {
  return toast({ message, type: 'error', duration: 8000, ...options });
}

export function toastWarning(message: string, options?: Partial<ToastOptions>) {
  return toast({ message, type: 'warning', ...options });
}

export function toastInfo(message: string, options?: Partial<ToastOptions>) {
  return toast({ message, type: 'info', ...options });
}
