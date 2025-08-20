import { renderTemplateCard } from './prompt_template_item.js';

export const templatesWindow = {
  id: 'templates',
  title: 'Templates & Settings',
  layout: [
    {
      tag: 'div',
      class: 'row',
      children: [
        { tag: 'input', id: 'base', attrs: { size: '42' } },
        { tag: 'button', id: 'init', text: 'Init SDK' },
        { tag: 'button', id: 'prime', text: 'Prime User Session' },
        { tag: 'button', id: 'ensure', text: 'Ensure Session' },
        { tag: 'span', id: 'sid', class: 'mono subtle' }
      ]
    },
    {
      tag: 'div',
      class: 'row',
      children: [
        { tag: 'button', id: 'loadTemplates', text: 'Load Templates' },
        { tag: 'select', id: 'tplSel' }
      ]
    },
    {
      tag: 'div',
      class: 'row',
      children: [
        { tag: 'label', text: 'Template ID' },
        { tag: 'input', id: 'templateId', attrs: { value: 'rag_chat' } }
      ]
    },
    {
      tag: 'div',
      class: 'row',
      children: [
        { tag: 'input', id: 'userId', attrs: { value: 'local-user' } },
        { tag: 'button', id: 'getSettings', text: 'Get Settings' }
      ]
    },
    { tag: 'div', id: 'tplCard' }
  ]
};

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
      onSelect: (values) => { if (templateId) templateId.value = values.id; },
      onSave: (values) => {
        const current = templates.get(values.id) || {};
        templates.set(values.id, { ...current, ...values });
      }
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
