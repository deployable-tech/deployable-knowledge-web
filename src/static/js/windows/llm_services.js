// applications/windows/llm_services.js
import { createItemList } from "/static/ui/js/components/list.js";
import { closeWindow } from "/static/ui/js/window.js";

let svcTable;
let modelTable;
let currentSelection = null; // { service_id, model_id }
let editingId = null;       // service edit id
let modelEditingId = null;  // model edit id
let svcRows = [];
let modelRows = [];

// helpers for sdk.llm method names
const llmApi = (sdk) => ({
  list:         () => sdk.llm.listServices(),
  getSelection: () => sdk.llm.getSelection(),
  create:       (p)   => sdk.llm.createService(p),
  update:       (id,p)=> sdk.llm.updateService ? sdk.llm.updateService(id,p) : sdk.llm.putService(id,p),
  remove:       (id)  => sdk.llm.deleteService ? sdk.llm.deleteService(id) : sdk.llm.removeService(id),
});

export function initLLMServicesWindows({ sdk, spawnWindow, initialSelection = null, onSelectionChange }) {
  if (typeof spawnWindow !== "function") throw new Error("spawnWindow missing");
  currentSelection = initialSelection || null;
  svcRows = [];

  // ===== Window A: Services List =====
  spawnWindow({
    id: "win_llm_services",
    title: "LLM Services",
    col: "left",
    window_type: "window_generic",
    Elements: [
      { type: "submit_button", id: "svc_new",     text: "New Service" },
      { type: "submit_button", id: "svc_refresh", text: "Refresh" },
      { type: "text", id: "svc_slot", showLabel: false, html: '<div id="svc_table_slot"></div>' },
    ],
  });

  const slot = document.getElementById("svc_table_slot");
  slot.classList.add("list");

  svcTable = createItemList({
    target: slot,
    columns: [
      { key: "name",       label: "Name" },
      { key: "provider",   label: "Provider" },
      { key: "status",     label: "Status" },
      { key: "active",     label: "Active" },
      { key: "created_at", label: "Created" },
    ],
    items: [],
    actions: {
      select: (row) => {
        currentSelection = { service_id: row.id, model_id: currentSelection?.model_id ?? null };
        svcRows = svcRows.map((s) => ({ ...s, active: s.id === row.id ? "✓" : "" }));
        svcTable.setItems(svcRows);
        refreshModels();
        if (typeof onSelectionChange === "function") onSelectionChange(currentSelection);
      },
      edit: (row) => openEditorModal(row),
      del: async (row) => {
        const api = llmApi(sdk);
        try { await api.remove(row.id); }
        catch (e) { alert("Delete failed: " + (e.bodyText || e.message)); }
        finally { await refreshServices(); }
      },
      toggleEnabled: async (row) => {
        const api = llmApi(sdk);
        try { await api.update(row.id, { is_enabled: !row.is_enabled }); }
        catch (e) { alert("Enable/disable failed: " + (e.bodyText || e.message)); }
        finally { await refreshServices(); }
      },
    },
    getRowId: (row) => row.id,
  });

  document.getElementById("svc_refresh")?.addEventListener("click", () => refreshServices());
  document.getElementById("svc_new")?.addEventListener("click", () => openEditorModal(null));

  // ===== Window B: Models List =====
  spawnWindow({
    id: "win_llm_models",
    title: "LLM Models",
    col: "right",
    window_type: "window_generic",
    Elements: [
      { type: "submit_button", id: "model_new",     text: "New Model" },
      { type: "submit_button", id: "model_refresh", text: "Refresh" },
      { type: "text", id: "model_slot", showLabel: false, html: '<div id="model_table_slot"></div>' },
    ],
  });

  const mslot = document.getElementById("model_table_slot");
  mslot.classList.add("list");

  modelTable = createItemList({
    target: mslot,
    columns: [
      { key: "name",   label: "Name" },
      { key: "model",  label: "Model" },
      { key: "status", label: "Status" },
    ],
    items: [],
    actions: {
      edit: (row) => openModelModal(row),
      del: async (row) => {
        try { await sdk.llm.deleteModel(row.id); }
        catch (e) { alert("Delete failed: " + (e.bodyText || e.message)); }
        finally { await refreshModels(); }
      },
      toggleEnabled: async (row) => {
        try { await sdk.llm.updateModel(row.id, { is_enabled: !row.is_enabled }); }
        catch (e) { alert("Enable/disable failed: " + (e.bodyText || e.message)); }
        finally { await refreshModels(); }
      },
    },
    getRowId: (row) => row.id,
  });

  document.getElementById("model_refresh")?.addEventListener("click", () => refreshModels());
  document.getElementById("model_new")?.addEventListener("click", () => openModelModal(null));

  const MODAL_WIN_TYPE = (window.UI?.windowTypes?.includes?.("window_modal")) ? "window_modal" : "window_generic";

  function openEditorModal(service) {
    editingId = service?.id || null;
    closeWindow("modal_llm_editor");

    spawnWindow({
      id: "modal_llm_editor",
      title: editingId ? "Edit LLM Service" : "New LLM Service",
      window_type: MODAL_WIN_TYPE,
      col: "right",
      modal: true,
      Elements: [
        { type: "text_field",  id: "svc_id",       label: "ID (read-only)", placeholder: "(auto)", disabled: true },
        { type: "text_field",  id: "svc_name",     label: "Name",           placeholder: "e.g., openai-prod" },
        { type: "text_field",  id: "svc_provider", label: "Provider",       placeholder: "openai | ollama | azure | ..." },
        { type: "text_field",  id: "svc_base",     label: "Base URL",       placeholder: "optional" },
        { type: "text_field",  id: "svc_auth",     label: "Auth Ref",       placeholder: "optional" },
        { type: "text_field",  id: "svc_timeout",  label: "Timeout (sec)",  placeholder: "e.g., 60" },
        { type: "text_area",   id: "svc_extra",    label: "Extra (JSON)",   placeholder: "{ \"api_version\": \"...\" }" },
        { type: "submit_button", id: "svc_save",   text: "Save" },
        { type: "submit_button", id: "svc_cancel", text: "Cancel" },
      ],
    });

    fillEditor(service || null);

    const saveBtn = document.getElementById("svc_save");
    const cancelBtn = document.getElementById("svc_cancel");

    saveBtn?.addEventListener("click", async () => {
      const api = llmApi(sdk);
      const payload = gatherEditorPayload();
      if (!payload) return;
      if (!payload.name || !payload.provider) {
        alert("Name and Provider are required.");
        return;
      }

      try {
        if (editingId) {
          await api.update(editingId, payload);
        } else {
          await api.create(payload);
        }
      } catch (e) {
        alert("Save failed: " + (e.bodyText || e.message));
      } finally {
        closeWindow("modal_llm_editor");
        await refreshServices();
      }
    });

    cancelBtn?.addEventListener("click", () => closeWindow("modal_llm_editor"));
  }

  async function refreshServices() {
    const api = llmApi(sdk);
    const services = await api.list();
    if (!currentSelection) {
      currentSelection = await api.getSelection().catch(() => null);
      if (currentSelection && typeof onSelectionChange === "function") {
        onSelectionChange(currentSelection);
      }
    }

    svcRows = services.map((s) => ({
      ...s,
      status: s.is_enabled ? "enabled" : "disabled",
      active: currentSelection?.service_id === s.id ? "✓" : "",
      created_at: s.created_at ? fmtDate(s.created_at) : "",
    }));

    svcTable.setItems(svcRows);
    if (editingId) {
      const fresh = svcRows.find(r => r.id === editingId);
      if (fresh) fillEditor(fresh);
    }

    await refreshModels();
  }

  async function refreshModels() {
    if (!currentSelection?.service_id) {
      modelRows = [];
      modelTable.setItems(modelRows);
      return;
    }
    const models = await sdk.llm.listModels(currentSelection.service_id).catch(() => []);
    modelRows = models.map((m) => ({
      ...m,
      status: m.is_enabled ? "enabled" : "disabled",
    }));
    modelTable.setItems(modelRows);
    if (modelEditingId) {
      const fresh = modelRows.find(r => r.id === modelEditingId);
      if (fresh) fillModelEditor(fresh);
    }
  }

  function fillEditor(svc) {
    setValue("svc_id",       svc?.id || "");
    setValue("svc_name",     svc?.name || "");
    setValue("svc_provider", svc?.provider || "");
    setValue("svc_base",     svc?.base_url || "");
    setValue("svc_auth",     svc?.auth_ref || "");
    setValue("svc_timeout",  svc?.timeout_sec != null ? String(svc.timeout_sec) : "");
    setValue("svc_extra",    prettyJSON(svc?.extra) || "");
  }

  function gatherEditorPayload() {
    const name        = getValue("svc_name").trim();
    const provider    = getValue("svc_provider").trim();
    const base_url    = orNull(getValue("svc_base").trim());
    const auth_ref    = orNull(getValue("svc_auth").trim());
    const tval        = getValue("svc_timeout").trim();
    const timeout_sec = tval ? Number(tval) : null;
    const extraRaw    = getValue("svc_extra").trim();

    let extra = {};
    if (extraRaw) {
      try { extra = JSON.parse(extraRaw); }
      catch (e) {
        alert("Extra must be valid JSON.");
        return null;
      }
    }

    return {
      name,
      provider,
      base_url,
      auth_ref,
      timeout_sec,
      extra
    };
  }

  function openModelModal(model) {
    modelEditingId = model?.id || null;
    closeWindow("modal_model_editor");

    spawnWindow({
      id: "modal_model_editor",
      title: modelEditingId ? "Edit LLM Model" : "New LLM Model",
      window_type: MODAL_WIN_TYPE,
      col: "right",
      modal: true,
      Elements: [
        { type: "text_field",  id: "model_id",      label: "ID (read-only)", placeholder: "(auto)", disabled: true },
        { type: "text_field",  id: "model_service", label: "Service ID",      placeholder: "", disabled: true },
        { type: "text_field",  id: "model_name",    label: "Name",           placeholder: "e.g., chat-gpt" },
        { type: "text_field",  id: "model_model",   label: "Model",          placeholder: "gpt-4" },
        { type: "text_field",  id: "model_mode",    label: "Mode",           placeholder: "optional" },
        { type: "text_area",   id: "model_extra",   label: "Extra (JSON)",   placeholder: "{}" },
        { type: "submit_button", id: "model_save",   text: "Save" },
        { type: "submit_button", id: "model_cancel", text: "Cancel" },
      ],
    });

    fillModelEditor(model || null);

    document.getElementById("model_save")?.addEventListener("click", async () => {
      const payload = gatherModelPayload();
      if (!payload) return;
      try {
        if (modelEditingId) {
          await sdk.llm.updateModel(modelEditingId, payload);
        } else {
          await sdk.llm.createModel(payload);
        }
      } catch (e) {
        alert("Save failed: " + (e.bodyText || e.message));
      } finally {
        closeWindow("modal_model_editor");
        await refreshModels();
      }
    });

    document.getElementById("model_cancel")?.addEventListener("click", () => closeWindow("modal_model_editor"));
  }

  function fillModelEditor(m) {
    setValue("model_id",      m?.id || "");
    setValue("model_service", currentSelection?.service_id || "");
    setValue("model_name",    m?.name || "");
    setValue("model_model",   m?.model || "");
    setValue("model_mode",    m?.mode || "");
    setValue("model_extra",   prettyJSON(m?.extra) || "");
  }

  function gatherModelPayload() {
    const service_id = currentSelection?.service_id;
    if (!service_id) {
      alert("Select a service first.");
      return null;
    }
    const name     = getValue("model_name").trim();
    const model    = getValue("model_model").trim();
    const mode     = orNull(getValue("model_mode").trim());
    const extraRaw = getValue("model_extra").trim();

    let extra = {};
    if (extraRaw) {
      try { extra = JSON.parse(extraRaw); }
      catch (e) {
        alert("Extra must be valid JSON.");
        return null;
      }
    }

    return { service_id, name, model, mode, extra };
  }

  function getValue(id)   { const el = document.getElementById(id); return el ? el.value : ""; }
  function setValue(id,v) { const el = document.getElementById(id); if (el) el.value = v; }
  function orNull(v)      { return v === "" ? null : v; }
  function prettyJSON(obj){
    try { return obj && Object.keys(obj).length ? JSON.stringify(obj, null, 2) : ""; }
    catch { return ""; }
  }
  function fmtDate(iso)   { try { return new Date(iso).toLocaleString(); } catch { return iso; } }

  refreshServices();
}
