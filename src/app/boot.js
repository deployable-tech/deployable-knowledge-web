
// src/app/boot.js

import { createWindow } from "/src/ui-compat/windows.js";
import { bus, getComponent } from "/ui/js/components.js";
import { el } from "/ui/js/ui.js";
import { defaultWindows } from "./layout.js";
import * as sdk from "../sdk/sdk.js";

// Ensure user session cookies exist
(async function initAuth(){
  try { await sdk.beginUserSession(); } catch {}
})();



async function spawnWindows() {
  const root = document.getElementById("app") || document.body;
  const instances = [];
  for (const w of defaultWindows) {
    const elWin = createWindow(w.type, { title: w.title }, w.id);
    elWin.style.position = "absolute";
    elWin.style.left = (w.x||0) + "px";
    elWin.style.top  = (w.y||0) + "px";
    elWin.style.width  = (w.w||640) + "px";
    elWin.style.height = (w.h||360) + "px";
    root.appendChild(elWin);
    instances.push({ id: w.id, el: elWin });
  }
  return instances;
}



// Minimal data loaders
async function refreshDocuments(){
  const docs = await sdk.listDocuments();
  const comp = getComponent("docs", "documents");
  if (comp?.render) comp.render(docs);
}
async function refreshSessions(){
  const items = await sdk.listSessions();
  const comp = getComponent("sessions", "sessions");
  if (comp?.render) comp.render(items);
}
async function refreshSegments(source){
  const items = await sdk.listSegments(source);
  const comp = getComponent("segments", "segments");
  if (comp?.render) comp.render(items);
}

// Basic chat glue: render history and send messages (non-stream demo)
async function loadSessionIntoChat(session_id){
  const chat = getComponent("chat", "chat");
  if (!chat) return;
  chat.clear();
  const data = await sdk.getSession(session_id);
  for (const [u,a] of (data.history || [])) {
    if (u) chat.append("user", u);
    if (a) chat.append("assistant", a);
  }
}
async function main(){
  // 🔐 ensure cookies exist *before* any fetch
  try { await sdk.beginUserSession(); } catch {}

  spawnWindows();

  const { session_id } = await sdk.getOrCreateChatSession();
  await Promise.all([refreshDocuments(), refreshSessions(), refreshSegments()]);

  // When a session is selected/opened, paint its history
  bus.addEventListener("ui:list-action", (ev) => {
    const { winId, action, item } = ev.detail || {};
    if (!action || !item) return;

    if (winId === "sessions" && action.id === "open") {
      loadSessionIntoChat(item.session_id).catch(console.error);
    }
    if (winId === "documents") {
      if (action.id === "open") {
        refreshSegments(item.id).catch(console.error);
      }
      if (action.id === "toggle") {
        // Here you would update inactive IDs in Store; for demo we just no-op
      }
    }
    if (winId === "segments") {
      if (action.id === "open") {
        // Open a viewer window dynamically
        const viewerId = `seg_${item.id}`;
        const elWin = createWindow("window_segment_view", { title: item.id }, viewerId);
        elWin.style.position = "absolute";
        elWin.style.left = "1180px";
        elWin.style.top  = "16px";
        elWin.style.width  = "500px";
        elWin.style.height = "360px";
        (document.getElementById("app") || document.body).appendChild(elWin);

        // fill content
        sdk.getSegment(item.id).then(d => {
          const seg = getComponent(viewerId, "segment");
          seg?.setText(d.text || "");
        });
      }
      if (action.id === "remove") {
        sdk.deleteSegment(item.id).then(() => refreshSegments()).catch(console.error);
      }
    }
  });

  // Handle chat sends
  bus.addEventListener("chat:send", async (ev) => {
    const chat = getComponent("chat", "chat");
    const text = chat?.getValue?.();
    if (!text) return;
    chat.append("user", text);
    chat.setValue("");

    try {
      const res = await sdk.chat({ message: text, session_id });
      const reply = res?.response ?? "(no response)";
      chat.append("assistant", reply);
      // Optionally refresh history list
      refreshSessions().catch(console.error);
    } catch (err) {
      chat.append("assistant", "⚠️ Chat error: " + (err?.message || err));
    }
  });
}
document.addEventListener("DOMContentLoaded", main);
