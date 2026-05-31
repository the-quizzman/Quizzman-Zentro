/**
 * @qmf/ui - Button Component
 * Accessible button with variants, sizes, and loading state.
 */

import { createElement } from '@qmf/utils';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonOptions {
  /** Button text */
  label: string;
  /** Visual variant */
  variant?: ButtonVariant;
  /** Size */
  size?: ButtonSize;
  /** Icon class (e.g., 'fas fa-plus') */
  icon?: string;
  /** Icon position */
  iconPosition?: 'left' | 'right';
  /** Disabled state */
  disabled?: boolean;
  /** Loading state */
  loading?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Click handler */
  onClick?: (e: MouseEvent) => void;
}

export function createButton(options: ButtonOptions): HTMLButtonElement {
  const {
    label,
    variant = 'primary',
    size = 'md',
    icon,
    iconPosition = 'left',
    disabled = false,
    loading = false,
    className = '',
    onClick,
  } = options;

  const classes = [
    'qmf-btn',
    `qmf-btn--${variant}`,
    `qmf-btn--${size}`,
    loading ? 'qmf-btn--loading' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const btn = createElement('button', {
    className: classes,
    type: 'button',
    ...(disabled || loading ? { disabled: '' } : {}),
  });

  if (loading) {
    const spinner = createElement('span', { className: 'qmf-btn__spinner' });
    btn.appendChild(spinner);
  }

  if (icon && iconPosition === 'left' && !loading) {
    const iconEl = createElement('i', { className: icon });
    btn.appendChild(iconEl);
  }

  const textEl = createElement('span', { className: 'qmf-btn__label' }, [label]);
  btn.appendChild(textEl);

  if (icon && iconPosition === 'right' && !loading) {
    const iconEl = createElement('i', { className: icon });
    btn.appendChild(iconEl);
  }

  if (onClick) {
    btn.addEventListener('click', onClick);
  }

  return btn;
}
