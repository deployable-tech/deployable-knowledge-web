// src/ui-compat/windows.js
import { el } from "/ui/js/ui.js";
import { registerComponent, createItemList, bus } from "/ui/js/components.js";
import { registerWindowType as _registerWindowType } from "/ui/js/window.js";

// Local registry so we can spawn windows without relying on the lib's createWindow
const _compatRegistry = new Map();
function registerWindowType(name, renderer) {
  _registerWindowType(name, renderer);       // still register with the lib for consistency
  _compatRegistry.set(name, renderer);       // …and with us so we can spawn reliably
}

// Generic container shell
function _makeShell(title, bodyEl) {
  const wrap = el("div", { class: "window" });
  const bar  = el("div", { class: "titlebar" }, [ title || "Window" ]);
  const body = bodyEl;
  wrap.append(bar, body);
  return wrap;
}

// Public: createWindow(type, cfg, winId)
export function createWindow(type, cfg = {}, winId) {
  const renderer = _compatRegistry.get(type);
  if (!renderer) throw new Error(`Unknown window type: ${type}`);
  const body = renderer(cfg, winId);
  const title = cfg.title || body?.getAttribute?.("data-window-title") || type;
  return _makeShell(title, body);
}

/* ---------------------- Window renderers below ---------------------- */


// Chat window (legacy name: window_chat_ui)
function renderChatWindow(cfg = {}, winId) {
  const title = cfg.title || "Assistant Chat";
  const log = el("div", { class: "chat-log", id: `${winId}-chat-log`, style: { height: "calc(100% - 52px)", overflow: "auto", padding: "8px" } });
  const input = el("textarea", { class: "chat-input", id: `${winId}-chat-input`, rows: 2, placeholder: "Type your message..." });
  const send = el("button", { class: "btn", id: `${winId}-chat-send` }, ["Send"]);
  const bar = el("div", { class: "chat-bar", style: { display: "flex", gap: "8px", alignItems: "center", padding: "8px", borderTop: "1px solid var(--panel-border)" }}, [input, send]);
  const root = el("div", { class: "window-body", "data-window-title": title, style: { display: "flex", flexDirection: "column", height: "100%" }}, [log, bar]);

  registerComponent(winId, "chat", {
    append(role, text) {
      const bubble = el("div", { class: `bubble ${role}` }, [
        el("div", { class: "role" }, [role === "user" ? "You" : "Assistant"]),
        el("div", { class: "text" }, [text])
      ]);
      log.appendChild(bubble);
      log.scrollTop = log.scrollHeight;
    },
    clear() { log.innerHTML = ""; },
    getValue() { return input.value.trim(); },
    setValue(v) { input.value = v ?? ""; },
    getSendButton() { return send; },
    getInput() { return input; },
    getLog() { return log; },
  });

  send.addEventListener("click", () => {
    const detail = { winId, value: input.value };
    bus.dispatchEvent(new CustomEvent("chat:send", { detail }));
  });

  return root;
}
registerWindowType("window_chat_ui", renderChatWindow);



// Documents window
function renderDocumentsWindow(cfg = {}, winId) {
  const listEl = el("div", { id: `${winId}-doc-list` });
  const root = el("div", {
    class: "window-body",
    "data-window-title": cfg.title || "Documents",
    style: { height: "100%", overflow: "auto", padding: "8px" }
  }, [listEl]);

  const list = createItemList(winId, {
    target: listEl,
    id: "documents",
    keyField: "id",
    item_template: {
      title: (it) => it.title || it.id,
      meta:  (it) => `${(it.segments ?? 0)} segments`,
      actions: [{ id: "open", label: "Open" }, { id: "toggle", label: "Toggle" }],
    }
  });
  registerComponent(winId, "documents", list);
  return root;
}
registerWindowType("window_documents", renderDocumentsWindow);

