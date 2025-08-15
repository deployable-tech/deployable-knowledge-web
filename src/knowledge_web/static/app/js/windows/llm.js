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
      { type: "select", id: "model_select", label: "Model", options: MODEL_OPTIONS, value: Store.model || MODEL_OPTIONS[0].value },
      { type: "button", id: "model_save", label: "Save" }
    ]
  });
  const modal = document.getElementById("modal_llm");
  modal.querySelector("#model_save")?.addEventListener("click", () => {
    const val = modal.querySelector("#model_select")?.value || "";
    Store.model = val;
    modal.remove();
  });
}
