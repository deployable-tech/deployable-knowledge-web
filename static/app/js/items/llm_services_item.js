// llm_service_item.js
import { renderWithModes } from "/static/ui/js/render.js";

/**
 * DI-friendly schema: no globals, the app injects sdk + callbacks.
 */
export function createLLMServiceSchema({
  sdk,
  getUserId = () => "local-user",
  onSelect,  // optional UI side-effect (e.g., highlight)
  onSave,    // optional hook after save
  onEdit,    // optional hook when entering edit
  onCancel,  // optional hook when canceling edit
  onDelete,  // optional hook after delete
} = {}) {
  return {
    modes: {
      default: {
        elements: {
          name:        { type: "text",  format: "title" },
          provider:    { type: "text" },
          base_url:    { type: "text",  format: "url" },
          auth_ref:    { type: "text" },
          timeout_sec: { type: "number", input: { type: "number", integer: true, min: 0 } },
          is_enabled:  { type: "bool",  input: { type: "checkbox" } },
          extra:       { type: "json",  format: "json_as_text", input: { type: "textarea", rows: 6 } },
          created_at:  { type: "date",  format: "MM/DD/YYYY HH:mm:SS" },
        },
        order: ["provider","base_url","auth_ref","timeout_sec","is_enabled","extra","created_at"],
        actions: [
          {
            id: "select", label: "Select", variant: "primary",
            onAction: async (values, ctx) => {
              // Server call
              await sdk?.llm?.updateSelection({
                user_id: getUserId(),
                service_id: values.id,
              });
              // Optional UI effect
              await onSelect?.(values, ctx);
            },
          },
          {
            id: "edit", label: "Edit", variant: "secondary",
            onAction: (values, ctx) => {
              onEdit?.(values, ctx);
              ctx.setMode("edit");
            },
          },
          {
            id: "delete", label: "Delete", variant: "danger",
            onAction: async (values, ctx) => {
              await sdk?.llm?.deleteService(values.id);
              await onDelete?.(values, ctx);
            },
          },
        ],
      },

      edit: {
        extends: "default",
        use_inputs: true,
        actions_replace: true,
        actions: [
          {
            id: "save", label: "Save", variant: "primary",
            onAction: async (values, ctx) => {
              const payload = { ...values };
              delete payload.id;
              delete payload.created_at;
              let res;
              if (values.id) res = await sdk?.llm?.updateService(values.id, payload);
              else res = await sdk?.llm?.createService(payload);
              await onSave?.(res, ctx);
              ctx.setMode("default");
            },
          },
          {
            id: "cancel", label: "Cancel", variant: "secondary",
            onAction: (values, ctx) => {
              onCancel?.(values, ctx);
              ctx.setMode("default");
            },
          },
        ],
      },
    },
  };
}

/** Convenience: build a card for one service */
export function renderServiceCard(service, deps = {}, opts = {}) {
  const schema = createLLMServiceSchema(deps);
  return renderWithModes(service, schema, { mode: opts.mode || "default" });
}
