import { el, Field, fieldRow } from "../ui.js";
import { generatePalette, getVar, setVar } from "../theme.js";

function parseHsl(str) {
  const m = str.trim().match(/hsl\(\s*(\d+(?:\.\d+)?)\s*(?:,\s*|\s+)(\d+(?:\.\d+)?)%\s*(?:,\s*|\s+)(\d+(?:\.\d+)?)%\s*\)/i);
  if (!m) return { h: 0, s: 0, l: 0 };
  return { h: parseFloat(m[1]), s: parseFloat(m[2]), l: parseFloat(m[3]) };
}

function hslToHex(h, s, l) {
  s /= 100; l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else { r = c; b = x; }
  r = Math.round((r + m) * 255).toString(16).padStart(2, "0");
  g = Math.round((g + m) * 255).toString(16).padStart(2, "0");
  b = Math.round((b + m) * 255).toString(16).padStart(2, "0");
  return `#${r}${g}${b}`;
}

function hexToHue(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  if (max !== min) {
    const d = max - min;
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
        break;
      case g:
        h = ((b - r) / d + 2) * 60;
        break;
      case b:
        h = ((r - g) / d + 4) * 60;
        break;
    }
  }
  return Math.round(h);
}

function readVar(name) {
  return getVar(name).trim();
}

export function render(config = {}, winId) {
  const form = el("form", { class: "form", autocomplete: "off" });
  form.addEventListener("submit", (e) => e.preventDefault());

  const base = parseHsl(readVar("--base-color"));
  let baseHue = parseInt(readVar("--h")) || base.h;
  let posHue = parseInt(readVar("--positive-h")) || 150;
  let negHue = parseInt(readVar("--negative-h")) || 10;

  const settings = {
    h: baseHue,
    "positive-h": posHue,
    "negative-h": negHue,
    sat: readVar("--sat"),
    "font-family": readVar("--font-family"),
    "font-size-base": readVar("--font-size-base"),
    "win-gap-horizontal": readVar("--win-gap-horizontal"),
    "win-gap-vertical": readVar("--win-gap-vertical"),
    "win-radius": readVar("--win-radius"),
  };

  function save() {
    localStorage.setItem("theme", JSON.stringify(settings));
  }

  function updatePalette(b, p, n) {
    if (b !== undefined) settings.h = baseHue = b;
    if (p !== undefined) settings["positive-h"] = posHue = p;
    if (n !== undefined) settings["negative-h"] = negHue = n;
    generatePalette(baseHue, posHue, negHue);
    save();
    refreshColorInputs();
  }

  function refreshColorInputs() {
    baseColor.querySelector("input[type=color]").value = hslToHex(...Object.values(parseHsl(readVar("--base-color"))));
    posColor.querySelector("input[type=color]").value = hslToHex(...Object.values(parseHsl(readVar("--positive-accent"))));
    negColor.querySelector("input[type=color]").value = hslToHex(...Object.values(parseHsl(readVar("--negative-accent"))));
  }

  const baseColor = Field.create({ type: "color_picker", id: "base_color", value: hslToHex(base.h, base.s, base.l) });
  baseColor.querySelector("input[type=color]").addEventListener("input", (e) => {
    const hue = hexToHue(e.target.value);
    updatePalette(hue);
  });
  form.appendChild(fieldRow("base_color", "Base", baseColor));

  const posColor = Field.create({ type: "color_picker", id: "pos_color", value: hslToHex(...Object.values(parseHsl(readVar("--positive-accent")))) });
  posColor.querySelector("input[type=color]").addEventListener("input", (e) => {
    const hue = hexToHue(e.target.value);
    updatePalette(undefined, hue);
  });
  form.appendChild(fieldRow("pos_color", "Positive", posColor));

  const negColor = Field.create({ type: "color_picker", id: "neg_color", value: hslToHex(...Object.values(parseHsl(readVar("--negative-accent")))) });
  negColor.querySelector("input[type=color]").addEventListener("input", (e) => {
    const hue = hexToHue(e.target.value);
    updatePalette(undefined, undefined, hue);
  });
  form.appendChild(fieldRow("neg_color", "Negative", negColor));

  const saturation = Field.create({ type: "number_field", id: "sat", value: parseInt(settings.sat) || 18, min: 0, max: 100 });
  saturation.addEventListener("input", () => {
    const v = `${saturation.value}%`;
    settings.sat = v;
    setVar("--sat", v);
    save();
    refreshColorInputs();
  });
  form.appendChild(fieldRow("sat", "Saturation", saturation));

  const fontFamily = Field.create({ type: "text_field", id: "font_family", value: settings["font-family"] });
  fontFamily.addEventListener("input", () => {
    settings["font-family"] = fontFamily.value;
    setVar("--font-family", fontFamily.value);
    save();
  });
  form.appendChild(fieldRow("font_family", "Font", fontFamily));

  const fontSize = Field.create({ type: "number_field", id: "font_size", value: parseInt(settings["font-size-base"]) || 14, min: 8, max: 32 });
  fontSize.addEventListener("input", () => {
    const v = `${fontSize.value}px`;
    settings["font-size-base"] = v;
    setVar("--font-size-base", v);
    save();
  });
  form.appendChild(fieldRow("font_size", "Font Size", fontSize));

  const gapH = Field.create({ type: "number_field", id: "gap_h", value: parseInt(settings["win-gap-horizontal"]) || 16, min: 0, max: 100 });
  gapH.addEventListener("input", () => {
    const v = `${gapH.value}px`;
    settings["win-gap-horizontal"] = v;
    setVar("--win-gap-horizontal", v);
    save();
  });
  form.appendChild(fieldRow("gap_h", "Gap X", gapH));

  const gapV = Field.create({ type: "number_field", id: "gap_v", value: parseInt(settings["win-gap-vertical"]) || 12, min: 0, max: 100 });
  gapV.addEventListener("input", () => {
    const v = `${gapV.value}px`;
    settings["win-gap-vertical"] = v;
    setVar("--win-gap-vertical", v);
    save();
  });
  form.appendChild(fieldRow("gap_v", "Gap Y", gapV));

  const radius = Field.create({ type: "number_field", id: "win_radius", value: parseInt(settings["win-radius"]) || 16, min: 0, max: 40 });
  radius.addEventListener("input", () => {
    const v = `${radius.value}px`;
    settings["win-radius"] = v;
    setVar("--win-radius", v);
    save();
  });
  form.appendChild(fieldRow("win_radius", "Radius", radius));

  refreshColorInputs();

  return form;
}
