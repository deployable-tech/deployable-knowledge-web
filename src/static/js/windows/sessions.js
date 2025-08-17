// applications/windows/sessions.js
export function initSessionsWindow({ sdk, spawnWindow }) {
  if (typeof spawnWindow !== "function") throw new Error("spawnWindow missing");

  spawnWindow({
    id: "win_history",
    title: "Chat Sessions",
    col: "left",
    window_type: "window_generic",
    Elements: [
      { type: "list_view", id: "session_list", items: [], template: { title: it => it.id } }
    ]
  });

  async function refreshSessions() {
    const items = await sdk.sessions.list();
    document.getElementById("session_list")?.update({ items, template: { title: it => it.id } });
  }

  refreshSessions();
}
