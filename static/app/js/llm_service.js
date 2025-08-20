import { renderServiceCard } from './llm_services_item.js';
import { renderModelCard } from './llm_service_model_item.js';

export function setupLLMServiceUI({ getSDK, elements, helpers, userIdEl }) {
  const { loadServices, refreshSel, svcSel, modelSel, setSelection, serviceCards, modelCards } = elements;
  const { ensureSDK } = helpers;

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
        svcSel.value = list[0].id;
        renderService(list[0]);
        await populateModels();
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
      const sdk = getSDK();
      const payload = {
        user_id: userIdEl.value || 'local-user',
        service_id: svcSel.value || undefined,
        model_id: modelSel.value || undefined
      };
      const res = await sdk.llm.updateSelection(payload);
      console.log(res);
    } catch (e) {
      console.error(e);
    }
  });

  refreshSel.addEventListener('click', async () => {
    try {
      ensureSDK();
      const sdk = getSDK();
      const sel = await sdk.llm.getSelection();
      console.log(sel);
    } catch (e) {
      console.error(e);
    }
  });
}
