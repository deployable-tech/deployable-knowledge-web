// Utilities for reading and writing CSS variables and applying saved themes

export function getVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name);
}

export function setVar(name, value) {
  document.documentElement.style.setProperty(name, value);
}

// Apply theme settings from an object, JSON string or localStorage
export function applyThemeSettings(source) {
  let settings = source;

  if (!settings) {
    try {
      const stored = localStorage.getItem("theme");
      if (stored) settings = JSON.parse(stored);
    } catch (e) {
      settings = null;
    }
  } else if (typeof settings === "string") {
    try {
      settings = JSON.parse(settings);
    } catch (e) {
      settings = null;
    }
  }

  if (!settings) return;

  Object.entries(settings).forEach(([key, value]) => {
    setVar(`--${key}`, value);
  });
}

// Derive accent colors from a base hue. Optional positive/negative hues
// allow overriding the default green/red pair. The neutral accent is
// computed opposite the midpoint between the positive and negative hues.
export function generatePalette(baseHue, positiveHue, negativeHue) {
  const pos = positiveHue ?? (baseHue + 120) % 360;
  const neg = negativeHue ?? (baseHue + 300) % 360;
  setVar('--h', baseHue);
  setVar('--positive-h', pos);
  setVar('--negative-h', neg);
}

