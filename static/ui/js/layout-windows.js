// layout-windows.js
//
// Tiny layout engine: tile, cascade, smart (squarified treemap)
// Input windows are rectangles: { width, height, x?, y?, minWidth?, minHeight?, id? }
// Workspace: { width, height, x?, y?, padding?, gap? }
//
// Usage:
//   import { layoutWindows, LayoutModes } from './layout-windows.js';
//   const out = layoutWindows({ width: 1280, height: 800 }, windows, LayoutModes.SMART, { gap: 8 });
/*
Example:

import { layoutWindows, LayoutModes } from './layout-windows.js';

const workspace = { width: 1440, height: 900, padding: 12, gap: 8 };
const windows = [
  { id: 'A', width: 520, height: 380 },
  { id: 'B', width: 640, height: 420 },
  { id: 'C', width: 480, height: 360 },
  { id: 'D', width: 800, height: 600 },
];

const tiled = layoutWindows(workspace, windows, LayoutModes.TILE);
const cascaded = layoutWindows(workspace, windows, LayoutModes.CASCADE, { offsetX: 36, offsetY: 28 });
const smart = layoutWindows(workspace, windows, LayoutModes.SMART);
console.log({ tiled, cascaded, smart });

*/


export const LayoutModes = Object.freeze({
  TILE: "tile",
  CASCADE: "cascade",
  SMART: "smart",
});

/**
 * Main entry
 * @param {{width:number,height:number,x?:number,y?:number,padding?:number,gap?:number}} workspace
 * @param {Array<Object>} windows
 * @param {"tile"|"cascade"|"smart"} mode
 * @param {Object} [opts]
 * @returns {Array<{x:number,y:number,width:number,height:number,id?:any}>}
 */
export function layoutWindows(workspace, windows, mode = "tile", opts = {}) {
  const ws = normalizeWorkspace(workspace);
  const list = (windows || []).map((w, i) => ({
    id: w.id ?? i,
    width: clampNum(w.width || 200, 1, ws.width),
    height: clampNum(w.height || 150, 1, ws.height),
    minWidth: clampNum(w.minWidth ?? 1, 1, ws.width),
    minHeight: clampNum(w.minHeight ?? 1, 1, ws.height),
    // keep originals for smart mode
    _area: Math.max(1, (w.width || 200) * (w.height || 150)),
    _idx: i,
  }));

  switch (mode) {
    case LayoutModes.TILE:
      return tileLayout(ws, list, opts);
    case LayoutModes.CASCADE:
      return cascadeLayout(ws, list, opts);
    case LayoutModes.SMART:
      return smartLayout(ws, list, opts);
    default:
      return tileLayout(ws, list, opts);
  }
}

/* ------------------------- TILE (uniform grid) ------------------------- */
/**
 * Options:
 *  - gap?: number (default 8)
 *  - padding?: number (overrides workspace padding)
 *  - preserveAspect?: boolean (default false) – centers inside cells
 */
export function tileLayout(workspace, windows, opts = {}) {
  const gap = num(opts.gap, workspace.gap);
  const padding = num(opts.padding, workspace.padding);

  const W = Math.max(1, workspace.width - 2 * padding);
  const H = Math.max(1, workspace.height - 2 * padding);
  const n = windows.length;
  if (n === 0) return [];

  // choose columns close to sqrt(n * aspect)
  const idealCols = Math.sqrt((n * W) / H);
  const candidates = [Math.max(1, Math.floor(idealCols)), Math.max(1, Math.ceil(idealCols))];

  let best = { cols: 1, rows: n, util: -Infinity, cellW: W, cellH: H / n };
  for (const cols of candidates) {
    const rows = Math.ceil(n / cols);
    const cellW = (W - gap * (cols - 1)) / cols;
    const cellH = (H - gap * (rows - 1)) / rows;
    const util = (cellW * cellH * n) / (W * H); // utilization heuristic
    if (util > best.util) best = { cols, rows, util, cellW, cellH };
  }

  const out = [];
  let k = 0;
  for (let r = 0; r < best.rows; r++) {
    for (let c = 0; c < best.cols; c++) {
      if (k >= n) break;
      const x = round(padding + c * (best.cellW + gap));
      const y = round(padding + r * (best.cellH + gap));
      let w = Math.max(1, Math.floor(best.cellW));
      let h = Math.max(1, Math.floor(best.cellH));

      if (opts.preserveAspect) {
        const orig = windows[k];
        const scale = Math.min(best.cellW / orig.width, best.cellH / orig.height, 1);
        w = Math.max(orig.minWidth, Math.floor(orig.width * scale));
        h = Math.max(orig.minHeight, Math.floor(orig.height * scale));
        // center inside the cell
        const cx = x + Math.floor((best.cellW - w) / 2);
        const cy = y + Math.floor((best.cellH - h) / 2);
        out.push({ id: orig.id, x: cx, y: cy, width: w, height: h });
      } else {
        out.push({ id: windows[k].id, x, y, width: w, height: h });
      }
      k++;
    }
  }
  return out;
}

