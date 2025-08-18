import { spawnWindow } from '/static/ui/js/window.js';
import { updateSelection } from '../sdk.js';
import { setSelection, getSelection } from '../state.js';

export function createLLMServicesWindow() {
  spawnWindow({
    id: 'win_llm_services',
    window_type: 'window_generic',
    title: 'LLM Services',
    col: 'left',
    unique: true,
    resizable: true,
    Elements: [
      {
        type: 'item_list',
        id: 'services_list',
        label: 'Services',
        label_position: 'top',
        class: 'label-top',
        fetch: async () => {
          const res = await fetch('/api/llm/services').then(r => r.json()).catch(() => []);
          const sel = getSelection();
          const rows = [];
          for (const svc of res) {
            for (const m of svc.models || []) {
              rows.push({
                id: `${svc.service_id}-${m.model_id}`,
                service_id: svc.service_id,
                model_id: m.model_id,
                name: svc.name,
                model_name: m.name || m.model_name || '',
                selected: sel.service_id === svc.service_id && sel.model_id === m.model_id
              });
            }
          }
          return rows;
        },
        item_template: {
          elements: [
            { type: 'text', bind: 'name', class: 'li-title' },
            { type: 'text', bind: 'model_name', class: 'li-meta' },
            { type: 'button', label: 'Select', action: 'select' }
          ]
        },
        on: {
          select: async (item, el) => {
            const payload = { service_id: item.service_id, model_id: item.model_id };
            await updateSelection(payload);
            setSelection(payload);
            el.refresh?.();
          }
        }
      }
    ]
  });
}
