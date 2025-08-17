import { initWindowDnD } from "./dnd.js";
import { initSplitter } from "./splitter.js";
import { createMiniWindowFromConfig, initWindowResize, mountModal } from "./window.js";

export function initFramework() {
  initSplitter();
  initWindowDnD();
  initWindowResize();
}

export function spawnWindow(cfg) {
  const node = createMiniWindowFromConfig(cfg);
  if (cfg.modal) {
    mountModal(node, { fade: cfg.modalFade !== false });
  } else {
    const col = document.getElementById(cfg.col === "right" ? "col-right" : "col-left");
    col.appendChild(node);
  }
  return node;
}
