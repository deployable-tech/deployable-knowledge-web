/**
 * Window framework providing basic window shell and controller API.
 * @module framework/window
 */

import { openModal } from "../components/modal.js";

/**
 * Spawn a window.
 * @param {Object} opts
 * @param {string} opts.id - DOM id for the window
 * @param {string} [opts.title] - title text
 * @param {boolean} [opts.resizable=true] - allow resize observer
 * @param {Function} [opts.mount] - called with content element to mount UI
 * @param {Function} [opts.onOpen]
 * @param {Function} [opts.onClose]
 * @param {Function} [opts.onResize]
 * @returns {WindowController}
 */
export function spawnWindow({
  id,
  title = "",
  resizable = true,
  mount,
  onOpen,
  onClose,
  onResize,
}) {
  const root = document.createElement("div");
  root.className = "window";
  if (id) root.id = id;

  const header = document.createElement("div");
  header.className = "titlebar";
  const titleEl = document.createElement("span");
  titleEl.className = "title";
  titleEl.textContent = title;
  header.appendChild(titleEl);

  const closeBtn = document.createElement("button");
  closeBtn.className = "close";
  closeBtn.textContent = "×";
  closeBtn.addEventListener("click", () => controller.close());
  header.appendChild(closeBtn);

  const content = document.createElement("div");
  content.className = "content";

  root.append(header, content);
  document.body.appendChild(root);

  const controller = new WindowController(root, header, content);

  if (mount) mount(content, controller);
  onOpen?.(controller);

  if (resizable && typeof ResizeObserver !== "undefined") {
    const ro = new ResizeObserver(() => {
      onResize?.(root.getBoundingClientRect());
      controller.emit("resize", root.getBoundingClientRect());
    });
    ro.observe(root);
    controller._ro = ro;
  }

  controller.on("close", () => {
    onClose?.(controller);
  });

  return controller;
}

/** Controller representing a window instance. */
export class WindowController {
  constructor(root, header, content) {
    this.root = root;
    this.header = header;
    this.content = content;
    this._events = new Map();
  }

  /** Set window title. */
  setTitle(text) {
    const t = this.header.querySelector(".title");
    if (t) t.textContent = text;
  }

  /** Close the window and cleanup. */
  close() {
    this.emit("close");
    this._events.clear();
    this._ro?.disconnect();
    this.root.remove();
  }

  /** Subscribe to a window-scoped event. */
  on(name, cb) {
    if (!this._events.has(name)) this._events.set(name, new Set());
    this._events.get(name).add(cb);
    return () => this._events.get(name).delete(cb);
  }

  /** Emit an event to subscribers. */
  emit(name, payload) {
    const set = this._events.get(name);
    if (set) for (const cb of Array.from(set)) cb(payload);
  }

  /** Open a modal dialog scoped to this window. */
  openModal(opts) {
    return openModal({ parentWindow: this, ...opts });
  }

  /** Get content element. */
  getContentEl() {
    return this.content;
  }
}

export default { spawnWindow };
