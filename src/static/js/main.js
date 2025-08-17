import { initFramework, spawnWindow } from "/static/ui/js/framework.js";
import { DKClient, ensureChatSessionId } from "/static/js/sdk.js";
import { initDocumentsWindow } from "./windows/documents.js";
import { initSegmentsWindow } from "./windows/segments.js";
import { initLLMServicesWindows } from "./windows/llm_services.js";
import { initChatWindow } from "./windows/chat.js";
import { initSessionsWindow } from "./windows/sessions.js";
import { initSearchWindow } from "./windows/search.js";
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


// ---- APP INIT ----
window.addEventListener("DOMContentLoaded", async () => {
  initFramework();
  // ... after session/persona init

  initDocumentsWindow({ sdk, spawnWindow });
  initSegmentsWindow({ sdk, spawnWindow });
  // make sure user session cookie exists before anything else
  await sdk.auth.beginUser();

  initChatWindow({ sdk, sessionId, getPersona: () => persona, spawnWindow });
  initSessionsWindow({ sdk, spawnWindow });
  initSearchWindow({ sdk, spawnWindow });
  initPersonaWindow({ spawnWindow, initialPersona: persona, onChange: (v) => { persona = v; } });
  initTemplatesWindow({ sdk, spawnWindow });
  initLLMServicesWindows({ sdk, spawnWindow });
});
