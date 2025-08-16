// chat.js — streaming via HTMLElement placeholder (no framework changes)
import { spawnWindow } from "/static/ui/js/framework.js";
import { chat, chatStream, llm } from "../sdk.js";
import { Store } from "../store.js";
import { md, htmlEscape } from "../util.js";
import { attachLLMSelect } from "../components/llm_select.js";

export function createChatWindow() {
  const win = spawnWindow({
    id: "win_chat",
    window_type: "window_chat",
    title: "Assistant Chat",
    col: "right",
    unique: true,
    dockable: true,
    resizable: true,

    // NOTE: window_chat calls onSend(text, ctx)
    // ctx.append({ role, content }) accepts an HTMLElement for content.
    onSend: async (text, ctx) => {
      const sel = await llm.getSelection();
      // 1) Create an empty assistant bubble immediately
      const placeholder = document.createElement("div");
      placeholder.className = "markdown"; // so your CSS/markdown renderer styles apply
      ctx.append({ role: "assistant", content: placeholder });

      // small helper to keep log scrolled to bottom while streaming
      const chatLog = placeholder.closest(".chat-log");
      const autoscroll = () => {
        if (chatLog) chatLog.scrollTop = chatLog.scrollHeight;
      };

      // 2) Try streaming first
      try {
        const { reader, decoder } = await chatStream({
          message: text,
          session_id: (Store.sessionId || "") + "",
          persona: Store.persona || "",
          inactive: Store.inactiveList?.() || [],
          model: sel.model_id || "",
          service_id: sel.service_id || "",
        });

        let buf = "";
        let acc = "";

        // paint something right away so the user sees the bubble
        placeholder.innerHTML = "";

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          buf += decoder.decode(value, { stream: true });

          // split Server-Sent-Events style chunks by double newline
          const chunks = buf.split("\n\n");
          buf = chunks.pop(); // keep partial for next read

          for (const chunk of chunks) {
            let event = "delta";
            let data = "";

            for (const line of chunk.split("\n")) {
              if (line.startsWith("event:")) event = line.slice(6).trim();
              else if (line.startsWith("data:")) data += line.slice(5).trim();
            }
            if (event !== "delta") continue;

            // be liberal: accept plain text or JSON {delta:"..."} / {response:"..."}
            let textDelta = "";
            try {
              const parsed = JSON.parse(data);
              if (parsed && typeof parsed === "object") {
                textDelta = parsed.delta ?? parsed.response ?? "";
              } else {
                textDelta = String(parsed ?? "");
              }
            } catch {
              textDelta = data;
            }
            if (textDelta === "." || textDelta === "[DONE]") continue;

            acc += textDelta;
            placeholder.innerHTML = md(acc);
            autoscroll();
          }
        }

        // We already wrote the assistant content; returning nothing prevents a duplicate bubble
        return;
      } catch (streamErr) {
        // 3) Fallback to one-shot (non-streaming) request
        try {
          const res = await chat({
            message: text,
            session_id: (Store.sessionId || "") + "",
            persona: Store.persona || "",
            inactive: Store.inactiveList?.() || [],
            model: sel.model_id || "",
            service_id: sel.service_id || "",
          });
          placeholder.innerHTML = md(res.response ?? "(no response)");
          autoscroll();
          return; // don't return a message object (we already rendered it)
        } catch (e2) {
          placeholder.innerHTML = `<em>Error:</em> ${htmlEscape(e2.message)}`;
          autoscroll();
          return;
        }
      }
    },
  });
  const header = win.querySelector(".title-bar, .window-titlebar, .title") || win;
  const quick = document.createElement("div");
  quick.style.marginLeft = "auto";
  header.appendChild(quick);
  attachLLMSelect(quick);
  return win;
}
