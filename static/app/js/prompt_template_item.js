// prompt_template_item.js
import { renderWithModes } from "/static/ui/js/render.js";

export function createPromptTemplateSchema({
  sdk,
  onSelect,
  onSave
} = {}) {
  return {
    modes: {
      default: {
        elements: {
          id:          { type: 'text', input: { disabled: true } },
          name:        { type: 'text', format: 'title', input: {} },
          description: { type: 'text', input: { type: 'textarea', rows: 2 } },
          system:      { type: 'text', input: { type: 'textarea', rows: 3 } },
          content:     { type: 'text', input: { type: 'textarea', rows: 6 } },
          inputs:      { type: 'json', input: { type: 'textarea', rows: 3 } },
          meta:        { type: 'json', input: { type: 'textarea', rows: 3 } },
          user_format: { type: 'text', input: {} },
          created_at:  { type: 'date', format: 'MM/DD/YYYY HH:mm:SS', input: { disabled: true } }
        },
        order: ['id','name','description','system','content','inputs','meta','user_format','created_at'],
        use_inputs: true,
        actions: [
          {
            id: 'select', label: 'Select', variant: 'secondary',
            onAction: async (values, ctx) => { await onSelect?.(values, ctx); }
          },
          {
            id: 'save', label: 'Save', variant: 'primary',
            onAction: async (values, ctx) => {
              const patch = { ...values };
              delete patch.id;
              delete patch.created_at;
              await sdk?.templates?.put(values.id, patch);
              await onSave?.(values, ctx);
            }
          }
        ]
      }
    }
  };
}

export function renderTemplateCard(tpl, deps = {}, opts = {}) {
  const schema = createPromptTemplateSchema(deps);
  return renderWithModes(tpl, schema, { mode: opts.mode || 'default' });
}
