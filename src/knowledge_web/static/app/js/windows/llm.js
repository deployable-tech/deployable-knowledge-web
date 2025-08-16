import { spawnWindow } from '../../ui/framework/window.js';
import { createForm } from '../../ui/components/form.js';
import { showToast } from '../../ui/components/toast.js';
import { Store } from '../store.js';

const MODEL_OPTIONS = [
  { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
  { value: 'gpt-4', label: 'GPT-4' }
];

export function openLLMSettings() {
  if (document.getElementById('modal_llm')) return;
  const win = spawnWindow({ id:'modal_llm', title:'LLM Settings', resizable:false });
  const form = createForm({
    target: win.getContentEl(),
    initial: { model: Store.model || MODEL_OPTIONS[0].value },
    fields: [ { type:'select', key:'model', label:'Model', options: MODEL_OPTIONS } ],
    submitLabel: 'Save',
    onSubmit: (vals) => {
      Store.model = vals.model;
      showToast({ type:'success', message:'Saved' });
      win.close();
    }
  });
}
