// schemas.js
// export const llm_service_schema = {
//   object_type: "llm_service",
//   modes: {
//     base: {
//       elements: {
//         name:        { type: "text",  format: "title", input: { type: "text" } },
//         provider:    { type: "text",  input: { type: "select", options: ["openai","anthropic","groq","ollama"] } },
//         base_url:    { type: "text",  format: "url",   input: { type: "text" } },
//         auth_ref:    { type: "text",  input: { type: "combo", options: ["env:OPENAI_API_KEY","vault:prod/openai"] } },
//         timeout_sec: { type: "text",  input: { type: "number", min: 5, max: 300, step: 5, integer: true } },
//         is_enabled:  { type: "bool",  input: { type: "checkbox" } },
//         extra:       { type: "json",  format: "json_as_text", input: { type: "textarea", rows: 6 } },
//         created_at:  { type: "date",  format: "MM/DD/YYYY HH:MM:SS" }
//       }
//     },

//     // VIEW MODE — shows Edit + Select
//     default: {
//       extends: "base",
//       order: ["name","provider","base_url","auth_ref","timeout_sec","is_enabled","extra","created_at"],
//       use_inputs: false,
//       actions: [
//         { id: "edit",   label: "Edit",   variant: "primary", where: "header" },
//         { id: "select", label: "Select", variant: "ghost",   where: "header" }
//       ]
//     },

//     // EDIT MODE — shows Save + Cancel
//     edit: {
//       extends: "base",
//       use_inputs: true,
//       actions: [
//         { id: "save",   label: "Save",   variant: "primary", where: "header" },
//         { id: "cancel", label: "Cancel", variant: "ghost",   where: "header" }
//       ]
//     },

//     // Optional compact card mode (no buttons here)
//     item_card: {
//       extends: "base",
//       use_inputs: false,
//       elements: {
//         created_at: { hidden: true },
//         base_url:   { type: "text", format: "url" }
//       }
//     }
//   }
// };
export const llm_service_schema = {
  modes: {
    default: {
      elements: {
        name:        { type: "text", format: "title" },
        provider:    { type: "text" },
        base_url:    { type: "text" },
        auth_ref:    { type: "text" },
        timeout_sec: { type: "number", input: { type: "number", integer: true, min: 0 } },
        is_enabled:  { type: "bool",   input: { type: "checkbox" } },
        extra:       { type: "json",   format: "json_as_text", input: { type: "textarea", rows: 6 } },
        created_at:  { type: "date",   format: "MM/DD/YYYY HH:mm:SS" }
      },
      order: ["provider","base_url","auth_ref","timeout_sec","is_enabled","extra","created_at"],
      actions: [
        { id: "select", label: "Select", variant: "primary",   where: "footer",
          onAction: async (values, ctx) => { /* your select logic */ } },
        { id: "edit",   label: "Edit",   variant: "secondary", where: "footer",
          onAction: (values, ctx) => ctx.setMode("edit") }
      ]
    },

    edit: {
      extends: "default",
      use_inputs: true,
      actions_replace: true,      // 🔥 THIS kills inherited actions
      actions: [
        { id: "save",   label: "Save",   variant: "primary",   where: "footer",
          onAction: async (values, ctx) => { /* your save logic */ ctx.setMode("default"); } },
        { id: "cancel", label: "Cancel", variant: "secondary", where: "footer",
          onAction: (values, ctx) => ctx.setMode("default") }
      ]
    }
  }
};
