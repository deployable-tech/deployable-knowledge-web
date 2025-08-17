import { el } from "../ui.js";

// Basic color picker with hex input sync
export function renderColorPicker({ id, name, value = "#000000" }) {
  const color = el("input", {
    type: "color",
    value,
    class: "color-input",
  });
  const text = el("input", {
    type: "text",
    id,
    name: name || id,
    class: "input",
    value,
  });
  color.addEventListener("input", () => {
    text.value = color.value;
    text.dispatchEvent(new Event("input", { bubbles: true }));
  });
  text.addEventListener("input", () => {
    if (/^#([0-9a-fA-F]{6})$/.test(text.value)) {
      color.value = text.value;
    }
  });
  return el("div", { class: "color-picker" }, [color, text]);
}
