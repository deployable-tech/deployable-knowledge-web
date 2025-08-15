// /app/main.js
import { initFramework } from "/static/ui/js/framework.js";
import { bus } from "/static/ui/js/components.js";
import { Store } from "./store.js";
import { createChatWindow } from "./windows/chat.js";
import { createDocsWindow, refreshDocs, handleDocAction } from "./windows/docs.js";
import { createSegmentsWindow, refreshSegments, handleSegmentAction, setSegmentsSource, openSegmentViewer } from "./windows/segments.js";
import { createSearchWindow } from "./windows/search.js";
import { openSessionsWindow, loadChatHistory } from "./windows/sessions.js";

import { openPersonaEditor } from "./windows/persona.js";
import { openPromptEditor } from "./windows/prompt.js";
import { openUISettings } from "./windows/ui_settings.js";
import { openLLMSettings } from "./windows/llm.js";
import { initMenu } from "/static/ui/js/menu.js";

initFramework();

function setDefaultLayout() {
  const cols = document.getElementById("columns");
  if (cols) cols.style.gridTemplateColumns = "1fr 4px 3fr";
}
setDefaultLayout();

async function ensureChatSession() {
  try {
    const res = await fetch("/session", { credentials: "same-origin" });
    const data = await res.json();
    Store.sessionId = data.session_id;
  } catch (e) {
    console.error("session", e);
  }
}

function registerBusHandlers() {
  bus.addEventListener("ui:list-action", async (ev) => {
    const { winId, elementId, action, item } = ev.detail || {};
    if (winId === "win_docs" && elementId === "doc_list") {
      await handleDocAction(action, item);
    }
    if (winId === "win_segments" && elementId === "segment_list") {
      await handleSegmentAction(action, item);
    }
    if (winId === "win_search" && elementId === "search_results" && action === "open" && item?.id) {
      await openSegmentViewer(item.id);
    }
    if (winId === "win_sessions" && elementId === "session_list" && action === "open" && item?.session_id) {
      Store.sessionId = item.session_id;
      await loadChatHistory(Store.sessionId);
    }
  });
  bus.addEventListener("ui:list-select", async (ev) => {
    const { winId, elementId, item } = ev.detail || {};
    if (winId === "win_docs" && elementId === "doc_list") {
      setSegmentsSource(item?.id);
      await refreshSegments();
    }
  });
}


// Header “Menu ▾”
initMenu((action) => {
  if (action === "toggle-search") {
    const existing = document.getElementById("win_search");
    if (existing) {
      existing.remove();
    } else {
      createSearchWindow();
    }
  }
  if (action === "prompt-templates") openPromptEditor();
  if (action === "settings") openUISettings();
  if (action === "llm-settings") openLLMSettings();
});

// Header “User ▾”
initMenu((action) => {
  if (action === "logout") window.location.href = "/logout";
}, "user-menu-trigger", "user-menu-dropdown");

// “Tools ▾”
initMenu((action) => {
  if (action === "tool-chat") {
    createChatWindow();
  }
  if (action === "tool-docs") {
    createDocsWindow();
  }
  if (action === "tool-sessions") {
    openSessionsWindow();
  }
  if (action === "tool-persona") {
    openPersonaEditor();
  }
  if (action === "tool-segments") {
    createSegmentsWindow();
  }
  if (action === "tool-refresh") {
    refreshDocs();
    refreshSegments();
  }
}, "tools-menu-trigger", "tools-menu-dropdown");



await ensureChatSession();
const chatUI = createChatWindow();
createSearchWindow();
createDocsWindow();
createSegmentsWindow();
await openSessionsWindow();
registerBusHandlers();
await refreshDocs();
await refreshSegments();
await loadChatHistory(Store.sessionId);
