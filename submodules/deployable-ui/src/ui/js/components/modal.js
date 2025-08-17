/** Simple modal/child window API. */

export function openModal({
  parentWindow,
  title = "",
  size = "md",
  content,
  onClose,
}) {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  const modalEl = document.createElement("div");
  modalEl.className = `modal modal-${size}`;
  const header = document.createElement("div");
  header.className = "modal-header";
  const titleEl = document.createElement("span");
  titleEl.className = "modal-title";
  titleEl.textContent = title;
  const closeBtn = document.createElement("button");
  closeBtn.className = "modal-close";
  closeBtn.textContent = "×";
  header.append(titleEl, closeBtn);
  const body = document.createElement("div");
  body.className = "modal-body";
  modalEl.append(header, body);
  overlay.appendChild(modalEl);

  (parentWindow?.root || document.body).appendChild(overlay);

  const ctrl = new ModalController(overlay, modalEl, header, body);
  closeBtn.addEventListener("click", () => ctrl.close());

  content?.(ctrl);
  ctrl.on("close", () => onClose?.());
  return ctrl;
}

export class ModalController {
  constructor(overlay, modal, header, body) {
    this.overlay = overlay;
    this.modal = modal;
    this.header = header;
    this.body = body;
    this._events = new Map();
  }
  close() {
    this.emit("close");
    this._events.clear();
    this.overlay.remove();
  }
  on(name, cb) {
    if (!this._events.has(name)) this._events.set(name, new Set());
    this._events.get(name).add(cb);
  }
  emit(name, payload) {
    const set = this._events.get(name);
    if (set) for (const cb of Array.from(set)) cb(payload);
  }
  setTitle(text) {
    const t = this.header.querySelector(".modal-title");
    if (t) t.textContent = text;
  }
}

export default { openModal };
