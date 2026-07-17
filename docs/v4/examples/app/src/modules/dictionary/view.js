import { createElement } from '@qmf/runtime';

/** Imperative DOM view — vanilla JS. */
export function createDictionaryView() {
  let root = null;
  let input = null;
  let list = null;

  return {
    /**
     * @param {HTMLElement} el
     * @param {(keyword: string) => void} onSearch
     */
    mount(el, onSearch) {
      root = el;
      input = createElement('input', {
        className: 'qmf-dict-input',
        type: 'search',
        placeholder: 'Search…',
      });
      list = createElement('ul', { className: 'qmf-dict-results' });
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && input?.value.trim()) {
          onSearch(input.value.trim());
        }
      });
      root.append(input, list);
    },
    unmount() {
      root?.replaceChildren();
      root = null;
      input = null;
      list = null;
    },
    /** @param {{ id: string, title: string }[]} items */
    renderResults(items) {
      if (!list) return;
      list.replaceChildren(
        ...items.map((item) =>
          createElement('li', { 'data-id': item.id }, [item.title]),
        ),
      );
    },
  };
}
