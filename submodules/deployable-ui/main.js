import { initFramework, spawnWindow } from "../../src/ui/js/framework.js";

function quickStartLeft() {
  return spawnWindow({
    id: "win_quickstart",
    title: "Quick Start",
    col: "left",
    resizable: true,
    dockable: true,
    window_type: "window_generic",
    Elements: [
      { type: "text", html: "<strong>Welcome.</strong> This is a clean scaffold to start building your app." },
      { type: "text_field", name: "Title", placeholder: "Enter a title..." },
      { type: "number_field", name: "Items", value: 3, min: 1, max: 50 },
      { type: "select", name: "Model", value: "gpt-4o", options: [
        { value: "gpt-4o" }, { value: "llama3" }, { value: "mistral" }
      ]},
      { type: "submit_button", text: "Save" }
    ]
  });
}

function themeEditorRight() {
  return spawnWindow({
    id: "win_theme",
    title: "Theme Editor",
    col: "right",
    resizable: true,
    dockable: true,
    window_type: "window_theme_editor"
  });
}

function chatRight() {
  return spawnWindow({
    id: "win_chat",
    title: "Chat",
    col: "right",
    resizable: true,
    dockable: true,
    window_type: "window_chat",
    toolbarTop: [
      { label: "Clear", onClick: (_, api) => api.clear() }
    ],
    async onSend(text, api) {
      await new Promise(r => setTimeout(r, 250));
      return { role: "assistant", content: "Echo: " + text };
    }
  });
}

function initButtons() {
  document.getElementById("btn-theme").addEventListener("click", () => themeEditorRight());
  document.getElementById("btn-chat").addEventListener("click", () => chatRight());
}

window.addEventListener("DOMContentLoaded", () => {
  initFramework();
  quickStartLeft();
  themeEditorRight();
  chatRight();
  initButtons();
});