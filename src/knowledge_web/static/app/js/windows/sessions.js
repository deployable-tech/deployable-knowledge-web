// sessions.js — robust chat history loader
import { spawnWindow } from "/static/ui/js/framework.js";
import { getComponent } from "/static/ui/js/components.js";
import { md } from "../util.js";

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
          // IMPORTANT: ensure the row carries data-sid we can read back
          item_template: {
            elements: [
              { type: "text", bind: "title", class: "li-title" },
              { type: "text", bind: "created_at", class: "li-meta"  },
              // Put the session id on the button so delegation can read it
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

      // Either the component sets data-action="open" or we match label
      const isOpen =
        (btn.dataset && btn.dataset.action === "open") ||
        btn.textContent?.trim().toLowerCase() === "open";
      if (!isOpen) return;

      // Find the row element that holds item metadata
      const row =
        btn.closest("[data-id]") ||
        btn.closest("[data-sid]") ||
        btn.closest("[data-index], [data-item-index]");

      // Fast path: if the row already has the id as an attribute
      let sessionId = row?.dataset?.id || row?.dataset?.sid;

      // Fallback: map index -> items from the component
      if (!sessionId) {
        const idx = row?.dataset?.index ?? row?.dataset?.itemIndex;
        const comp = getComponent("win_sessions", "session_list");
        const items = comp?.getItems ? comp.getItems() : comp?.items;
        if (Array.isArray(items) && idx != null) {
          const item = items[Number(idx)];
          sessionId = item?.id || item?.session_id || item?.uuid;
        }
      }

      // Absolute last resort: look for a nested element with data-sid
      if (!sessionId) {
        const probe = btn.closest("[data-sid]") || btn.querySelector("[data-sid]");
        sessionId = probe?.dataset?.sid;
      }

      // Only call loader with a string id
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
  const res = await fetch("/sessions", { credentials: "same-origin" });
  if (!res.ok) return;
  const data = await res.json();
  const comp = getComponent("win_sessions", "session_list");

  // Optional: store id on DOM rows so we can read it directly
  if (comp && Array.isArray(data)) {
    comp.render(
      data.map((it) => ({
        ...it,
        // some item_list versions mirror properties as data-* automatically.
        // If not, we’ll still have the fallback index->items mapping above.
      }))
    );
  }
}

/* ---------- Load history into the chat window ---------- */

export async function loadChatHistory(sessionId) {
  // Guard against DOM nodes slipping in
  if (typeof sessionId !== "string") {
    console.warn("loadChatHistory called with non-string id:", sessionId);
    return;
  }

  // Quick UUID-ish check (keep it permissive)
  if (!/^[0-9a-fA-F-]{32,36}$/.test(sessionId)) {
    console.warn("loadChatHistory: invalid-looking id:", sessionId);
    return;
  }

  ensureChatWindow();

  let data;
  try {
    const res = await fetch(`/sessions/${encodeURIComponent(sessionId)}`, {
      credentials: "same-origin",
    });
    if (!res.ok) {
      console.warn("History fetch failed", res.status);
      return;
    }
    data = await res.json();
  } catch (e) {
    console.warn("History fetch error", e);
    return;
  }

  const chatWin = document.getElementById("win_chat");
  const log = chatWin?.querySelector(".chat-log");
  if (!log) return;

  log.innerHTML = "";
  const history = Array.isArray(data?.history) ? data.history : [];

  for (const pair of history) {
    let userText = "", assistantText = "";
    if (Array.isArray(pair)) {
      [userText, assistantText] = pair;
    } else if (pair && typeof pair === "object") {
      userText = pair.user ?? "";
      assistantText = pair.assistant ?? pair.assistant_text ?? "";
    }
    appendUserBubble(log, userText);
    appendAssistantBubble(log, md(assistantText));
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
  const b = document.createElement("div");
  b.className = "bubble user";
  b.textContent = text || "";
  log.appendChild(b);
}

function appendAssistantBubble(log, html) {
  const b = document.createElement("div");
  b.className = "bubble assistant markdown";
  b.innerHTML = html || "";
  log.appendChild(b);
}
