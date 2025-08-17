// applications/windows/templates.js
export function initTemplatesWindow({ sdk, spawnWindow }) {
  if (typeof spawnWindow !== "function") throw new Error("spawnWindow missing");

  spawnWindow({
    id: "win_templates",
    title: "Prompt Templates",
    col: "right",
    window_type: "window_generic",
    Elements: [
      { type: "select", id: "tpl_select", label: "Templates", options: [] },
      { type: "text_field", id: "tpl_id", label: "ID" },
      { type: "text_field", id: "tpl_name", label: "Name" },
      { type: "text_area", id: "tpl_user", label: "User Format" },
      { type: "text_area", id: "tpl_system", label: "System Prompt" },
      { type: "submit_button", id: "tpl_save", text: "Save" }
    ]
  });

  let templates = [];

  async function refreshTemplates() {
    templates = await sdk.templates.list();
    const sel = document.getElementById("tpl_select");
    if (sel) {
      sel.innerHTML = "";
      const emptyOpt = document.createElement("option");
      emptyOpt.value = "";
      emptyOpt.textContent = "Select a template";
      sel.appendChild(emptyOpt);
      for (const t of templates) {
        const opt = document.createElement("option");
        opt.value = t.id;
        opt.textContent = t.name || t.id;
        sel.appendChild(opt);
      }
    }
  }
  refreshTemplates();

  document.getElementById("tpl_select")?.addEventListener("change", (e) => {
    const tpl = templates.find(t => t.id === e.target.value);
    document.getElementById("tpl_id").value = tpl?.id || "";
    document.getElementById("tpl_name").value = tpl?.name || "";
    document.getElementById("tpl_user").value = tpl?.user_format || "";
    document.getElementById("tpl_system").value = tpl?.system || "";
  });

  document.getElementById("tpl_save")?.addEventListener("click", async () => {
    const id = document.getElementById("tpl_id").value;
    const name = document.getElementById("tpl_name").value;
    const user_format = document.getElementById("tpl_user").value;
    const system = document.getElementById("tpl_system").value;
    if (id) {
      await sdk.templates.put(id, { id, name, user_format, system });
      await refreshTemplates();
      const sel = document.getElementById("tpl_select");
      if (sel) sel.value = id;
    }
  });
}
