import { renderServiceCard } from '../items/llm_services_item.js';
import store from '../state/store.js';

export const servicesWindow = {
  id: 'services',
  title: 'LLM Services',
  layout: [
    {
      tag: 'div',
      class: 'row',
      children: [
        { tag: 'label', attrs: { style: 'min-width:80px;' }, text: 'Service' },
        { tag: 'select', id: 'svc' },
        { tag: 'button', id: 'addSvc', text: 'Add Service' }
      ]
    },
    { tag: 'div', id: 'svcCard' }
  ]
};

export function setupLLMServicesUI({ getSDK, elements, helpers = {}, deps = {} }) {
  const { svc, addSvc, svcCard } = elements;
  const { ensureSDK } = helpers;
  const { refreshServiceMenu, refreshModelServices } = deps;

  const services = new Map();

  function renderService(s, opts = {}) {
    svcCard.innerHTML = '';
    if (!s) return;
    const host = renderServiceCard(s, {
      sdk: getSDK(),
      getUserId: () => 'local-user',
      onSelect: async () => {
        await store.llm.loadSelection();
      },
      onSave: async () => {
        await fetchServices();
      },
      onDelete: async () => {
        await fetchServices();
      }
    }, opts);
    svcCard.appendChild(host);
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
      if (list.length) {
        svc.value = list[0].id;
        renderService(services.get(svc.value));
      } else {
        svc.value = '';
      }
      refreshServiceMenu && refreshServiceMenu();
      refreshModelServices && refreshModelServices();
    } catch (e) {
      console.error(e);
    }
  }

  svc.addEventListener('change', () => {
    renderService(services.get(svc.value));
  });

  addSvc.addEventListener('click', () => {
    renderService({ provider: '', base_url: '', auth_ref: '', timeout_sec: 0, is_enabled: true, extra: {} }, { mode: 'edit' });
  });

  return { fetchServices };
}

