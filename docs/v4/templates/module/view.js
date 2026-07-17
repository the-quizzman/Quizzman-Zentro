import { createElement } from '@qmf/runtime/dom';

export function createSampleView() {
  let root = null;
  return {
    /** @param {HTMLElement} el */
    mount(el) {
      root = el;
      root.appendChild(createElement('div', { className: 'qmf-sample' }, ['Sample']));
    },
    unmount() {
      root?.replaceChildren();
      root = null;
    },
  };
}
