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
  const row = document.createElement("div");
  row.className = "row";
  const btn = document.createElement("button");
  btn.id = "prompt_save";
  btn.textContent = "Save";
  row.appendChild(btn);
  content?.appendChild(row);
  btn.addEventListener("click", () => {
    const val = modal.querySelector("#prompt_text")?.value || "";
    Store.prompt = val;
    modal.remove();
  });
}