/* ------------------------- CASCADE ------------------------- */
/**
 * Options:
 *  - gap?: number (default 8)  (used as window spacing margin)
 *  - padding?: number
 *  - offsetX?: number (default 32)
 *  - offsetY?: number (default 32)
 *  - baseScale?: number (default 0.85) – scale windows that exceed workspace
 */
export function cascadeLayout(workspace, windows, opts = {}) {
  const gap = num(opts.gap, workspace.gap);
  const padding = num(opts.padding, workspace.padding);
  const offsetX = num(opts.offsetX, 32);
  const offsetY = num(opts.offsetY, 32);
  const baseScale = num(opts.baseScale, 0.85);

  const W = Math.max(1, workspace.width - 2 * padding);
  const H = Math.max(1, workspace.height - 2 * padding);

  // how many offsets before we'd fall off an edge
  const maxStepsX = Math.max(1, Math.floor((W - gap) / offsetX));
  const maxStepsY = Math.max(1, Math.floor((H - gap) / offsetY));
  const wrap = Math.max(1, Math.min(maxStepsX, maxStepsY));

  const out = [];
  windows.forEach((win, i) => {
    // scale to fit if oversized
    let w = Math.floor(Math.min(win.width, W));
    let h = Math.floor(Math.min(win.height, H));
    if (w > W || h > H || w * h > 0.9 * W * H) {
      const s = Math.min((W * baseScale) / win.width, (H * baseScale) / win.height, 1);
      w = Math.max(win.minWidth, Math.floor(win.width * s));
      h = Math.max(win.minHeight, Math.floor(win.height * s));
    }

    const step = i % wrap;
    let x = round(padding + step * offsetX);
    let y = round(padding + step * offsetY);

    // keep fully inside
    x = clampNum(x, padding, padding + W - w);
    y = clampNum(y, padding, padding + H - h);

    // give a small margin from edges
    x = clampNum(x, padding + gap, padding + W - w - gap);
    y = clampNum(y, padding + gap, padding + H - h - gap);

    out.push({ id: win.id, x, y, width: w, height: h });
  });
  return out;
}

/* ------------------------- SMART (squarified treemap) ------------------------- */
/**
 * Packs windows by relative original area, making rectangles as square as possible.
 * Preserves order on output.
 * Options:
 *  - gap?: number (default 8)
 *  - padding?: number
 *  - minAspect?: number (default 0.35) soft guard against noodle strips
 */
