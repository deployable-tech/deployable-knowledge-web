import { renderModelCard } from '../items/llm_service_model_item.js';
import store from '../state/store.js';

export const modelsWindow = {
  id: 'models',
  title: 'LLM Models',
  layout: [
    {
      tag: 'div',
      class: 'row',
      children: [
        { tag: 'label', attrs: { style: 'min-width:80px;' }, text: 'Service' },
        { tag: 'select', id: 'svc' }
      ]
    },
    {
      tag: 'div',
      class: 'row',
      children: [
        { tag: 'label', attrs: { style: 'min-width:80px;' }, text: 'Model' },
        { tag: 'select', id: 'model' },
        { tag: 'button', id: 'addModel', text: 'Add Model' }
      ]
    },
    { tag: 'div', id: 'modelCard' }
  ]
};

export function setupLLMModelsUI({ getSDK, elements, helpers = {}, deps = {} }) {
  const { svc, model, addModel, modelCard } = elements;
  const { ensureSDK } = helpers;
  const { refreshModelMenu } = deps;

  const services = new Map();
  const models = new Map();

  function renderModel(m, opts = {}) {
    modelCard.innerHTML = '';
    if (!m) return;
    const host = renderModelCard(m, {
      sdk: getSDK(),
      getUserId: () => 'local-user',
      getSelectedServiceId: () => svc.value,
      onSelect: async () => {
        await store.llm.loadSelection();
      },
      onSave: async () => {
        await fetchModels();
        refreshModelMenu && refreshModelMenu(svc.value);
      },
      onDelete: async () => {
        await fetchModels();
        refreshModelMenu && refreshModelMenu(svc.value);
      }
    }, opts);
    modelCard.appendChild(host);
  }

  async function fetchServices() {
    try {
      ensureSDK && ensureSDK();
      const sdk = getSDK();
      const list = await sdk.llm.listServices();
      services.clear();
      svc.innerHTML = '';
      const def = document.createElement('option');
      def.value = '';
      def.textContent = '-- select service --';
      svc.appendChild(def);
      for (const s of list) {
        services.set(s.id, s);
        const opt = document.createElement('option');
        opt.value = s.id;
        opt.textContent = s.name || s.provider || s.id;
        svc.appendChild(opt);
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function fetchModels() {
    model.innerHTML = '';
    modelCard.innerHTML = '';
    models.clear();
    const sid = svc.value;
    if (!sid) return;
    try {
      ensureSDK && ensureSDK();
      const sdk = getSDK();
      const list = await sdk.llm.listModels(sid);
      const def = document.createElement('option');
      def.value = '';
      def.textContent = '-- select model --';
      model.appendChild(def);
      for (const m of list) {
        models.set(m.id, m);
        const opt = document.createElement('option');
        opt.value = m.id;
        opt.textContent = m.name || m.model_name || m.id;
        model.appendChild(opt);
      }
      if (list.length) {
        model.value = list[0].id;
        renderModel(models.get(model.value));
      }
    } catch (e) {
      console.error(e);
    }
  }

  svc.addEventListener('change', () => {
    fetchModels();
  });

  model.addEventListener('change', () => {
    renderModel(models.get(model.value));
  });

  addModel.addEventListener('click', () => {
    if (!svc.value) return;
    const blank = {
      service_id: svc.value,
      name: '',
      model_name: '',
      modality: null,
      context_window: null,
      supports_tools: false,
      extra: {}
    };
    renderModel(blank, { mode: 'edit' });
  });

  return { fetchServices, fetchModels };
}

