// layout.js — default window layout definition
export const defaultWindows = [
  { id: "docs",     type: "window_documents",   x: 16,  y: 16,  w: 420, h: 360, title: "Documents" },
  { id: "sessions", type: "window_sessions",    x: 16,  y: 392, w: 420, h: 300, title: "Chat History" },
  { id: "chat",     type: "window_chat_ui",     x: 452, y: 16,  w: 700, h: 500, title: "Assistant Chat" },
  { id: "segments", type: "window_segments",    x: 452, y: 528, w: 700, h: 300, title: "DB Segments" }
];
