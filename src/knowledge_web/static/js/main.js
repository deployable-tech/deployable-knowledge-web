import { initWindowDnD } from "/static/ui/js/dnd.js";
import { initSplitter } from "/static/ui/js/splitter.js";
import { createMiniWindowFromConfig, initWindowResize } from "/static/ui/js/window.js";

// basic UI initialisation
initSplitter();
initWindowDnD();
initWindowResize();

function spawnWindow(cfg) {
  const node = createMiniWindowFromConfig(cfg);
  const col = document.getElementById(cfg.col === "right" ? "col-right" : "col-left");
  col.appendChild(node);
  return node;
}

async function apiGet(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`request failed: ${path}`);
  return res.json();
}

let chatWin = null;

function spawnChatWindow(history = []) {
  if (chatWin) chatWin.remove();
  chatWin = spawnWindow({
    id: "chat_window",
    window_type: "window_chat",
    title: "Chat",
    col: "right",
    dockable: true,
    resizable: true,
    history,
    onSend: async (text) => ({ role: "assistant", content: `Echo: ${text}` })
  });
}

async function loadSession(sessionId) {
  const data = await apiGet(`/sessions/${sessionId}`);
  const history = [];
  for (const [u, a] of data.history) {
    history.push({ role: "user", content: u });
    history.push({ role: "assistant", content: a });
  }
  spawnChatWindow(history);
}

async function loadSessions() {
  const sessions = await apiGet("/sessions");
  spawnWindow({
    id: "sessions_window",
    window_type: "window_generic",
    title: "Sessions",
    col: "left",
    resizable: true,
    Elements: [
      {
        type: "list_view",
        id: "sessions_list",
        items: sessions,
        keyField: "session_id",
        template: {
          title: (it) => it.title,
          subtitle: (it) => new Date(it.created_at).toLocaleString(),
          actions: [
            { label: "Open", onClick: (item) => loadSession(item.session_id) }
          ]
        }
      }
    ]
  });
}

async function loadDocuments() {
  const docs = await apiGet("/documents");
  spawnWindow({
    id: "documents_window",
    window_type: "window_generic",
    title: "Documents",
    col: "left",
    resizable: true,
    Elements: [
      {
        type: "list_view",
        id: "documents_list",
        items: docs,
        keyField: "id",
        template: {
          title: (it) => it.title,
          subtitle: (it) => `${it.segments} segments`
        }
      }
    ]
  });
}

async function openSegment(id) {
  const seg = await apiGet(`/segments/${id}`);
  spawnWindow({
    id: `segment_${id}`,
    window_type: "window_text_editor",
    title: seg.source,
    col: "right",
    dockable: true,
    resizable: true,
    content: seg.text,
    onSave: ({ id, content }) => console.log("save", id, content)
  });
}

async function loadSegments() {
  const segs = await apiGet("/segments");
  spawnWindow({
    id: "segments_window",
    window_type: "window_generic",
    title: "Segments",
    col: "right",
    resizable: true,
    Elements: [
      {
        type: "list_view",
        id: "segments_list",
        items: segs,
        keyField: "id",
        template: {
          title: (it) => it.source,
          subtitle: (it) => it.preview,
          actions: [
            { label: "Open", onClick: (item) => openSegment(item.id) }
          ]
        }
      }
    ]
  });
}

// initial windows
spawnChatWindow();
loadSessions();
loadDocuments();
loadSegments();

