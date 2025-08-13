import { el } from './ui.js';

export const bus = new EventTarget();

const registry = new Map(); // winId -> {compId: obj}

export function registerComponent(winId, compId, obj) {
  if (!registry.has(winId)) registry.set(winId, new Map());
  registry.get(winId).set(compId, obj);
}

export function getComponent(winId, compId) {
  return registry.get(winId)?.get(compId);
}

export function createItemList(winId, { target, id, keyField = 'id', item_template = {} }) {
  function render(items = []) {
    target.innerHTML = '';
    for (const it of items) {
      const row = el('div', { class: 'list-item', 'data-key': it[keyField] });
      const title = item_template.title ? item_template.title(it) : it[keyField];
      const subtitle = item_template.subtitle ? item_template.subtitle(it) : '';
      row.appendChild(el('div', { class: 'title' }, [title]));
      if (subtitle) row.appendChild(el('div', { class: 'subtitle' }, [subtitle]));
      const actions = item_template.actions || [];
      if (actions.length) {
        const actWrap = el('div', { class: 'actions' });
        actions.forEach((a) => {
          const btn = el('button', { class: 'btn', type: 'button' }, [a.label]);
          btn.addEventListener('click', () => {
            bus.dispatchEvent(new CustomEvent('ui:list-action', {
              detail: { winId, listId: id, action: a, item: it },
            }));
          });
          actWrap.appendChild(btn);
        });
        row.appendChild(actWrap);
      }
      target.appendChild(row);
    }
  }
  return { render };
}
