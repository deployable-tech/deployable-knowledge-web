import { spawnWindow } from "/static/ui/js/framework.js";

export function openUISettings() {
  if (document.getElementById("modal_ui_settings")) return;
  spawnWindow({
    id: "modal_ui_settings",
    window_type: "window_ui_settings",
    title: "UI Settings",
    modal: true,
    unique: true,
    resizable: false
  });
}
