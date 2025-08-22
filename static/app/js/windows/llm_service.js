import { renderServiceCard } from '../items/llm_services_item.js';
import { renderModelCard } from '../items/llm_service_model_item.js';
import store from '../state/store.js';

export const servicesWindow = {
  id: 'services',
  title: 'LLM Service & Model',
  layout: [
    {
      tag: 'div',
      class: 'row',
      children: [
        { tag: 'button', id: 'loadServices', text: 'Load Services' },
        { tag: 'button', id: 'refreshSelection', text: 'Get Selection' },
        { tag: 'button', id: 'manageServices', text: 'Manage Services' }
      ]
    },
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
        { tag: 'select', id: 'model' }
      ]
    },
    { tag: 'div', class: 'row', children: [ { tag: 'button', id: 'setSelection', text: 'Update Selection' } ] },
    { tag: 'div', id: 'serviceLst' },
    { tag: 'div', id: 'serviceCards' },
    { tag: 'div', id: 'modelCards' }
  ]
};

export function setupLLMServiceUI({ getSDK, elements, helpers, userIdEl, deps = {} }) {
  const { loadServices, refreshSelection: refreshSel, svc: svcSel, model: modelSel, setSelection, serviceCards, modelCards, manageServices } = elements;
  const { ensureSDK } = helpers;
  const { showWindow } = deps;

  const services = new Map();
  const models = new Map();

  function renderService(service) {
    serviceCards.innerHTML = '';
    if (!service) return;
    const host = renderServiceCard(service, {
      sdk: getSDK(),
      getUserId: () => userIdEl.value || 'local-user'
    });
    serviceCards.appendChild(host);
  }

  function renderModel(model) {
    modelCards.innerHTML = '';
    if (!model) return;
    const host = renderModelCard(model, {
      sdk: getSDK(),
      getUserId: () => userIdEl.value || 'local-user',
      getSelectedServiceId: () => svcSel.value
    });
    modelCards.appendChild(host);
  }

  async function populateModels() {
    modelSel.innerHTML = '';
    modelCards.innerHTML = '';
    models.clear();
    const sid = svcSel.value;
    if (!sid) return;
    try {
      ensureSDK();
      const sdk = getSDK();
      const list = await sdk.llm.listModels(sid);
      const def = document.createElement('option');
      def.value = '';
      def.textContent = '-- select model --';
      modelSel.appendChild(def);
      for (const m of list) {
        models.set(m.id, m);
        const opt = document.createElement('option');
        opt.value = m.id;
        opt.textContent = `${m.name || m.model_name || m.id} (${m.modality || m.mode || 'text'})`;
        modelSel.appendChild(opt);
      }
      if (list.length) {
        modelSel.value = list[0].id;
        renderModel(list[0]);
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function fetchServices() {
    try {
      ensureSDK();
      const sdk = getSDK();
      const list = await sdk.llm.listServices();
      services.clear();
      svcSel.innerHTML = '';
      const def = document.createElement('option');
      def.value = '';
      def.textContent = '-- select service --';
      svcSel.appendChild(def);
      for (const s of list) {
        services.set(s.id, s);
        const opt = document.createElement('option');
        opt.value = s.id;
        opt.textContent = s.name || s.provider || s.id;
        svcSel.appendChild(opt);
      }
      if (list.length) {
        const sel = store.llm.getSelection();
        svcSel.value = sel.serviceId && services.has(sel.serviceId) ? sel.serviceId : list[0].id;
        renderService(services.get(svcSel.value));
        await populateModels();
        if (sel.modelId) {
          modelSel.value = sel.modelId;
          renderModel(models.get(sel.modelId));
        }
      }
    } catch (e) {
      console.error(e);
    }
  }

  loadServices.addEventListener('click', fetchServices);

  svcSel.addEventListener('change', async () => {
    renderService(services.get(svcSel.value));
    await populateModels();
  });

  modelSel.addEventListener('change', () => {
    renderModel(models.get(modelSel.value));
  });

  setSelection.addEventListener('click', async () => {
    try {
      ensureSDK();
      await store.llm.setSelection({
        serviceId: svcSel.value || undefined,
        modelId: modelSel.value || undefined
      }, userIdEl.value || 'local-user');
    } catch (e) {
      console.error(e);
    }
  });

  refreshSel.addEventListener('click', async () => {
    try {
      ensureSDK();
      await store.llm.loadSelection();
    } catch (e) {
      console.error(e);
    }
  });

  store.llm.onChange(async (sel) => {
    if (svcSel.value !== (sel.serviceId || '')) {
      svcSel.value = sel.serviceId || '';
      await populateModels();
    }
    modelSel.value = sel.modelId || '';
    renderService(services.get(sel.serviceId));
    renderModel(models.get(sel.modelId));
  });

  if (manageServices && typeof showWindow === 'function') {
    manageServices.addEventListener('click', () => showWindow('service-admin'));
  }
}
