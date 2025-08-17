// applications/windows/chat.js
export function initChatWindow({ sdk, sessionId, getPersona, getLLMSelection, spawnWindow }) {
  if (typeof spawnWindow !== "function") throw new Error("spawnWindow missing");

  async function getUserId() {
    try {
      const u = await sdk.sessions.getUser();
      return u?.id ?? u?.user_id ?? u?.userId ?? null;
    } catch {
      return null;
    }
  }

  spawnWindow({
    id: "win_chat",
    title: "Chat",
    col: "right",
    window_type: "window_chat",
    onSend: async (text) => {
      // Use caller’s selection if present; otherwise fetch from API
      const selLocal = (typeof getLLMSelection === "function") ? getLLMSelection() : null;
      let sel = selLocal;

      // normalize camel/snake just in case
      if (sel && (sel.serviceId || sel.modelId)) {
        sel = {
          service_id: sel.service_id ?? sel.serviceId ?? null,
          model_id:   sel.model_id   ?? sel.modelId   ?? null,
        };
      }

      if (!sel?.service_id) {
        try { sel = await sdk.llm.getSelection(); } catch { sel = null; }
      }

      // (optional) sanity log
      // console.debug("chat selection:", sel);

      const uid = await getUserId();

      const out = await sdk.chat.send({
        sessionId,
        userId: uid,
        message: text,
        persona: (typeof getPersona === "function" ? getPersona() : ""),
        serviceId: sel?.service_id || "",   // non-empty ensures it’s included in form body
        modelId:   sel?.model_id   || "",
      });

      return { role: "assistant", content: out.response };
    },
  });
}
