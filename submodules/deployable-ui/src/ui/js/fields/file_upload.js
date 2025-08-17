import { el } from "../ui.js";

/**
 * Render a file upload field.
 * @param {Object} cfg configuration
 * @returns {HTMLElement}
 */
export function renderFileUpload(cfg) {
  const id = cfg.id || `fu-${crypto.randomUUID()}`;
  const container = el("div", { class: "file-upload", id });

  const input = el("input", {
    type: "file",
    style: { display: "none" },
    ...(cfg.multiple ? { multiple: "multiple" } : {}),
  });

  const selectBtn = el("button", { type: "button", class: "btn" }, [cfg.selectLabel || "Select Files"]);
  const uploadBtn = el("button", { type: "button", class: "btn" }, [cfg.buttonLabel || "Upload"]);
  const list = el("ul", { class: "upload-list" });

  selectBtn.addEventListener("click", () => input.click());
  input.addEventListener("change", () => renderList());
  uploadBtn.addEventListener("click", () => cfg.onUpload?.(getFiles()));

  function getFiles() {
    return Array.from(input.files || []);
  }

  function renderList() {
    list.innerHTML = "";
    const files = getFiles();
    if (!files.length) {
      list.appendChild(el("li", {}, [cfg.emptyText || "No files selected"]));
      return;
    }
    files.forEach((f) => list.appendChild(el("li", {}, [f.name])));
  }

  function clear() {
    const dt = new DataTransfer();
    input.files = dt.files;
    renderList();
  }

  container.getFiles = getFiles;
  container.clear = clear;

  container.append(selectBtn, uploadBtn, input, list);
  renderList();
  return container;
}
