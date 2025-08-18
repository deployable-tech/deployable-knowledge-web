import { el } from "../ui.js";

/**
 * Render a chat/LLM window.
 * - Toolbar buttons (optional)
 * - Initial messages (optional)
 * - Autosizing textarea
 * - Enter to send (Shift+Enter for newline)
 * - Async onSend handler
 * - Simple message API: append/getMessages/clear
 */
export function render(config = {}, winId) {
  const cfg = { ...config };
  const container = el("div", { class: "chat-window" });

  // --- Toolbar (from codex) ---
  function makeToolbar(list) {
    if (!Array.isArray(list) || list.length === 0) return null;
    const bar = el("div", { class: "toolbar" });
    list.forEach((btn) => {
      const label = btn.icon || btn.label || "";
      const b = el(
        "button",
        {
          class:
            btn.variant === "danger"
              ? "btn btn-danger"
              : btn.variant === "primary"
              ? "btn btn-primary"
              : "btn",
          title: btn.title || label,
          type: "button",
        },
        [label]
      );
      b.addEventListener("click", (ev) => {
        ev.stopPropagation();
        if (btn.onClick) btn.onClick(ctx);
        else if (btn.id && cfg.onAction) cfg.onAction(btn.id, ctx);
      });
      bar.appendChild(b);
    });
    return bar;
  }

  // --- Log (message area) ---
  const log = el("div", { class: "chat-log" });

  // --- Input / autosize (from main) ---
  const textarea = el("textarea", {
    class: "input",
    rows: 1,
    placeholder: cfg.placeholder || "",
  });
  textarea.style.resize = "none";

  const sendBtn = el("button", { type: "submit", class: "btn" }, [
    cfg.sendLabel || "Send",
  ]);

  const form = el("form", { class: "chat-input" }, [textarea, sendBtn]);

  const maxHeight = cfg.maxInputHeight ?? Infinity;
  const baseline = textarea.style.height || "auto";
  const resize = () => {
    // reset first so shrink works
    textarea.style.height = baseline;
    let h = textarea.scrollHeight;
    if (maxHeight !== Infinity) h = Math.min(h, maxHeight);
    textarea.style.height = `${h}px`;
  };
  textarea.addEventListener("input", resize);
  setTimeout(resize, 0);

  // --- Message helpers (from codex) ---
  let messages = Array.isArray(cfg.messages) ? [...cfg.messages] : [];

  function appendMessage(msg) {
    const role = msg.role || "assistant";
    const node = el("div", { class: `chat-msg is-${role}` });
    const content = msg.content;

    if (content instanceof HTMLElement) {
      node.appendChild(content);
    } else if (typeof content === "string" && role === "assistant") {
      // backend responses may include HTML (e.g., <p> tags). Render it.
      node.innerHTML = content;
    } else {
      node.textContent = String(content ?? "");
    }

    if (msg.meta) node.appendChild(el("div", { class: "chat-meta" }, [msg.meta]));
    log.appendChild(node);
    if (cfg.autoScroll !== false) log.scrollTop = log.scrollHeight;
  }

  const ctx = {
    winId,
    append: appendMessage,
    getMessages: () => messages.slice(),
    clear: () => {
      messages = [];
      log.innerHTML = "";
    },
  };

  // seed initial messages
  if (messages.length) {
    messages.forEach(appendMessage);
  } else if (cfg.emptyText) {
    log.appendChild(el("div", { class: "chat-meta" }, [cfg.emptyText]));
  }

  // --- Send handling (merge of both) ---
  let sending = false;

  async function doSend() {
    if (sending) return;
    const text = textarea.value.trim();
    if (!text) return;

    sending = true;
    textarea.disabled = true;
    sendBtn.disabled = true;

    const userMsg = { role: "user", content: text };
    messages.push(userMsg);
    appendMessage(userMsg);
    textarea.value = "";
    resize();

    try {
      const res = await cfg.onSend?.(text, ctx);
      if (res) {
        messages.push(res);
        appendMessage(res);
      }
    } finally {
      textarea.disabled = false;
      sendBtn.disabled = false;
      sending = false;
      textarea.focus();
    }
  }

  // Enter to send, Shift+Enter for newline
  textarea.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      doSend();
    }
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    doSend();
  });

  // --- Assemble ---
  const topBar = makeToolbar(cfg.toolbarTop);
  if (topBar) container.appendChild(topBar);
  container.appendChild(log);
  container.appendChild(form);

  return container;
}
