// llm_service_model_item.js
import { renderWithModes } from "/static/ui/js/render.js";

/**
 * Schema + actions for a single LLM model row.
 * All behavior is DI’d via args; renderer stays dumb.
 */
export function createLLMServiceModelSchema({
  sdk,
  getUserId             = () => "local-user",
  getSelectedServiceId  = () => undefined,     // fallback if model.service_id missing
  onSelect,  // UI hook after select (e.g., highlight)
  onSave,    // hook after save
  onEdit,    // hook on entering edit
  onCancel,  // hook on cancel
  onDelete,  // hook after delete
} = {}) {
  return {
    object_type: "llm_model",
    modes: {
      default: {
        elements: {
          // title: tolerate either key from backend
          model_name:    { type: "text",  format: "title", input: { type: "text" } },
          name:          { type: "text",  format: "title", input: { type: "text" } },

          service_id:    { type: "text",  input: { type: "text" } },
          modality:      { type: "text",  input: { type: "select", options: ["text","chat","vision","audio","tool"] } },
          context_window:{ type: "number",input: { type: "number", min: 0, step: 1, integer: true } },
          supports_tools:{ type: "bool",  input: { type: "checkbox" } },
          created_at:    { type: "date",  format: "MM/DD/YYYY HH:mm:SS" },
          extra:         { type: "json",  format: "json_as_text", input: { type: "textarea", rows: 6 } }
        },
        order: ["name","model_name","service_id","modality","context_window","supports_tools","extra","created_at"],
        actions: [
          {
            id: "select", label: "Select", variant: "primary", where: "footer",
            onAction: async (values, ctx) => {
              const payload = {
                user_id:   getUserId(),
                service_id: values.service_id ?? getSelectedServiceId(),
                model_id:   values.id
              };
              await sdk?.llm?.updateSelection(payload);
              await onSelect?.(values, ctx);
            }
          },
          {
            id: "edit", label: "Edit", variant: "secondary", where: "footer",
            onAction: (values, ctx) => { onEdit?.(values, ctx); ctx.setMode("edit"); }
          },
          {
            id: "delete", label: "Delete", variant: "danger", where: "footer",
            onAction: async (values, ctx) => {
              await sdk?.llm?.deleteModel(values.id);
              await onDelete?.(values, ctx);
            }
          }
        ]
      },

      edit: {
        extends: "default",
        // In edit mode the title fields should render as editable inputs
        // rather than static header labels. Override the default element
        // config to drop the `format: "title"` flag which the shared
        // renderer treats as display-only.
        elements: {
          name:       { type: "text", input: { type: "text" } },
          model_name: { type: "text", input: { type: "text" } }
        },
        use_inputs: true,
        actions_replace: true, // ← clean swap: only Save/Cancel in edit mode
        actions: [
          {
            id: "save", label: "Save", variant: "primary", where: "footer",
            onAction: async (values, ctx) => {
              const payload = { ...values };
              delete payload.id; delete payload.created_at;
              payload.service_id = values.service_id ?? getSelectedServiceId();
              let res;
              if (values.id) res = await sdk?.llm?.updateModel(values.id, payload);
              else res = await sdk?.llm?.createModel(payload);
              await onSave?.(res, ctx);
              ctx.setMode("default");
            }
          },
          {
            id: "cancel", label: "Cancel", variant: "secondary", where: "footer",
            onAction: (values, ctx) => { onCancel?.(values, ctx); ctx.setMode("default"); }
          }
        ]
      }
    }
  };
}

/** Convenience builder: returns a host node for one model card */
export function renderModelCard(model, deps = {}, opts = {}) {
  const schema = createLLMServiceModelSchema(deps);
  return renderWithModes(model, schema, { mode: opts.mode || "default" });
}
