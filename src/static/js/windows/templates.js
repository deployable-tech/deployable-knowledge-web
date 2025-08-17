// applications/windows/templates.js
export function initTemplatesWindow({ sdk, spawnWindow }) {
  if (typeof spawnWindow !== "function") throw new Error("spawnWindow missing");

  spawnWindow({
    id: "win_templates",
    title: "Prompt Templates",
    col: "right",
    window_type: "window_generic",
    Elements: [
      { type: "list_view", id: "tpl_list", items: [], template: { title: t => t.id, subtitle: t => t.name } },
      { type: "text_field", id: "tpl_id", label: "ID" },
      { type: "text_field", id: "tpl_name", label: "Name" },
      { type: "text_area", id: "tpl_user", label: "User Format" },
      { type: "text_area", id: "tpl_system", label: "System Prompt" },
      { type: "submit_button", id: "tpl_save", text: "Save" }
    ]
  });

  async function refreshTemplates() {
    const tpls = await sdk.templates.list();
    document.getElementById("tpl_list")?.update({ items: tpls });
  }
  refreshTemplates();

  document.getElementById("tpl_save")?.addEventListener("click", async () => {
    const id = document.getElementById("tpl_id").value;
    const name = document.getElementById("tpl_name").value;
    const user_format = document.getElementById("tpl_user").value;
    const system = document.getElementById("tpl_system").value;
    if (id) {
      await sdk.templates.put(id, { id, name, user_format, system });
      refreshTemplates();
    }
  });
}
