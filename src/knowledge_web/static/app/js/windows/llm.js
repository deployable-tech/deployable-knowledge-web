import { spawnWindow } from "/static/ui/js/framework.js";
import { Store } from "../store.js";

const MODEL_OPTIONS = [
  { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo" },
  { value: "gpt-4", label: "GPT-4" }
];

export function openLLMSettings() {
  if (document.getElementById("modal_llm")) return;
  spawnWindow({
    id: "modal_llm",
    window_type: "window_generic",
    title: "LLM Settings",
    modal: true,
    unique: true,
    resizable: false,
    Elements: [
      { type: "select", id: "model_select", label: "Model", options: MODEL_OPTIONS, value: Store.model || MODEL_OPTIONS[0].value }
    ]
  });
  const modal = document.getElementById("modal_llm");
  const content = modal?.querySelector(".content");
  const actions = document.createElement("div");
  actions.className = "actions";
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "btn";
  btn.id = "model_save";
  btn.textContent = "Save";
  actions.appendChild(btn);
  content?.appendChild(actions);
  btn.addEventListener("click", () => {
    const val = modal.querySelector("#model_select")?.value || "";
    Store.model = val;
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
