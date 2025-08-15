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
      { type: "text_area", id: "prompt_text", rows: 6, value: Store.prompt || "" },
      { type: "button", id: "prompt_save", label: "Save" }
    ]
  });
  const modal = document.getElementById("modal_prompt");
  modal.querySelector("#prompt_save")?.addEventListener("click", () => {
    const val = modal.querySelector("#prompt_text")?.value || "";
    Store.prompt = val;
    modal.remove();
  });
}
