// /app/main.js
import { initFramework, spawnWindow  } from "/static/ui/js/framework.js";
import { bus } from "/static/ui/js/components.js";
import { Store } from "./store.js";
import { createChatWindow } from "./windows/chat.js";
import { createDocsWindow, refreshDocs, handleDocAction } from "./windows/docs.js";
import { createSegmentsWindow, refreshSegments, handleSegmentAction, setSegmentsSource, openSegmentViewer } from "./windows/segments.js";
import { createSearchWindow } from "./windows/search.js";
import { openSessionsWindow, loadChatHistory } from "./windows/sessions.js";

import { openPersonaEditor } from "./windows/persona.js";
import { initMenu } from "/static/ui/js/menu.js";

initFramework();

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
initMenu(async (action) => {
  if (action === "new-chat") {
    Store.sessionId = await api.startNewSession();
    initSessionsController("win_sessions");
  }
  if (action === "toggle-search") {
    const id = "win_search";
    const existing = document.getElementById(id);
    if (existing) {
      existing.remove();
    } else {
      spawnWindow({ id, window_type: "window_search", title: "Search Documents", col: "right", unique: true });
      initSearchController(id);
      if (Store.lastQuery) runSearch(Store.lastQuery, id);
    }
  }
  if (action === "edit-persona") openPersonaModal();
  if (action === "settings")     openSettingsModal();
  if (action === "prompt-templates") openPromptEditor();
});

// Header “User ▾”
initMenu((action) => {
  if (action === "logout") window.location.href = "/logout";
}, "user-menu-trigger", "user-menu-dropdown");

// “Tools ▾”
initMenu((action) => {
  if (action === "tool-chat") {
    spawnWindow({ id: "win_chat", window_type: "window_chat_ui", title: "Assistant Chat", col: "right", unique: true });
    initChatController();
  }
  if (action === "tool-docs") {
    spawnWindow({ id: "win_docs", window_type: "window_documents", title: "Document Library", col: "left", unique: true });
    initDocsController("win_docs");
  }
  if (action === "tool-sessions") {
   openSessionsWindow();              
  }
  if (action === "tool-segments") {
    spawnWindow({ id: "win_segments", window_type: "window_segments", title: "DB Segments", col: "right", unique: true });
    initSegmentsController("win_segments");
  }
}, "tools-menu-trigger", "tools-menu-dropdown");



await ensureChatSession();
const chatUI = createChatWindow();
createSearchWindow();
createDocsWindow();
createSegmentsWindow();
registerBusHandlers();
await refreshDocs();
await refreshSegments();
await loadChatHistory(Store.sessionId);
