import { renderServiceCard } from './llm_services_item.js';
import { renderModelCard } from './llm_service_model_item.js';

export function setupLLMServiceUI({ getSDK, elements, helpers, userIdEl }) {
  const { loadServices, refreshSel, svcSel, modelSel, setSelection, serviceCards, modelCards } = elements;
  const { ensureSDK, setBusy } = helpers;

  async function populateModels() {
    try {
      ensureSDK();
      const sdk = getSDK();
      const sid = svcSel.value;
      modelSel.innerHTML = '';
      if (!sid) return;
      const models = await sdk.llm.listModels(sid);
      for (const m of models) {
        const opt = document.createElement('option');
        opt.value = m.id;
        opt.textContent = `${m.name || m.model_name || m.id} (${m.modality || m.mode || 'text'})`;
        modelSel.appendChild(opt);
      }
    } catch (e) {
      console.error(e);
    }
  }

  const cards = new Map();
  const modelCardMap = new Map();

  function highlight(ctx) {
    for (const n of cards.values()) n.classList.remove('obj-card--selected');
    ctx.node.classList.add('obj-card--selected');
  }

  async function renderModelsForService(serviceId) {
    ensureSDK();
    const sdk = getSDK();
    modelCards.innerHTML = '';
    modelCardMap.clear();
    if (!serviceId) return;
    const models = await sdk.llm.listModels(serviceId);
    for (const m of models) {
      const host = renderModelCard(m, {
        sdk,
        getUserId: () => userIdEl.value || 'local-user',
        getSelectedServiceId: () => serviceId,
        onSelect: (_values, ctx) => {
          for (const n of modelCardMap.values()) n.classList.remove('obj-card--selected');
          ctx.node.classList.add('obj-card--selected');
          const opt = [...modelSel.options].find(o => o.value === m.id);
          if (opt) modelSel.value = opt.value;
        }
      });
      modelCards.appendChild(host);
      modelCardMap.set(m.id, host);
    }
  }

  loadServices.addEventListener('click', async () => {
    try {
      ensureSDK();
      const sdk = getSDK();
      const services = await sdk.llm.listServices();
      serviceCards.innerHTML = '';
      cards.clear();
      for (const s of services) {
        const host = renderServiceCard(s, {
          sdk,
          getUserId: () => userIdEl.value || 'local-user',
          onSelect: async (_values, ctx) => {
            highlight(ctx);
            await renderModelsForService(s.id);
          }
        });
        serviceCards.appendChild(host);
        cards.set(s.id, host);
      }
    } catch (e) {
      console.error(e);
    }
  });

  svcSel.addEventListener('change', populateModels);

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
