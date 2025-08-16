import { spawnWindow } from "/static/ui/js/framework.js";
import { llm } from "../sdk.js";
import { attachLLMSelect } from "../components/llm_select.js";

export async function openLLMRegistry() {
  if (document.getElementById("win_llm_registry")) return;
  const win = spawnWindow({
    id: "win_llm_registry",
    window_type: "window_generic",
    title: "Models & Services",
    unique: true,
    resizable: true,
    width: 600,
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

  const body = document.createElement("div");
  body.style.display = "flex";
  body.style.gap = "8px";
  body.style.marginTop = "8px";
  content.appendChild(body);

  const svcCol = document.createElement("div");
  svcCol.style.flex = "1";
  body.appendChild(svcCol);
  svcCol.innerHTML = `<div class="list-header"><span>Services</span> <button class="btn" id="svc_add">Add</button></div><ul id="svc_list"></ul>`;

  const mdlCol = document.createElement("div");
  mdlCol.style.flex = "1";
  body.appendChild(mdlCol);
  mdlCol.innerHTML = `<div class="list-header"><span>Models</span> <button class="btn" id="mdl_add">Add</button></div><ul id="mdl_list"></ul>`;

  if (llm.useMock) {
    const badge = document.createElement("span");
    badge.textContent = "Mock API";
    badge.style.fontSize = "0.75em";
    badge.style.marginLeft = "8px";
    win.querySelector(".title")?.appendChild(badge);
  }

  let currentService = (await llm.getSelection()).service_id;

  async function refreshServices() {
    const list = await llm.listServices();
    const ul = svcCol.querySelector("#svc_list");
    ul.innerHTML = "";
    for (const s of list) {
      const li = document.createElement("li");
      li.textContent = s.name;
      li.style.cursor = "pointer";
      if (!s.is_enabled) li.style.opacity = "0.5";
      li.addEventListener("click", () => {
        currentService = s.id;
        refreshModels();
      });
      const edit = document.createElement("button");
      edit.textContent = "Edit";
      edit.className = "btn btn-small";
      edit.addEventListener("click", ev => { ev.stopPropagation(); openServiceForm(s); });
      const del = document.createElement("button");
      del.textContent = "Delete";
      del.className = "btn btn-small";
      del.addEventListener("click", async ev => {
        ev.stopPropagation();
        if (confirm("Delete service?")) {
          await llm.deleteService(s.id);
          if (currentService === s.id) currentService = null;
          refreshServices();
          refreshModels();
        }
      });
      const tog = document.createElement("button");
      tog.textContent = s.is_enabled ? "Disable" : "Enable";
      tog.className = "btn btn-small";
      tog.addEventListener("click", async ev => {
        ev.stopPropagation();
        await llm.updateService(s.id, { is_enabled: !s.is_enabled });
        refreshServices();
      });
      li.append(" ", edit, " ", tog, " ", del);
      ul.appendChild(li);
    }
  }

  async function refreshModels() {
    const ul = mdlCol.querySelector("#mdl_list");
    ul.innerHTML = "";
    if (!currentService) return;
    const models = await llm.listModels(currentService);
    for (const m of models) {
      const li = document.createElement("li");
      li.textContent = m.name;
      li.style.cursor = "pointer";
      const edit = document.createElement("button");
      edit.textContent = "Edit";
      edit.className = "btn btn-small";
      edit.addEventListener("click", ev => { ev.stopPropagation(); openModelForm(m); });
      const del = document.createElement("button");
      del.textContent = "Delete";
      del.className = "btn btn-small";
      del.addEventListener("click", async ev => {
        ev.stopPropagation();
        if (confirm("Delete model?")) {
          await llm.deleteModel(m.id);
          refreshModels();
        }
      });
      li.append(" ", edit, " ", del);
      ul.appendChild(li);
    }
  }

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

  async function openModelForm(model) {
    const id = "modal_model";
    if (document.getElementById(id)) return;
    spawnWindow({
      id,
      window_type: "window_generic",
      title: model?.id ? "Edit Model" : "Add Model",
      modal: true,
      resizable: false,
      unique: true,
      Elements: [
        { type: "input", id: "mdl_name", label: "Name", value: model?.name || "" },
        { type: "input", id: "mdl_modality", label: "Modality", value: model?.modality || "" },
        { type: "number", id: "mdl_ctx", label: "Context Window", value: model?.context_window ?? "" },
        { type: "checkbox", id: "mdl_tools", label: "Supports Tools", checked: model?.supports_tools || false },
        { type: "text_area", id: "mdl_extra", label: "Extra", rows: 3, value: JSON.stringify(model?.extra || {}, null, 2) },
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
      const name = modal.querySelector("#mdl_name").value.trim();
      if (!name) { alert("name required"); return; }
      let extra = {};
      const extraTxt = modal.querySelector("#mdl_extra").value.trim();
      if (extraTxt) { try { extra = JSON.parse(extraTxt); } catch { alert("Invalid JSON"); return; } }
      const payload = {
        service_id: model?.service_id || currentService,
        name,
        modality: modal.querySelector("#mdl_modality").value.trim() || null,
        context_window: Number(modal.querySelector("#mdl_ctx").value) || null,
        supports_tools: modal.querySelector("#mdl_tools").checked,
        extra,
      };
      if (model?.id) await llm.updateModel(model.id, payload); else await llm.createModel(payload);
      modal.remove();
      refreshModels();
    });
  }

  svcCol.querySelector("#svc_add").addEventListener("click", () => openServiceForm());
  mdlCol.querySelector("#mdl_add").addEventListener("click", () => { if (currentService) openModelForm({ service_id: currentService }); });

  window.addEventListener("llm:services:updated", refreshServices);
  window.addEventListener("llm:models:updated", e => { if (e.detail?.service_id === currentService) refreshModels(); });

  await refreshServices();
  await refreshModels();
  return win;
}
