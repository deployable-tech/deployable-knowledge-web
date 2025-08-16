// /app/sdk.js
const JSON_HEADERS = { Accept: "application/json" };

function csrfHeader() {
  const m = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]+)/);
  return m ? { 'X-CSRF-Token': decodeURIComponent(m[1]) } : {};
}

async function ok(res) {
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res;
}
async function asJsonSafe(res) {
  const ct = res.headers.get("content-type") || "";
  const txt = await res.text();
  if (ct.includes("application/json")) { try { return JSON.parse(txt); } catch {} }
  const lines = txt.split(/\r?\n/).filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i--) { try { return JSON.parse(lines[i]); } catch {} }
  return { response: txt };
}

async function fetchJson(url, opts = {}) {
  const res = await ok(
    await fetch(url, {
      headers: {
        ...JSON_HEADERS,
        "Content-Type": "application/json",
        ...csrfHeader(),
        ...(opts.headers || {}),
      },
      credentials: "same-origin",
      ...opts,
    })
  );
  return asJsonSafe(res);
}

export async function listDocuments() {
  const res = await ok(await fetch("/documents", { headers: { ...JSON_HEADERS, ...csrfHeader() }, credentials: "same-origin" }));
  return asJsonSafe(res);
}
export async function uploadDocuments(files) {
  const fd = new FormData();
  for (const f of files) fd.append("files", f);
  const res = await ok(await fetch("/upload", { method: "POST", body: fd, credentials: "same-origin", headers: csrfHeader() }));
  return asJsonSafe(res);
}
export async function removeDocument(source) {
  const fd = new FormData();
  fd.append("source", source);
  const res = await ok(await fetch("/remove", { method: "POST", body: fd, credentials: "same-origin", headers: csrfHeader() }));
  return asJsonSafe(res);
}

