// applications/windows/chat.js
export function initChatWindow({ sdk, sessionId, getPersona, getLLMSelection, spawnWindow }) {
  if (typeof spawnWindow !== "function") throw new Error("spawnWindow missing");

  spawnWindow({
    id: "win_chat",
    title: "Chat",
    col: "right",
    window_type: "window_chat",
    onSend: async (text) => {
      const sel = typeof getLLMSelection === "function" ? getLLMSelection() : null;
      const out = await sdk.chat.send({
        sessionId,
        message: text,
        persona: typeof getPersona === "function" ? getPersona() : "",
        serviceId: sel?.service_id,
        modelId: sel?.model_id,
      });
      return { role: "assistant", content: out.response };
    },
  });
}
