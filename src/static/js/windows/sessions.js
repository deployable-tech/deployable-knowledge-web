// applications/windows/sessions.js
export function initSessionsWindow({ sdk, spawnWindow }) {
  if (typeof spawnWindow !== "function") throw new Error("spawnWindow missing");

  spawnWindow({
    id: "win_history",
    title: "Chat Sessions",
    col: "left",
    window_type: "window_generic",
    Elements: [
      {
        type: "list_view",
        id: "session_list",
        keyField: "session_id",
        items: [],
        template: {
          title: s => s.title || s.session_id,
          subtitle: s => new Date(s.created_at).toLocaleString()
        }
      }
    ]
  });

  async function refreshSessions() {
    const items = await sdk.sessions.list();
    document.getElementById("session_list")?.update({
      items,
      keyField: "session_id",
      template: {
        title: s => s.title || s.session_id,
        subtitle: s => new Date(s.created_at).toLocaleString()
      }
    });
  }

  refreshSessions();
}
