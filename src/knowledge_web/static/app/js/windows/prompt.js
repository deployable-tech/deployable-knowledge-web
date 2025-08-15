import { spawnWindow } from "/static/ui/js/framework.js";
import { Store } from "../store.js";

export function openPromptEditor() {
  if (document.getElementById("modal_prompt")) return;
  spawnWindow({
    id: "modal_prompt",
    window_type: "window_generic",
    title: "Prompt Templates",
    modal: true,
    unique: true,
    resizable: false,
    Elements: [
      { type: "text_area", id: "prompt_text", rows: 6, value: Store.prompt || "" }
    ]
  });
  const modal = document.getElementById("modal_prompt");
  const content = modal?.querySelector(".content");
  const actions = document.createElement("div");
  actions.className = "actions";
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "btn";
  btn.id = "prompt_save";
  btn.textContent = "Save";
  actions.appendChild(btn);
  content?.appendChild(actions);
  btn.addEventListener("click", () => {
    const val = modal.querySelector("#prompt_text")?.value || "";
    Store.prompt = val;
    const closer =
      modal.querySelector("[data-action='close'], .close, .btn-close, .window-close");
    if (closer) {
      closer.dispatchEvent(new Event("click", { bubbles: true }));
    } else {
      modal.remove();
      document.querySelector(
        ".modal-overlay, .ui-dim, .screen-dim, .window-dim"
      )?.remove();
      document.body.classList.remove("modal-open", "dimmed");
    }
  });
}
