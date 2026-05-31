/**
 * @qmf/ui - Badge Component
 * Notification badge / counter.
 */

import { createElement } from '@qmf/utils';

export type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'danger';

export interface BadgeOptions {
  /** Badge count (0 or false = hidden) */
  count?: number;
  /** Max count to display (e.g., 99 → "99+") */
  max?: number;
  /** Show dot instead of count */
  dot?: boolean;
  /** Variant */
  variant?: BadgeVariant;
  /** Additional CSS class */
  className?: string;
}

export function createBadge(options: BadgeOptions = {}): HTMLElement {
  const { count = 0, max = 99, dot = false, variant = 'danger', className = '' } = options;

  const badge = createElement('span', {
    className: `qmf-badge qmf-badge--${variant} ${dot ? 'qmf-badge--dot' : ''} ${className}`.trim(),
  });

  if (!dot && count > 0) {
    badge.textContent = count > max ? `${max}+` : String(count);
  }

  if (count === 0 && !dot) {
    badge.style.display = 'none';
  }

  return badge;
}

/**
 * Update an existing badge element.
 */
export function updateBadge(el: HTMLElement, count: number, max = 99): void {
  if (count > 0) {
    el.textContent = count > max ? `${max}+` : String(count);
    el.style.display = '';
  } else {
    el.style.display = 'none';
    el.textContent = '';
  }
}
