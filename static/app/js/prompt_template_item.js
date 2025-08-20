// prompt_template_item.js
import { renderWithModes } from "/static/ui/js/render.js";

export function createPromptTemplateSchema({
  sdk,
  onSelect,
  onSave,
  onEdit,
  onCancel
} = {}) {
  return {
    modes: {
      default: {
        elements: {
          name:        { type: 'text', format: 'title' },
          description: { type: 'text' },
          created_at:  { type: 'date', format: 'MM/DD/YYYY HH:mm:SS' }
        },
        order: ['name','description','created_at'],
        actions: [
          {
            id: 'select', label: 'Select', variant: 'primary',
            onAction: async (values, ctx) => { await onSelect?.(values, ctx); }
          },
          {
            id: 'edit', label: 'Edit', variant: 'secondary',
            onAction: (values, ctx) => { onEdit?.(values, ctx); ctx.setMode('edit'); }
          }
        ]
      },
      edit: {
        extends: 'default',
        elements: {
          template: { type: 'text', input: { type: 'textarea', rows: 6 } },
          body:     { type: 'text', input: { type: 'textarea', rows: 6 } }
        },
        order: ['name','description','template','body','created_at'],
        use_inputs: true,
        actions_replace: true,
        actions: [
          {
            id: 'save', label: 'Save', variant: 'primary',
            onAction: async (values, ctx) => {
              const patch = { ...values };
              delete patch.id;
              delete patch.created_at;
              await sdk?.templates?.put(values.id, patch);
              await onSave?.(patch, ctx);
              ctx.setMode('default');
            }
          },
          {
            id: 'cancel', label: 'Cancel', variant: 'secondary',
            onAction: (values, ctx) => { onCancel?.(values, ctx); ctx.setMode('default'); }
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
