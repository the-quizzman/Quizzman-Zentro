import { createElement } from '@qmf/runtime';

/**
 * Imperative DOM view — vanilla JS, no JSX.
 */
export function createAuthView() {
  let root = null;
  let chip = null;

  return {
    /**
     * @param {HTMLElement} el
     * @param {{ loginUrl: string }} opts
     */
    mount(el, opts) {
      root = el;
      chip = createElement('a', {
        className: 'qmf-auth-chip',
        href: opts.loginUrl,
      }, ['Sign in']);
      root.appendChild(chip);
    },
    unmount() {
      chip?.remove();
      chip = null;
      root = null;
    },
    /** @param {string|null} label */
    renderUser(label) {
      if (!chip) return;
      chip.textContent = label ?? 'Sign in';
    },
  };
}
