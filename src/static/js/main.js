import { initFramework, spawnWindow } from "/static/ui/js/framework.js";
import { DKClient, ensureChatSessionId } from "/static/js/sdk.js";
import { initDocumentsWindow } from "./windows/documents.js";
import { initSegmentsWindow } from "./windows/segments.js";
import { initLLMServicesWindows } from "./windows/llm_services.js";

// ---- SDK SETUP ----
const API_BASE = `${location.protocol}//${location.hostname}:8000`;
const sdk = new DKClient({ baseUrl: API_BASE });

// ---- COOKIE HELPERS ----
function getCookie(name) {
  const m = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return m ? decodeURIComponent(m[2]) : null;
}
function setCookie(name, value, days = 365) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/`;
}

// ---- SESSION ENSURE ----
async function ensureSessionId(sdk) {
  let sid = getCookie('dk_session_id');
  if (!sid) {
    const { session_id } = await sdk.sessions.ensure();
    sid = session_id;
    setCookie('dk_session_id', sid);
  }
  return sid;
}
  // now ensure chat session
  const sessionId = await ensureSessionId(sdk);
  let persona = "";


// ---- APP INIT ----
window.addEventListener("DOMContentLoaded", async () => {
  initFramework();
  // ... after session/persona init

  initDocumentsWindow({ sdk, sessionId, persona, spawnWindow });
  initSegmentsWindow({ sdk, sessionId, persona, spawnWindow });
  // 🔑 make sure user session cookie exists before anything else
  await sdk.auth.beginUser();

  // ... 👇 all your existing spawnWindow logic remains unchanged ...
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

  // // Document library window
  // spawnWindow({
  //   id: "win_docs",
  //   title: "Document Library",
  //   col: "left",
  //   window_type: "window_generic",
  //   Elements: [
  //     { type: "file_upload", id: "doc_upload", label: "Upload", multiple: true,
  //       onUpload: async (files) => { await sdk.ingest.upload(files); refreshDocs(); } },
  //     { type: "list_view", id: "doc_list", items: [], template: { title: d => d.title, subtitle: d => `segments: ${d.segments}` } }
  //   ]
  // });
  // async function refreshDocs() {
  //   const docs = await sdk.documents.list();
  //   document.getElementById("doc_list").update({ items: docs });
  // }
  // refreshDocs();

  // // DB Segments window
  // spawnWindow({
  //   id: "win_segments",
  //   title: "DB Segments",
  //   col: "left",
  //   window_type: "window_generic",
  //   Elements: [
  //     { type: "list_view", id: "seg_list", items: [], template: { title: s => s.id, subtitle: s => s.source } }
  //   ]
  // });
  // async function refreshSegments() {
  //   const segs = await sdk.segments.list();
  //   document.getElementById("seg_list").update({ items: segs });
  // }
  // refreshSegments();

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
initLLMServicesWindows({ sdk, spawnWindow });
});
