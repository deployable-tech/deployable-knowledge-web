// applications/windows/chat.js
export function initChatWindow({ sdk, sessionId, getPersona, spawnWindow }) {
  if (typeof spawnWindow !== "function") throw new Error("spawnWindow missing");

  spawnWindow({
    id: "win_chat",
    title: "Chat",
    col: "right",
    window_type: "window_chat",
    onSend: async (text) => {
      const out = await sdk.chat.send({
        sessionId,
        message: text,
        persona: typeof getPersona === "function" ? getPersona() : "",
      });
      return { role: "assistant", content: out.response };
    },
  });
}