export function smartLayout(workspace, windows, opts = {}) {
  const gap = num(opts.gap, workspace.gap);
  const padding = num(opts.padding, workspace.padding);
  const minAspect = num(opts.minAspect, 0.35);

  const W = Math.max(1, workspace.width - 2 * padding);
  const H = Math.max(1, workspace.height - 2 * padding);
  const areaTotal = W * H;

  if (!windows.length) return [];

  // sort by area desc, but remember original index
  const items = windows
    .map(w => ({ ...w }))
    .sort((a, b) => b._area - a._area);

  const areas = items.map(it => (it._area / sum(items.map(i => i._area))) * areaTotal);

  const root = { x: padding, y: padding, width: W, height: H };
  const rows = squarify(areas, root, minAspect);

  // lay out rows
  const placed = [];
  let cursorX = root.x, cursorY = root.y;
  let availW = root.width, availH = root.height;
  let idx = 0;

  for (const row of rows) {
    const horizontal = availW >= availH; // decide orientation by remaining space
    if (horizontal) {
      const rowArea = sum(row);
      const rowH = Math.max(1, Math.floor(rowArea / availW));
      const innerH = rowH - gap; // leave a gap below the row
      let x = cursorX;
      for (const a of row) {
        const w = Math.max(1, Math.floor(a / Math.max(1, innerH)));
        const rect = {
          x: x,
          y: cursorY,
          width: Math.max(1, w - gap),
          height: Math.max(1, innerH),
        };
        placed.push(rect);
        x += w;
      }
      cursorY += rowH;
      availH -= rowH;
    } else {
      const colArea = sum(row);
      const colW = Math.max(1, Math.floor(colArea / availH));
      const innerW = colW - gap; // gap to the right of the column
      let y = cursorY;
      for (const a of row) {
        const h = Math.max(1, Math.floor(a / Math.max(1, innerW)));
        const rect = {
          x: cursorX,
          y: y,
          width: Math.max(1, innerW),
          height: Math.max(1, h - gap),
        };
        placed.push(rect);
        y += h;
      }
      cursorX += colW;
      availW -= colW;
    }
  }

  // Map the placed rects back to original window order
  // Clamp to min sizes and workspace bounds; round ints.
  const outBySorted = items.map((it, i) => {
    const p = placed[i] || { x: padding, y: padding, width: 10, height: 10 };
    const w = clampNum(Math.floor(p.width), it.minWidth, workspace.width);
    const h = clampNum(Math.floor(p.height), it.minHeight, workspace.height);
    const x = clampNum(Math.floor(p.x), 0, workspace.width - w);
    const y = clampNum(Math.floor(p.y), 0, workspace.height - h);
    return { id: it.id, x, y, width: w, height: h, _idx: it._idx };
  });

  const out = new Array(windows.length);
  for (const r of outBySorted) out[r._idx] = pick(r, ["id", "x", "y", "width", "height"]);
  return out;
}

/* --------------------------- Squarify core --------------------------- */
/**
 * Produces rows of areas using the "squarified treemap" heuristic.
 * @param {number[]} areas  (descending order recommended)
 * @param {{width:number,height:number}} rect
 * @param {number} minAspect  soft guard
 * @returns {number[][]}
 */
function squarify(areas, rect, minAspect = 0.35) {
  const rows = [];
  let remaining = areas.slice();
  while (remaining.length) {
    let row = [];
    let w = Math.max(1, Math.min(rect.width, rect.height)); // effective side
    let lastWorst = Infinity;

    while (remaining.length) {
      const a = remaining[0];
      const newRow = row.concat([a]);
      const worst = worstAspect(newRow, w);
      if (worst <= lastWorst && worst >= minAspect) {
        row = newRow;
        lastWorst = worst;
        remaining.shift();
      } else {
        break;
      }
    }

    if (row.length === 0) {
      // force place one if constraints are too tight
      row = [remaining.shift()];
    }
    rows.push(row);
  }
  return rows;
}

function worstAspect(row, w) {
  const sumA = sum(row);
  const s = sumA / w;
  let worst = 0;
  for (const a of row) {
    const side = a / s;
    const aspect = Math.min(side / s, s / side);
    if (aspect > worst) worst = aspect;
  }
  // transform so "closer to 1 is better"; return >=0 with higher worse-ness
  return 1 / Math.max(1e-6, Math.min(1, worst));
}

/* ----------------------------- utils ----------------------------- */
function normalizeWorkspace(ws) {
  const x = num(ws.x, 0), y = num(ws.y, 0);
  const width = clampNum(Math.floor(ws.width), 1, Number.MAX_SAFE_INTEGER);
  const height = clampNum(Math.floor(ws.height), 1, Number.MAX_SAFE_INTEGER);
  const padding = num(ws.padding, 8);
  const gap = num(ws.gap, 8);
  return { x, y, width, height, padding, gap };
}
function num(v, fallback) { return Number.isFinite(v) ? Number(v) : fallback; }
function sum(a) { return a.reduce((t, v) => t + v, 0); }
function clampNum(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function round(v) { return Math.round(v); }
function pick(obj, keys) { const o = {}; for (const k of keys) o[k] = obj[k]; return o; }
