// window.js — registry + modal/resize helpers
import { el } from "./ui.js";
import { deregisterComponent } from "./components.js";
import { render as renderGeneric } from "./windows/window_generic.js";
import { render as renderTextEditor } from "./windows/window_text_editor.js";
import { render as renderChat } from "./windows/window_chat.js";
import { render as renderThemeEditor } from "./windows/window_theme_editor.js";

//HELO!!!

// Built‑in window type registry. Consumers can register additional types
// via the exported ``registerWindowType`` function.
const WindowTypes = { window_generic: renderGeneric };

export function registerWindowType(name, renderer) {
  WindowTypes[name] = renderer;
}

// Register built‑in extensions
registerWindowType("window_text_editor", renderTextEditor);
registerWindowType("window_chat", renderChat);
registerWindowType("window_theme_editor", renderThemeEditor);

export function createMiniWindowFromConfig(config) {
  const winId = (() => {
    let id = config.id || `mw-${crypto.randomUUID()}`;
    while (document.getElementById(id)) {
      id = `mw-${crypto.randomUUID()}`;
    }
    return id;
  })();
  const win = el("div", { class: "miniwin", tabindex: "0", "data-id": winId, id: winId });
  if (config.modalFade === false) win.dataset.modalFade = "false";

  const actions = el("div", { class: "actions" }, [
    el("button", { class: "icon-btn js-min", title: "Minimize", "aria-label": "Minimize", "data-win": winId }, ["—"])
  ]);
  if (config.dockable) {
    const dockLabel = config.modal ? "Dock" : "Undock";
    const dockIcon = config.modal ? "⇲" : "⇱";
    actions.appendChild(
      el(
        "button",
        {
          class: "icon-btn js-dock-toggle",
          title: dockLabel,
          "aria-label": dockLabel,
          "data-win": winId
        },
        [dockIcon]
      )
    );
  }
  actions.appendChild(
    el("button", { class: "icon-btn js-close", title: "Close", "aria-label": "Close", "data-win": winId }, ["✕"])
  );
  const titlebar = el("div", { class: "titlebar" }, [
    el("div", { class: "title" }, [config.title || "Untitled"]),
    actions
  ]);

  const contentInner = el("div", { class: "content-inner" });
  const content = el("div", { class: "content" }, [contentInner]);

  const type = config.window_type || "window_generic";
  const renderer = WindowTypes[type];
  if (!renderer) throw new Error(`Unknown window_type: ${type}`);
  if (type === "window_chat") contentInner.classList.add("is-chat");
  const body = renderer(config, winId);
  contentInner.appendChild(body);

  if (config.modal) {
    win.classList.add("modal");
    win.setAttribute("data-modal", "true");
  }

  win.append(titlebar, content);

  if (config.resizable) {
    const handle = el("div", { class: "win-resizer-y", "aria-label": "Resize window height" });
    win.appendChild(handle);
    const saved = localStorage.getItem(`win:${winId}:h`);
    if (saved) win.style.height = saved;
  }

  return win;
}

export function mountModal(win, opts = {}) {
  const { fade = true } = opts;
  const wrap = el("div", { class: "modal-wrap" });
  if (fade) {
    const backdrop = el("div", { class: "modal-backdrop" });
    wrap.append(backdrop, win);
  } else {
    wrap.appendChild(win);
  }
  document.body.appendChild(wrap);
  return wrap;
}

export function undockWindow(win, rect) {
  const r = rect || win.getBoundingClientRect();
  const fade = win.dataset.modalFade !== "false";
  mountModal(win, { fade });
  win.classList.add("modal");
  win.setAttribute("data-modal", "true");
  Object.assign(win.style, {
    position: "fixed",
    left: `${r.left}px`,
    top: `${r.top}px`,
    width: `${r.width}px`
  });
}

export function dockWindow(win, targetCol) {
  const cols = [...document.querySelectorAll(".col")];
  if (cols.length === 0) return;

  const rect = win.getBoundingClientRect();
  const midY = rect.top + rect.height / 2;
  let bestCol = targetCol || cols[0];
  if (!targetCol) {
    const midX = rect.left + rect.width / 2;
    let bestDist = Infinity;
    for (const col of cols) {
      const cRect = col.getBoundingClientRect();
      const cMidX = cRect.left + cRect.width / 2;
      const dist = Math.abs(midX - cMidX);
      if (dist < bestDist) {
        bestDist = dist;
        bestCol = col;
      }
    }
  }

  const wrap = win.closest(".modal-wrap");
  if (wrap) wrap.remove();
  win.classList.remove("modal");
  win.removeAttribute("data-modal");
  win.style.position = "";
  win.style.left = "";
  win.style.top = "";
  win.style.width = "";

  const siblings = [...bestCol.querySelectorAll(".miniwin")];
  let inserted = false;
  for (const sib of siblings) {
    const sRect = sib.getBoundingClientRect();
    const sMid = sRect.top + sRect.height / 2;
    if (midY < sMid) {
      bestCol.insertBefore(win, sib);
      inserted = true;
      break;
    }
  }
  if (!inserted) bestCol.appendChild(win);
  win.focus({ preventScroll: true });
}

export function initWindowResize() {
  let resizing = null;
  let startY = 0;
  let startH = 0;

  const onMove = (e) => {
    if (!resizing) return;
    let h = startH + (e.clientY - startY);
    const min = 240;
    const max = window.innerHeight * 0.9;
    h = Math.max(min, Math.min(max, h));
    resizing.style.height = `${h}px`;
  };

  const onUp = () => {
    if (!resizing) return;
    localStorage.setItem(`win:${resizing.id}:h`, resizing.style.height);
    document.removeEventListener("pointermove", onMove);
    resizing = null;
  };

  document.addEventListener("pointerdown", (e) => {
    const handle = e.target.closest(".win-resizer-y");
    if (!handle) return;
    e.preventDefault();
    resizing = handle.closest(".miniwin");
    const rect = resizing.getBoundingClientRect();
    startY = e.clientY;
    startH = rect.height;
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp, { once: true });
  });
}

document.addEventListener("click", (e) => {
  const btn = e.target.closest(".js-close");
  if (!btn) return;
  const win = btn.closest(".miniwin");
  if (!win) return;
  deregisterComponent(win.dataset.id);
});
