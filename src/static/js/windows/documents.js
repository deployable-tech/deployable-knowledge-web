import { spawnWindow } from '/static/ui/js/window.js';
import { addInactiveIds, removeInactiveIds, getInactiveIds } from '../state.js';

export function createDocumentsWindow() {
  spawnWindow({
    id: 'win_docs',
    window_type: 'window_generic',
    title: 'Document Library',
    col: 'left',
    unique: true,
    resizable: true,
    Elements: [
      {
        type: 'item_list',
        id: 'docs_list',
        label: 'Documents',
        label_position: 'top',
        class: 'label-top',
        fetch: async () => {
          const docs = await fetch('/documents').then(r => r.json()).catch(() => []);
          const inactive = new Set(getInactiveIds());
          return docs.map(d => ({
            id: d.id,
            title: d.title,
            segments: d.segments,
            status: inactive.has(d.id) ? 'inactive' : 'active'
          }));
        },
        item_template: {
          elements: [
            { type: 'text', bind: 'title', class: 'li-title' },
            { type: 'text', bind: 'status', class: 'li-meta' },
            { type: 'button', label: 'Open', action: 'open' },
            { type: 'button', label: 'Toggle', action: 'toggle' },
            { type: 'button', label: 'Delete', action: 'delete' }
          ]
        },
        on: {
          open: (item) => {
            // TODO(voxa): implement document view
            console.log('open', item);
          },
          toggle: async (item, el) => {
            const inactive = new Set(getInactiveIds());
            if (inactive.has(item.id)) removeInactiveIds([item.id]);
            else addInactiveIds([item.id]);
            el.refresh?.();
          },
          delete: async (item, el) => {
            await fetch('/remove', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ source: item.id })
            }).catch(() => {});
            removeInactiveIds([item.id]);
            el.refresh?.();
          }
        }
      }
    ]
  });
}
