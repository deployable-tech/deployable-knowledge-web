import { createChatWindow as createUiChatWindow } from "/static/ui/js/windows/chat.js";
import { chat, chatStream } from "../sdk.js";
import { Store } from "../store.js";
import { md, htmlEscape } from "../util.js";

export function createChatWindow() {
  const ui = createUiChatWindow({ title: "Assistant Chat" });

  ui.onSend = async (text, bubble) => {
    try {
      const { reader, decoder } = await chatStream({
        message: text,
        session_id: (Store.sessionId || "") + "",
        persona: Store.persona || "",
        inactive: Store.inactiveList?.() || [],
      });
      let buf = "";
      let acc = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const chunks = buf.split("\n\n");
        buf = chunks.pop();
        for (const chunk of chunks) {
          let event = "delta", data = "";
          for (const line of chunk.split("\n")) {
            if (line.startsWith("event:")) event = line.slice(6).trim();
            else if (line.startsWith("data:")) data += line.slice(5).trim();
          }
          if (event === "delta") {
            let parsed;
            try { parsed = JSON.parse(data); } catch {}
            if (parsed !== undefined) {
              if (typeof parsed === "object" && parsed) {
                data = parsed.delta ?? parsed.response ?? Object.values(parsed)[0] ?? "";
              } else {
                data = parsed + "";
              }
            }
            if (data === "." || data === "[DONE]") continue;
            acc += data;
            bubble.innerHTML = md(acc);
          }
        }
      }
    } catch {
      try {
        const res = await chat({
          message: text,
          session_id: (Store.sessionId || "") + "",
          persona: Store.persona || "",
          inactive: Store.inactiveList?.() || [],
        });
        bubble.innerHTML = md(res.response ?? "(no response)");
      } catch (e2) {
        bubble.innerHTML = `<em>Error:</em> ${htmlEscape(e2.message)}`;
      }
    }
  };

  return ui;
}