// Sessions window
function renderSessionsWindow(cfg = {}, winId) {
  const listEl = el("div", { id: `${winId}-session-list` });
  const root = el("div", {
    class: "window-body",
    "data-window-title": cfg.title || "Chat History",
    style: { height: "100%", overflow: "auto", padding: "8px" }
  }, [listEl]);

  const list = createItemList(winId, {
    target: listEl,
    id: "sessions",
    keyField: "session_id",
    item_template: {
      title: (it) => it.title || it.session_id,
      meta:  (it) => it.created_at || "",
      actions: [{ id: "open", label: "Open" }],
    }
  });
  registerComponent(winId, "sessions", list);
  return root;
}
registerWindowType("window_sessions", renderSessionsWindow);



// Segments window
function renderSegmentsWindow(cfg = {}, winId) {
  const listEl = el("div", { id: `${winId}-segments-list` });
  const root = el("div", {
    class: "window-body",
    "data-window-title": cfg.title || "DB Segments",
    style: { height: "100%", overflow: "auto", padding: "8px" }
  }, [listEl]);

  const list = createItemList(winId, {
    target: listEl,
    id: "segments",
    keyField: "id",
    item_template: {
      title: (it) => it.source || "(unknown)",
      subtitle: (it) => it.preview || "",
      badges: (it) => it.priority ? [it.priority] : [],
      actions: [{ id: "open", label: "Open" }, { id: "remove", label: "Remove" }],
    }
  });
  registerComponent(winId, "segments", list);
  return root;
}
registerWindowType("window_segments", renderSegmentsWindow);

// Segment viewer
function renderSegmentViewWindow(cfg = {}, winId) {
  const title = cfg.title || "Segment";
  const content = el("pre", { id: `${winId}-segment-text`, style: { whiteSpace: "pre-wrap" } });
  registerComponent(winId, "segment", { setText: (t) => content.textContent = t ?? "" });
  return el("div", {
    class: "window-body",
    "data-window-title": title,
    style: { height: "100%", overflow: "auto", padding: "8px" }
  }, [content]);
}

registerWindowType("window_segment_view", renderSegmentViewWindow);

// Persona
function renderPersonaWindow(cfg = {}, winId) {
  const ta = el("textarea", { style: { width: "100%", height: "100%", resize: "none" }, placeholder: "Write your persona prompt here..." });
  registerComponent(winId, "persona", { getValue: () => ta.value, setValue: (v) => ta.value = v ?? "" });
  return el("div", {
    class: "window-body",
    "data-window-title": cfg.title || "Persona",
    style: { height: "100%", padding: "8px" }
  }, [ta]);
}

registerWindowType("window_persona", renderPersonaWindow);

// Prompt editor
// Prompt editor
function renderPromptEditorWindow(cfg = {}, winId) {
  const ta = el("textarea", { style: { width: "100%", height: "100%", resize: "none" }, placeholder: "Template content..." });
  registerComponent(winId, "prompt_editor", { getValue: () => ta.value, setValue: (v) => ta.value = v ?? "" });
  return el("div", {
    class: "window-body",
    "data-window-title": cfg.title || "Prompt Editor",
    style: { height: "100%", padding: "8px" }
  }, [ta]);
}

registerWindowType("window_prompt_editor", renderPromptEditorWindow);

// Search
function renderSearchWindow(cfg = {}, winId) {
  const listEl = el("div", { id: `${winId}-search-results` });
  const list = createItemList(winId, {
    target: listEl,
    id: "search_results",
    keyField: "id",
    item_template: { title: (it) => it.title || it.id || "result", subtitle: (it) => it.snippet || "", actions: [{ id: "open", label: "Open" }] }
  });
  registerComponent(winId, "search_results", list);
  return el("div", {
    class: "window-body",
    "data-window-title": cfg.title || "Search",
    style: { height: "100%", padding: "8px", overflow: "auto" }
  }, [listEl]);
}
registerWindowType("window_search", renderSearchWindow);
