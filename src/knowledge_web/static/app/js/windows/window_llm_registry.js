import { spawnWindow } from "/static/ui/js/framework.js";
import { createItemList, getComponent, bus } from "/static/ui/js/components.js";
import { llm } from "../sdk.js";
import { attachLLMSelect } from "../components/llm_select.js";

export async function openLLMRegistry() {
  if (document.getElementById("win_llm_registry")) return;
  const win = spawnWindow({
    id: "win_llm_registry",
    window_type: "window_generic",
    title: "LLM Services",
    modal: true,
    unique: true,
    resizable: false,
    width: 500,
    height: 400,
  });
  const content = win.querySelector(".content");
  if (!content) return win;

  const topSel = document.createElement("div");
  topSel.id = "llm_active_select";
  topSel.style.display = "flex";
  topSel.style.gap = "4px";
  topSel.style.justifyContent = "flex-end";
  content.appendChild(topSel);
  attachLLMSelect(topSel);

  const list = createItemList("win_llm_registry", {
    id: "svc_list",
    item_template: {
      elements: [
        { type: "text", bind: "name" },
        { type: "button", label: "Open", action: "open" },
        { type: "button", label: "Edit", action: "edit" },
        { type: "button", label: "Delete", action: "delete", variant: "danger" },
      ],
    },
  });
  content.appendChild(list);

  const actions = document.createElement("div");
  actions.className = "actions";
  const add = document.createElement("button");
  add.className = "btn";
  add.textContent = "Add Service";
  actions.appendChild(add);
  content.appendChild(actions);

  add.addEventListener("click", () => openServiceForm());

  bus.addEventListener("ui:list-action", async (e) => {
    const { winId, elementId, action, item } = e.detail || {};
    if (winId !== "win_llm_registry" || elementId !== "svc_list") return;
    if (action === "open") {
      await llm.setSelection({ service_id: item.id, model_id: null });
    } else if (action === "edit") {
      openServiceForm(item);
    } else if (action === "delete") {
      if (confirm("Delete service?")) {
        await llm.deleteService(item.id);
        refreshServices();
      }
    }
  });

  async function refreshServices() {
    const services = await llm.listServices();
    getComponent("win_llm_registry", "svc_list").render(services);
  }

  window.addEventListener("llm:services:updated", refreshServices);
  await refreshServices();

  async function openServiceForm(service) {
    const id = "modal_service";
    if (document.getElementById(id)) return;
    spawnWindow({
      id,
      window_type: "window_generic",
      title: service ? "Edit Service" : "Add Service",
      modal: true,
      resizable: false,
      unique: true,
      Elements: [
        { type: "input", id: "svc_name", label: "Name", value: service?.name || "" },
        { type: "select", id: "svc_provider", label: "Provider", value: service?.provider || "openai", options: [
            { value: "openai", label: "openai" },
            { value: "anthropic", label: "anthropic" },
            { value: "ollama", label: "ollama" },
            { value: "vllm", label: "vllm" },
            { value: "custom", label: "Custom" },
        ] },
        { type: "input", id: "svc_base", label: "Base URL", value: service?.base_url || "" },
        { type: "input", id: "svc_auth", label: "Auth Ref", value: service?.auth_ref || "" },
        { type: "number", id: "svc_timeout", label: "Timeout", value: service?.timeout_sec ?? "" },
        { type: "checkbox", id: "svc_enabled", label: "Enabled", checked: service?.is_enabled !== false },
        { type: "text_area", id: "svc_extra", label: "Extra", rows: 3, value: JSON.stringify(service?.extra || {}, null, 2) },
      ]
    });
    const modal = document.getElementById(id);
    const content = modal.querySelector(".content");
    const actions = document.createElement("div");
    actions.className = "actions";
    const save = document.createElement("button");
    save.className = "btn";
    save.textContent = "Save";
    actions.appendChild(save);
    content.appendChild(actions);
    save.addEventListener("click", async () => {
      const name = modal.querySelector("#svc_name").value.trim();
      const provider = modal.querySelector("#svc_provider").value.trim();
      if (!name || !provider) { alert("name/provider required"); return; }
      let extra = {};
      const extraTxt = modal.querySelector("#svc_extra").value.trim();
      if (extraTxt) { try { extra = JSON.parse(extraTxt); } catch { alert("Invalid JSON"); return; } }
      const payload = {
        name,
        provider,
        base_url: modal.querySelector("#svc_base").value.trim() || null,
        auth_ref: modal.querySelector("#svc_auth").value.trim() || null,
        timeout_sec: Number(modal.querySelector("#svc_timeout").value) || null,
        is_enabled: modal.querySelector("#svc_enabled").checked,
        extra,
      };
      if (service) await llm.updateService(service.id, payload); else await llm.createService(payload);
      modal.remove();
      refreshServices();
    });
  }

  return win;
}