// in /app/sdk.js
export async function listSegments(source) {
  const url = source ? `/segments?source=${encodeURIComponent(source)}` : `/segments`;
  const res = await fetch(url, { headers: { Accept: "application/json", ...csrfHeader() }, credentials: "same-origin" });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return await res.json();
}
export async function getSegment(id) {
  const res = await fetch(`/segments/${encodeURIComponent(id)}`, { headers: { Accept: "application/json", ...csrfHeader() }, credentials: "same-origin" });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return await res.json();
}
export async function removeSegment(id) {
  const res = await fetch(`/segments/${encodeURIComponent(id)}`, { method: "DELETE", headers: { Accept: "application/json", ...csrfHeader() }, credentials: "same-origin" });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return await res.json();
}
// --- chat (non-stream) ---
export async function chat({ message, session_id, persona = "", inactive = [], model = "", service_id = "" }) {
  const fd = new FormData();
  fd.append("message", message);
  fd.append("session_id", session_id);
  fd.append("persona", persona);
  fd.append("inactive", JSON.stringify(inactive));
  if (model) fd.append("model", model);
  if (service_id) fd.append("service_id", service_id);
  const res = await fetch(`/chat?stream=false`, {
    method: "POST",
    body: fd,
    headers: { "Accept": "application/json", ...csrfHeader() },
    credentials: "same-origin"
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return await res.json(); // { response, sources? }
}

// --- chat (streaming SSE-ish via fetch body reader) ---
export async function chatStream({ message, session_id, persona = "", inactive = [], model = "", service_id = "" }) {
  const params = new URLSearchParams();
  params.set("message", message);
  params.set("session_id", session_id);
  params.set("persona", persona);
  if (inactive?.length) params.set("inactive", JSON.stringify(inactive));
  if (model) params.set("model", model);
  if (service_id) params.set("service_id", service_id);

  const res = await fetch(`/chat?stream=true`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8", "Accept": "*/*", ...csrfHeader() },
    body: params.toString(),
    credentials: "same-origin",
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  if (!res.body) throw new Error("No response body");
  const reader = res.body.getReader();
  const decoder = new TextDecoder("utf-8");
  return { reader, decoder };
}

// simple search (segments by text)
export async function searchSegments({ q, top_k = 10, inactive = [] }) {
  const params = new URLSearchParams();
  params.set("q", q);
  params.set("top_k", String(top_k));
  if (inactive?.length) params.set("inactive", JSON.stringify(inactive));
  const res = await fetch(`/search?${params.toString()}`, {
    headers: { Accept: "application/json", ...csrfHeader() }, credentials: "same-origin"
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return await res.json(); // array of segments or {results:[...]}
}

// --- sessions (basic) -------------------------------------------------------

export async function listSessions() {
  const res = await fetch(`/sessions`, {
    headers: { Accept: "application/json", ...csrfHeader() },
    credentials: "same-origin",
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return await res.json(); // [{ id, title, created_at, ... }]
}

export async function getSession(session_id) {
  const res = await fetch(`/sessions/${encodeURIComponent(session_id)}`, {
    headers: { Accept: "application/json", ...csrfHeader() },
    credentials: "same-origin",
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return await res.json(); // { session_id, created_at, title, summary, history | messages, ... }
}

// ---- LLM service/model registry -------------------------------------------

function uuid() {
  if (crypto?.randomUUID) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const LLM_LS_SERVICES = "llm.services";
const LLM_LS_MODELS = "llm.models";
const LLM_LS_SELECTION = "llm.selection";
// Default to using the real API unless explicitly overridden via localStorage
const LLM_USE_MOCK = (localStorage.getItem("llm.mock") || "false") === "true";

function seedMock() {
  if (!LLM_USE_MOCK) return;
  if (localStorage.getItem(LLM_LS_SERVICES)) return;
  const s1 = {
    id: uuid(),
    name: "openai-prod",
    provider: "openai",
    base_url: null,
    auth_ref: null,
    timeout_sec: null,
    is_enabled: true,
    extra: {},
    created_at: new Date().toISOString(),
  };
  const s2 = {
    id: uuid(),
    name: "ollama-local",
    provider: "ollama",
    base_url: "http://127.0.0.1:11434",
    auth_ref: null,
    timeout_sec: 60,
    is_enabled: true,
    extra: {},
    created_at: new Date().toISOString(),
  };
  const m1 = {
    id: uuid(),
    service_id: s1.id,
    name: "gpt-4o",
    modality: null,
    context_window: null,
    supports_tools: false,
    extra: {},
    created_at: new Date().toISOString(),
  };
  const m2 = {
    id: uuid(),
    service_id: s2.id,
    name: "llama3:8b",
    modality: "chat",
    context_window: 8192,
    supports_tools: false,
    extra: {},
    created_at: new Date().toISOString(),
  };
  localStorage.setItem(LLM_LS_SERVICES, JSON.stringify([s1, s2]));
  localStorage.setItem(LLM_LS_MODELS, JSON.stringify([m1, m2]));
  localStorage.setItem(
    LLM_LS_SELECTION,
    JSON.stringify({ service_id: s1.id, model_id: m1.id })
  );
}
seedMock();

function loadServices() {
  return JSON.parse(localStorage.getItem(LLM_LS_SERVICES) || "[]");
}
function saveServices(list) {
  localStorage.setItem(LLM_LS_SERVICES, JSON.stringify(list));
}
function loadModels() {
  return JSON.parse(localStorage.getItem(LLM_LS_MODELS) || "[]");
}
function saveModels(list) {
  localStorage.setItem(LLM_LS_MODELS, JSON.stringify(list));
}
function loadSelection() {
  return JSON.parse(
    localStorage.getItem(LLM_LS_SELECTION) ||
      JSON.stringify({ service_id: null, model_id: null })
  );
}
function saveSelection(sel) {
  localStorage.setItem(LLM_LS_SELECTION, JSON.stringify(sel));
}
function emit(name, detail) {
  window.dispatchEvent(new CustomEvent(name, { detail }));
}

async function mockListServices() {
  const list = loadServices();
  emit("llm:services:updated", list);
  return list;
}
async function mockCreateService(payload) {
  const list = loadServices();
  const svc = {
    id: uuid(),
    is_enabled: true,
    extra: {},
    created_at: new Date().toISOString(),
    ...payload,
  };
  list.push(svc);
  saveServices(list);
  emit("llm:services:updated", list);
  return svc;
}
async function mockUpdateService(id, patch) {
  const list = loadServices();
  const svc = list.find((s) => s.id === id);
  if (!svc) throw new Error("service not found");
  Object.assign(svc, patch);
  saveServices(list);
  emit("llm:services:updated", list);
  return svc;
}
async function mockDeleteService(id) {
  let list = loadServices();
  list = list.filter((s) => s.id !== id);
  saveServices(list);
  let models = loadModels();
  models = models.filter((m) => m.service_id !== id);
  saveModels(models);
  emit("llm:services:updated", list);
  emit("llm:models:updated", { service_id: id, models: [] });
  const sel = loadSelection();
  if (sel.service_id === id) {
    saveSelection({ service_id: null, model_id: null });
    emit("llm:selection:changed", loadSelection());
  }
  return { ok: true };
}
async function mockListModels(service_id) {
  const models = loadModels().filter((m) => m.service_id === service_id);
  emit("llm:models:updated", { service_id, models });
  return models;
}
async function mockCreateModel(payload) {
  const list = loadModels();
  const mdl = {
    id: uuid(),
    supports_tools: false,
    extra: {},
    created_at: new Date().toISOString(),
    ...payload,
  };
  list.push(mdl);
  saveModels(list);
  const models = list.filter((m) => m.service_id === payload.service_id);
  emit("llm:models:updated", { service_id: payload.service_id, models });
  return mdl;
}
async function mockUpdateModel(id, patch) {
  const list = loadModels();
  const mdl = list.find((m) => m.id === id);
  if (!mdl) throw new Error("model not found");
  Object.assign(mdl, patch);
  saveModels(list);
  const models = list.filter((m) => m.service_id === mdl.service_id);
  emit("llm:models:updated", { service_id: mdl.service_id, models });
  return mdl;
}
async function mockDeleteModel(id) {
  let list = loadModels();
  const mdl = list.find((m) => m.id === id);
  list = list.filter((m) => m.id !== id);
  saveModels(list);
  if (mdl) {
    const models = list.filter((m) => m.service_id === mdl.service_id);
    emit("llm:models:updated", { service_id: mdl.service_id, models });
    const sel = loadSelection();
    if (sel.model_id === id) {
      saveSelection({ ...sel, model_id: null });
      emit("llm:selection:changed", loadSelection());
    }
  }
  return { ok: true };
}
async function mockGetSelection() {
  return loadSelection();
}
async function mockSetSelection(sel) {
  const current = loadSelection();
  const next = {
    service_id: sel.service_id ?? current.service_id,
    model_id: sel.model_id ?? current.model_id,
  };
  saveSelection(next);
  emit("llm:selection:changed", next);
  return next;
}

export const llm = {
  useMock: LLM_USE_MOCK,
  async listServices() {
    if (this.useMock) return mockListServices();
    return fetchJson("/api/llm/services");
  },
  async createService(payload) {
    if (this.useMock) return mockCreateService(payload);
    return fetchJson("/api/llm/services", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  async updateService(id, patch) {
    if (this.useMock) return mockUpdateService(id, patch);
    return fetchJson(`/api/llm/services/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(patch),
    });
  },
  async deleteService(id) {
    if (this.useMock) return mockDeleteService(id);
    return fetchJson(`/api/llm/services/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  },
  async listModels(service_id) {
    if (this.useMock) return mockListModels(service_id);
    return fetchJson(`/api/llm/models?service_id=${encodeURIComponent(service_id)}`);
  },
  async createModel(payload) {
    if (this.useMock) return mockCreateModel(payload);
    return fetchJson("/api/llm/models", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  async updateModel(id, patch) {
    if (this.useMock) return mockUpdateModel(id, patch);
    return fetchJson(`/api/llm/models/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(patch),
    });
  },
  async deleteModel(id) {
    if (this.useMock) return mockDeleteModel(id);
    return fetchJson(`/api/llm/models/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  },
  async getSelection() {
    if (this.useMock) return mockGetSelection();
    return fetchJson("/api/llm/selection");
  },
  async setSelection(sel) {
    if (this.useMock) return mockSetSelection(sel);
    const res = await fetchJson("/api/llm/selection", {
      method: "PUT",
      body: JSON.stringify(sel),
    });
    emit("llm:selection:changed", res);
    return res;
  },
  onSelectionChange(cb) {
    window.addEventListener("llm:selection:changed", (e) => cb(e.detail));
  },
};
