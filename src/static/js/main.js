import { initFramework, spawnWindow } from "/static/ui/js/framework.js";
import { DKClient } from "/static/js/sdk.js";
import { initDocumentsWindow } from "./windows/documents.js";
import { initSegmentsWindow } from "./windows/segments.js";
import { initLLMServicesWindows } from "./windows/llm_services.js";
import { initChatWindow } from "./windows/chat.js";
import { initSessionsWindow } from "./windows/sessions.js";
import { initPersonaWindow } from "./windows/persona.js";
import { initTemplatesWindow } from "./windows/templates.js";

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
let llmSelection = null;

// ---- APP INIT ----
window.addEventListener("DOMContentLoaded", async () => {
  initFramework();
  // ensure user session cookie exists before anything else
  await sdk.auth.beginUser();
  llmSelection = await sdk.llm.getSelection().catch(() => null);

  document.getElementById("menu-chat")?.addEventListener("click", (e) => {
    e.preventDefault();
    initChatWindow({ sdk, sessionId, getPersona: () => persona, getLLMSelection: () => llmSelection, spawnWindow });
  });

  document.getElementById("menu-chat-history")?.addEventListener("click", (e) => {
    e.preventDefault();
    initSessionsWindow({ sdk, spawnWindow });
  });

  document.getElementById("menu-docs")?.addEventListener("click", (e) => {
    e.preventDefault();
    initDocumentsWindow({ sdk, spawnWindow });
  });

  document.getElementById("menu-segments")?.addEventListener("click", (e) => {
    e.preventDefault();
    initSegmentsWindow({ sdk, spawnWindow });
  });

  document.getElementById("menu-llm")?.addEventListener("click", (e) => {
    e.preventDefault();
    initLLMServicesWindows({ sdk, spawnWindow, onSelectionChange: (sel) => { llmSelection = sel; } });
  });

  document.getElementById("menu-templates")?.addEventListener("click", (e) => {
    e.preventDefault();
    initTemplatesWindow({ sdk, spawnWindow });
  });

  document.getElementById("menu-persona")?.addEventListener("click", (e) => {
    e.preventDefault();
    initPersonaWindow({
      spawnWindow,
      initialPersona: persona,
      onChange: (v) => {
        persona = v;
      },
    });
  });
});
