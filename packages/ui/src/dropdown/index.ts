/**
 * @qmf/ui - Dropdown Component
 * Accessible dropdown menu with keyboard navigation.
 */

import { createElement, uniqueId, createEventEmitter } from '@qmf/utils';

export interface DropdownItem {
  /** Item label */
  label: string;
  /** Icon class */
  icon?: string;
  /** Action identifier */
  action?: string;
  /** External URL */
  href?: string;
  /** Danger styling */
  danger?: boolean;
  /** Is a divider */
  divider?: boolean;
  /** Disabled */
  disabled?: boolean;
}

export interface DropdownOptions {
  /** Trigger element */
  trigger: HTMLElement;
  /** Menu items */
  items: DropdownItem[];
  /** Alignment */
  align?: 'left' | 'right';
  /** Additional CSS class */
  className?: string;
  /** On item click */
  onSelect?: (item: DropdownItem) => void;
}

export class Dropdown {
  private id: string;
  private options: DropdownOptions;
  private menuEl: HTMLElement | null = null;
  private emitter = createEventEmitter();
  private isOpen = false;
  private outsideClickHandler: ((e: MouseEvent) => void) | null = null;

  constructor(options: DropdownOptions) {
    this.id = uniqueId('dropdown');
    this.options = options;
    this.setup();
  }

  toggle(): void {
    this.isOpen ? this.close() : this.open();
  }

  open(): void {
    if (this.isOpen) return;
    this.isOpen = true;
    this.render();
    this.emitter.emit('open');
  }

  close(): void {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.menuEl?.remove();
    this.menuEl = null;
    if (this.outsideClickHandler) {
      document.removeEventListener('click', this.outsideClickHandler);
      this.outsideClickHandler = null;
    }
    this.emitter.emit('close');
  }

  on(event: string, cb: (data: unknown) => void): () => void {
    return this.emitter.on(event, cb);
  }

  destroy(): void {
    this.close();
    this.emitter.clear();
  }

  private setup(): void {
    this.options.trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggle();
    });
  }

  private render(): void {
    const { items, align = 'right', className = '' } = this.options;

    this.menuEl = createElement('div', {
      className: `qmf-dropdown qmf-dropdown--${align} ${className}`.trim(),
      role: 'menu',
      id: this.id,
    });

    for (const item of items) {
      if (item.divider) {
        const divider = createElement('div', { className: 'qmf-dropdown__divider', role: 'separator' });
        this.menuEl.appendChild(divider);
        continue;
      }

      const el = createElement('button', {
        className: `qmf-dropdown__item ${item.danger ? 'qmf-dropdown__item--danger' : ''} ${item.disabled ? 'qmf-dropdown__item--disabled' : ''}`.trim(),
        role: 'menuitem',
        type: 'button',
        ...(item.disabled ? { disabled: '' } : {}),
      });

      if (item.icon) {
        const icon = createElement('i', { className: item.icon });
        el.appendChild(icon);
      }

      const label = createElement('span', { className: 'qmf-dropdown__label' }, [item.label]);
      el.appendChild(label);

      if (!item.disabled) {
        el.addEventListener('click', () => {
          this.options.onSelect?.(item);
          this.emitter.emit('select', item);
          this.close();
        });
      }

      this.menuEl.appendChild(el);
    }

    // Position relative to trigger
    const trigger = this.options.trigger;
    trigger.parentElement?.appendChild(this.menuEl);

    // Close on outside click
    this.outsideClickHandler = (e: MouseEvent) => {
      if (!this.menuEl?.contains(e.target as Node) && !trigger.contains(e.target as Node)) {
        this.close();
      }
    };
    setTimeout(() => {
      document.addEventListener('click', this.outsideClickHandler!);
    }, 0);
  }
}

export function createDropdown(options: DropdownOptions): Dropdown {
  return new Dropdown(options);
}
