import { initFramework, spawnWindow } from "/static/ui/js/framework.js";
import { DKClient } from "/static/js/sdk.js";
import { getSessionId, setSessionId } from "./state.js";
import { createDocumentsWindow } from "./windows/documents.js";
import { createSegmentsWindow } from "./windows/segments.js";
import { createLLMServicesWindow } from "./windows/llm_services.js";
import { createChatWindow } from "./windows/chat.js";
import { initSessionsWindow } from "./windows/sessions.js";
import { initPersonaWindow } from "./windows/persona.js";
import { initTemplatesWindow } from "./windows/templates.js";

const API_BASE = `${location.protocol}//${location.hostname}:8000`;
const sdk = new DKClient({ baseUrl: API_BASE });

async function ensureSessionId() {
  let sid = getSessionId();
  if (!sid) {
    const { session_id } = await sdk.sessions.ensure();
    sid = session_id;
    setSessionId(sid);
  }
  return sid;
}

let sessionId = await ensureSessionId();
let persona = "";

window.addEventListener("DOMContentLoaded", async () => {
  initFramework();
  await sdk.auth.beginUser();

  const openChat = () => createChatWindow();

  const startNewChat = async () => {
    const { session_id } = await sdk.sessions.create();
    sessionId = session_id;
    setSessionId(sessionId);
    openChat();
  };

  const openHistory = () => {
    initSessionsWindow({
      sdk,
      spawnWindow,
      onSelect: (s) => {
        sessionId = s.session_id;
        setSessionId(sessionId);
        openChat();
      },
      onNewChat: async () => { await startNewChat(); }
    });
  };

  document.getElementById("menu-chat")?.addEventListener("click", (e) => {
    e.preventDefault();
    openChat();
  });

  document.getElementById("menu-new-chat")?.addEventListener("click", async (e) => {
    e.preventDefault();
    await startNewChat();
  });

  document.getElementById("menu-chat-history")?.addEventListener("click", (e) => {
    e.preventDefault();
    openHistory();
  });

  document.getElementById("menu-docs")?.addEventListener("click", (e) => {
    e.preventDefault();
    createDocumentsWindow();
  });

  document.getElementById("menu-segments")?.addEventListener("click", (e) => {
    e.preventDefault();
    createSegmentsWindow();
  });

  document.getElementById("menu-llm")?.addEventListener("click", (e) => {
    e.preventDefault();
    createLLMServicesWindow();
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
