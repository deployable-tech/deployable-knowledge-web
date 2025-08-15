import { spawnWindow } from "/static/ui/js/framework.js";
import { Store } from "../store.js";

export function openPersonaEditor() {
  if (document.getElementById("modal_persona")) return;
  spawnWindow({
    id: "modal_persona",
    window_type: "window_generic",
    title: "Persona",
    modal: true,
    unique: true,
    resizable: false,
    Elements: [
      { type: "text_area", id: "persona_text", rows: 6, value: Store.persona || "" }
    ]
  });
  const modal = document.getElementById("modal_persona");
  const content = modal?.querySelector(".content");
  const row = document.createElement("div");
  row.className = "row";
  const btn = document.createElement("button");
  btn.id = "persona_save";
  btn.textContent = "Save";
  row.appendChild(btn);
  content?.appendChild(row);
  btn.addEventListener("click", () => {
    const val = modal.querySelector("#persona_text")?.value || "";
    Store.persona = val;
    modal.remove();
  });
}
