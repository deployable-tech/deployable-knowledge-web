// sessions.js — chat history window (SDK-backed)
import { spawnWindow } from "/static/ui/js/framework.js";
import { getComponent } from "/static/ui/js/components.js";
import { md } from "../util.js";
import { listSessions, getSession } from "../sdk.js";

/* ---------- Public API ---------- */

export async function openSessionsWindow() {
  // Create the window once
  if (!document.getElementById("win_sessions")) {
    spawnWindow({
      id: "win_sessions",
      window_type: "window_generic",
      title: "Chat History",
      col: "left",
      unique: true,
      resizable: true,
      Elements: [
        {
          type: "item_list",
          id: "session_list",
          label: "Sessions",
          item_template: {
            elements: [
              { type: "text", bind: "title", class: "li-title" },
              { type: "text", bind: "created_at", class: "li-meta" },
              { type: "button", label: "Open", action: "open" }
            ]
          }
        }
      ]
    });

    // Delegate: capture clicks in the sessions window
    const win = document.getElementById("win_sessions");
    win.addEventListener("click", (e) => {
      const btn = e.target.closest("button");
      if (!btn) return;

      const isOpen =
        (btn.dataset && btn.dataset.action === "open") ||
        btn.textContent?.trim().toLowerCase() === "open";
      if (!isOpen) return;

      const row =
        btn.closest("[data-id]") ||
        btn.closest("[data-sid]") ||
        btn.closest("[data-index], [data-item-index]");

      let sessionId = row?.dataset?.id || row?.dataset?.sid;

      if (!sessionId) {
        const idx = row?.dataset?.index ?? row?.dataset?.itemIndex;
        const comp = getComponent("win_sessions", "session_list");
        const items = comp?.getItems ? comp.getItems() : comp?.items;
        if (Array.isArray(items) && idx != null) {
          const item = items[Number(idx)];
          sessionId = item?.id || item?.session_id || item?.uuid;
        }
      }

      if (!sessionId) {
        const probe = btn.closest("[data-sid]") || btn.querySelector("[data-sid]");
        sessionId = probe?.dataset?.sid;
      }

      if (typeof sessionId === "string" && sessionId.length > 0) {
        loadChatHistory(sessionId);
      } else {
        console.warn("Open session: no valid sessionId found", { row, btn });
      }
    });
  }

  await refreshSessions();
}

export async function refreshSessions() {
  let data = [];
  try {
    data = await listSessions();
  } catch (e) {
    console.warn("listSessions failed:", e);
    return;
  }

  const comp = getComponent("win_sessions", "session_list");
  if (comp && Array.isArray(data)) {
    comp.render(
      data.map((it) => ({
        ...it,
      }))
    );
  }
}

/* ---------- Load history into the chat window ---------- */
export async function loadChatHistory(sessionId) {
  if (typeof sessionId !== "string" || !/^[0-9a-fA-F-]{32,36}$/.test(sessionId)) return;

  ensureChatWindow();

  let data;
  try { data = await getSession(sessionId); }
  catch (e) { console.warn("getSession failed:", e); return; }

  const chatWin = document.getElementById("win_chat");
  const log = chatWin?.querySelector(".chat-log");
  if (!log) return;

  log.innerHTML = "";

  const history = Array.isArray(data?.history) ? data.history : [];
  for (const turn of history) {
    if (!Array.isArray(turn)) continue;
    const [userText, assistantText] = turn;

    if (userText) appendUserBubble(log, String(userText));
    if (assistantText) appendAssistantBubble(log, md(String(assistantText)));
  }

  log.scrollTop = log.scrollHeight;
}

/* ---------- Helpers ---------- */

function ensureChatWindow() {
  if (document.getElementById("win_chat")) return;
  spawnWindow({
    id: "win_chat",
    window_type: "window_chat",
    title: "Assistant Chat",
    col: "right",
    unique: true,
    dockable: true,
    resizable: true,
  });
}

function appendUserBubble(log, text) {
  const node = document.createElement("div");
  node.className = "chat-msg is-user";
  node.append(String(text ?? ""));
  log.appendChild(node);
}

function appendAssistantBubble(log, html) {
  const node = document.createElement("div");
  node.className = "chat-msg is-assistant";
  const mdEl = document.createElement("div");
  mdEl.className = "markdown";
  mdEl.innerHTML = html || "";
  node.appendChild(mdEl);
  log.appendChild(node);
}