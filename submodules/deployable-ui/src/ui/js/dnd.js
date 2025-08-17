// dnd.js — drag and drop between columns, minimize + close behavior
import { dockWindow, undockWindow } from "./window.js";

export function findDraggableWin(e) {
  const titlebar = e.target.closest(".titlebar");
  if (!titlebar) return null;
  if (e.target.closest(".actions") || e.target.closest(".icon-btn")) return null;
  return titlebar.closest(".miniwin");
}

export function calcDragPosition(winStart, pointerStart, e) {
  return {
    left: winStart.x + (e.clientX - pointerStart.x),
    top: winStart.y + (e.clientY - pointerStart.y),
  };
}

const dragState = {
  draggingWin: null,
  isModalDrag: false,
  modalWrap: null,
  winStart: { x: 0, y: 0 },
  pointerStart: { x: 0, y: 0 },
};

let columnsEl = null;
let cols = [];
let dropMarker = null;
let getDropColumnAt = null;

export function handleDragStart(e) {
  const win = findDraggableWin(e);
  if (!win) return;

  dragState.draggingWin = win;
  dragState.isModalDrag = win.classList.contains("modal");
  win.classList.add("dragging");
  if (dragState.isModalDrag) {
    dragState.modalWrap = win.closest('.modal-wrap');
    if (dragState.modalWrap) dragState.modalWrap.style.pointerEvents = 'none';
  } else {
    columnsEl.classList.add("dragging");
  }

  const rect = win.getBoundingClientRect();
  win.style.setProperty("--drag-w", `${rect.width}px`);
  dragState.winStart = { x: rect.left, y: rect.top };
  dragState.pointerStart = { x: e.clientX, y: e.clientY };

  if (!dragState.isModalDrag) {
    Object.assign(win.style, { left: `${rect.left}px`, top: `${rect.top}px` });
  }
}

export function handleDragMove(e) {
  const { draggingWin, isModalDrag } = dragState;
  if (!draggingWin) return;
  const pos = calcDragPosition(dragState.winStart, dragState.pointerStart, e);
  draggingWin.style.left = `${pos.left}px`;
  draggingWin.style.top = `${pos.top}px`;

  if (!isModalDrag) {
    cols.forEach(c => c.classList.remove("drop-candidate"));
    const over = getDropColumnAt(e.clientX, e.clientY);
    if (over) {
      over.classList.add("drop-candidate");
      const siblings = [...over.querySelectorAll('.miniwin')].filter(w => w !== draggingWin);
      let inserted = false;
      for (const sib of siblings) {
        const rect = sib.getBoundingClientRect();
        if (e.clientY < rect.top + rect.height / 2) {
          over.insertBefore(dropMarker, sib);
          inserted = true;
          break;
        }
      }
      if (!inserted) over.appendChild(dropMarker);
    } else if (dropMarker.parentNode) {
      dropMarker.parentNode.removeChild(dropMarker);
    }
  }
}

export function handleDrop(e) {
  const { draggingWin, isModalDrag, modalWrap } = dragState;
  if (!draggingWin) return;
  if (!isModalDrag) {
    const targetCol = dropMarker.parentNode || getDropColumnAt(e.clientX, e.clientY);
    cols.forEach(c => c.classList.remove("drop-candidate"));
    columnsEl.classList.remove("dragging");

    draggingWin.classList.remove("dragging");
    draggingWin.style.left = "";
    draggingWin.style.top = "";
    draggingWin.style.removeProperty("--drag-w");
    draggingWin.style.position = "";
    draggingWin.style.width = "";
    draggingWin.style.pointerEvents = "";
    if (targetCol) {
      if (dropMarker.parentNode === targetCol) {
        targetCol.insertBefore(draggingWin, dropMarker);
      } else {
        targetCol.appendChild(draggingWin);
      }
      if (dropMarker.parentNode) dropMarker.parentNode.removeChild(dropMarker);
      draggingWin.focus({ preventScroll: true });
    }
  } else {
    // When dragging a modal window, just finish the drag without docking.
    draggingWin.classList.remove("dragging");
    draggingWin.style.removeProperty("--drag-w");
  }

  if (modalWrap && document.body.contains(modalWrap)) {
    modalWrap.style.pointerEvents = '';
  }

  dragState.draggingWin = null;
  dragState.isModalDrag = false;
  dragState.modalWrap = null;
}

export function initWindowDnD() {
  columnsEl = document.getElementById("columns");
  cols = [...document.querySelectorAll(".col")];

  dropMarker = document.createElement("div");
  dropMarker.className = "drop-marker";

  getDropColumnAt = (x, y) => {
    const els = document.elementsFromPoint(x, y);
    const hit = els.find(el => el.classList && el.classList.contains("col"));
    return hit || null;
  };

  document.addEventListener("pointerdown", handleDragStart, { passive: true });
  document.addEventListener("pointermove", handleDragMove);
  document.addEventListener("pointerup", handleDrop);

  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".js-min");
    if (!btn) return;
    const win = btn.closest(".miniwin");
    if (!win) return;
    if (!win.classList.contains("collapsed")) {
      win.dataset.prevHeight = win.style.height;
      win.style.height = '';
      win.classList.add("collapsed");
      btn.setAttribute("aria-pressed", "true");
    } else {
      win.classList.remove("collapsed");
      btn.setAttribute("aria-pressed", "false");
      if (win.dataset.prevHeight) {
        win.style.height = win.dataset.prevHeight;
        delete win.dataset.prevHeight;
      }
    }
  });

  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".js-dock-toggle");
    if (!btn) return;
    const win = btn.closest(".miniwin");
    if (!win) return;
    if (win.classList.contains("modal")) {
      dockWindow(win);
      btn.textContent = "⇱";
      btn.setAttribute("title", "Undock");
      btn.setAttribute("aria-label", "Undock");
    } else {
      const rect = win.getBoundingClientRect();
      undockWindow(win, rect);
      btn.textContent = "⇲";
      btn.setAttribute("title", "Dock");
      btn.setAttribute("aria-label", "Dock");
    }
  });

  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".js-close");
    if (!btn) return;
    const win = btn.closest(".miniwin");
    if (!win) return;
    if (win.classList.contains("modal")) {
      const wrap = win.closest(".modal-wrap");
      if (wrap) wrap.remove(); else win.remove();
    } else {
      win.remove();
    }
  });
}
