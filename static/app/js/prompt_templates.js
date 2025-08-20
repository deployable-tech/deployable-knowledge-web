import { renderTemplateCard } from './prompt_template_item.js';

export function setupPromptTemplatesUI({ getSDK, elements, helpers }) {
  const { loadTemplates, tplSel, tplCard, templateId } = elements;
  const { ensureSDK } = helpers;

  const templates = new Map();

  function renderTemplate(id) {
    tplCard.innerHTML = '';
    const tpl = templates.get(id);
    if (!tpl) return;
    const host = renderTemplateCard(tpl, {
      sdk: getSDK(),
      onSelect: (values) => { if (templateId) templateId.value = values.id; }
    });
    tplCard.appendChild(host);
  }

  async function fetchTemplates() {
    try {
      ensureSDK();
      const sdk = getSDK();
      const list = await sdk.templates.list();
      templates.clear();
      tplSel.innerHTML = '';
      const def = document.createElement('option');
      def.value = '';
      def.textContent = '-- select template --';
      tplSel.appendChild(def);
      for (const t of list) {
        templates.set(t.id, t);
        const opt = document.createElement('option');
        opt.value = t.id;
        opt.textContent = t.id;
        tplSel.appendChild(opt);
      }
      if (list.length) {
        tplSel.value = list[0].id;
        renderTemplate(list[0].id);
      }
    } catch (e) {
      console.error(e);
    }
  }

  loadTemplates.addEventListener('click', fetchTemplates);
  tplSel.addEventListener('change', () => renderTemplate(tplSel.value));
}
