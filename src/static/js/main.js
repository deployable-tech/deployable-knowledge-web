import { initFramework, spawnWindow } from "../../submodules/deployable-ui/src/ui/js/framework.js";
import { DKClient } from "./sdk.js";

function getCookie(name) {
  const m = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return m ? decodeURIComponent(m[2]) : null;
}

function setCookie(name, value, days = 365) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/`;
}

async function ensureSessionId(sdk) {
  let sid = getCookie('dk_session_id');
  if (!sid) {
    const { session_id } = await sdk.sessions.ensure();
    sid = session_id;
    setCookie('dk_session_id', sid);
  }
  return sid;
}

window.addEventListener("DOMContentLoaded", async () => {
  initFramework();

  const sdk = new DKClient({ baseUrl: "" });
  const sessionId = await ensureSessionId(sdk);
  let persona = "";

  // Chat window
  spawnWindow({
    id: "win_chat",
    title: "Chat",
    col: "right",
    window_type: "window_chat",
    onSend: async (text) => {
      const out = await sdk.chat.send({ sessionId, message: text, persona });
      return { role: "assistant", content: out.response };
    }
  });

  // Chat history window
  spawnWindow({
    id: "win_history",
    title: "Chat Sessions",
    col: "left",
    window_type: "window_generic",
    Elements: [
      { type: "list_view", id: "session_list", items: [], template: { title: it => it.id } }
    ]
  });
  async function refreshSessions() {
    const items = await sdk.sessions.list();
    document.getElementById("session_list").update({ items, template: { title: it => it.id } });
  }
  refreshSessions();

  // Document library window
  spawnWindow({
    id: "win_docs",
    title: "Document Library",
    col: "left",
    window_type: "window_generic",
    Elements: [
      { type: "file_upload", id: "doc_upload", label: "Upload", multiple: true,
        onUpload: async (files) => { await sdk.ingest.upload(files); refreshDocs(); } },
      { type: "list_view", id: "doc_list", items: [], template: { title: d => d.title, subtitle: d => `segments: ${d.segments}` } }
    ]
  });
  async function refreshDocs() {
    const docs = await sdk.documents.list();
    document.getElementById("doc_list").update({ items: docs });
  }
  refreshDocs();

  // DB Segments window
  spawnWindow({
    id: "win_segments",
    title: "DB Segments",
    col: "left",
    window_type: "window_generic",
    Elements: [
      { type: "list_view", id: "seg_list", items: [], template: { title: s => s.id, subtitle: s => s.source } }
    ]
  });
  async function refreshSegments() {
    const segs = await sdk.segments.list();
    document.getElementById("seg_list").update({ items: segs });
  }
  refreshSegments();

  // Semantic search window
  spawnWindow({
    id: "win_search",
    title: "Semantic Search",
    col: "right",
    window_type: "window_generic",
    Elements: [
      { type: "text_field", id: "search_q", label: "Query", placeholder: "Search..." },
      { type: "submit_button", id: "search_run", text: "Search" },
      { type: "list_view", id: "search_results", items: [], template: { title: r => r.source, subtitle: r => String(r.score) } }
    ]
  });
  document.getElementById("search_run").addEventListener("click", async () => {
    const q = document.getElementById("search_q").value;
    const res = await sdk.search.run({ q });
    document.getElementById("search_results").update({ items: res.results || [] });
  });

  // Persona editor window
  spawnWindow({
    id: "win_persona",
    title: "Persona Editor",
    col: "right",
    window_type: "window_generic",
    Elements: [
      { type: "text_area", id: "persona_text", label: "Persona", placeholder: "You are a helpful assistant." }
    ]
  });
  document.getElementById("persona_text").addEventListener("input", (e) => {
    persona = e.target.value;
  });

  // Prompt template editor
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
    document.getElementById("tpl_list").update({ items: tpls });
  }
  refreshTemplates();
  document.getElementById("tpl_save").addEventListener("click", async () => {
    const id = document.getElementById("tpl_id").value;
    const name = document.getElementById("tpl_name").value;
    const user_format = document.getElementById("tpl_user").value;
    const system = document.getElementById("tpl_system").value;
    if (id) {
      await sdk.templates.put(id, { id, name, user_format, system });
      refreshTemplates();
    }
  });

  // LLM settings window
  spawnWindow({
    id: "win_llm_settings",
    title: "LLM Settings",
    col: "right",
    window_type: "window_generic",
    Elements: [
      { type: "text_field", id: "llm_service", label: "Service" },
      { type: "text_field", id: "llm_model", label: "Model" },
      { type: "submit_button", id: "llm_save", text: "Save" }
    ]
  });
  async function loadSelection() {
    const sel = await sdk.llm.getSelection();
    document.getElementById("llm_service").value = sel.service_id || "";
    document.getElementById("llm_model").value = sel.model_id || "";
  }
  loadSelection();
  document.getElementById("llm_save").addEventListener("click", async () => {
    const service_id = document.getElementById("llm_service").value;
    const model_id = document.getElementById("llm_model").value;
    await sdk.llm.updateSelection({ service_id, model_id });
  });

  // LLM service management window
  spawnWindow({
    id: "win_llm_manage",
    title: "LLM Services",
    col: "left",
    window_type: "window_generic",
    Elements: [
      { type: "text_field", id: "svc_name", label: "Name" },
      { type: "text_field", id: "svc_type", label: "Type" },
      { type: "text_field", id: "svc_base", label: "Base URL" },
      { type: "text_field", id: "svc_key", label: "API Key" },
      { type: "submit_button", id: "svc_create", text: "Create" },
      { type: "list_view", id: "svc_list", items: [], template: { title: s => s.name, subtitle: s => s.type } }
    ]
  });
  async function refreshServices() {
    const svcs = await sdk.llm.listServices();
    document.getElementById("svc_list").update({ items: svcs });
  }
  refreshServices();
  document.getElementById("svc_create").addEventListener("click", async () => {
    const svc = {
      name: document.getElementById("svc_name").value,
      type: document.getElementById("svc_type").value,
      base_url: document.getElementById("svc_base").value,
      api_key: document.getElementById("svc_key").value
    };
    await sdk.llm.createService(svc);
    refreshServices();
  });
});
