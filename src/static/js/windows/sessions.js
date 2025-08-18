// applications/windows/sessions.js
export function initSessionsWindow({ sdk, spawnWindow, onSelect, onNewChat }) {
  if (typeof spawnWindow !== "function") throw new Error("spawnWindow missing");

  spawnWindow({
    id: "win_history",
    title: "Chat Sessions",
    col: "left",
    window_type: "window_generic",
    Elements: [
      { type: "submit_button", id: "session_new", text: "New Chat" },
      {
        type: "list_view",
        id: "session_list",
        label: "Previous Chats",
        labelPosition: "top",
        keyField: "session_id",
        items: [],
        onRowClick: (s) => onSelect?.(s),
        template: {
          title: s => s.title || s.session_id,
          subtitle: s => new Date(s.created_at).toLocaleString()
        }
      }
    ]
  });

  document.getElementById("session_new")?.addEventListener("click", async () => {
    if (typeof onNewChat === "function") {
      await onNewChat();
      await refreshSessions();
    }
  });

  async function refreshSessions() {
    const items = await sdk.sessions.list();
    document.getElementById("session_list")?.update({
      items,
      keyField: "session_id",
      onRowClick: (s) => onSelect?.(s),
      template: {
        title: s => s.title || s.session_id,
        subtitle: s => new Date(s.created_at).toLocaleString()
      }
    });
  }

  refreshSessions();
}
