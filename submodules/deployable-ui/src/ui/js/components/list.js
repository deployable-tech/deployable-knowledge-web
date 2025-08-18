/** Item list component with per-row actions. */

export function createItemList({
  target,
  columns,
  items = [],
  actions = {},
  getRowId,
}) {
  const container = document.createElement("div");
  container.className = "item-list";
  const table = document.createElement("table");
  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  for (const col of columns) {
    const th = document.createElement("th");
    th.textContent = col.label || col.key;
    headerRow.appendChild(th);
  }
  const selectAction = actions.select;
  const otherActions = Object.entries(actions).filter(([name]) => name !== "select");
  if (otherActions.length) {
    const th = document.createElement("th");
    headerRow.appendChild(th);
  }
  thead.appendChild(headerRow);
  table.appendChild(thead);
  const tbody = document.createElement("tbody");
  table.appendChild(tbody);
  container.appendChild(table);

  const state = { items: [] };
  function renderRows() {
    tbody.innerHTML = "";
    if (state.error) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = columns.length + 1;
      td.className = "error";
      td.textContent = state.error;
      tr.appendChild(td);
      tbody.appendChild(tr);
      return;
    }
    if (state.loading) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = columns.length + 1;
      td.textContent = "Loading...";
      tr.appendChild(td);
      tbody.appendChild(tr);
      return;
    }
    if (!state.items.length) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = columns.length + 1;
      td.textContent = "No items";
      tr.appendChild(td);
      tbody.appendChild(tr);
      return;
    }
    for (const item of state.items) {
      const tr = document.createElement("tr");
      tr.dataset.id = getRowId ? getRowId(item) : undefined;
      for (const col of columns) {
        const td = document.createElement("td");
        td.textContent = item[col.key];
        tr.appendChild(td);
      }
      if (otherActions.length) {
        const td = document.createElement("td");
        for (const [name, fn] of otherActions) {
          const btn = document.createElement("button");
          btn.textContent = name;
          btn.addEventListener("click", () => fn(item));
          td.appendChild(btn);
        }
        tr.appendChild(td);
      }
      if (selectAction) {
        tr.classList.add("is-selectable");
        tr.addEventListener("click", (ev) => {
          if (ev.target.closest("button")) return;
          selectAction(item);
        });
      }
      tbody.appendChild(tr);
    }
  }
  const controller = new ListController(state, renderRows);
  controller.setItems(items);
  target.appendChild(container);
  return controller;
}

export class ListController {
  constructor(state, render) {
    this._state = state;
    this._render = render;
  }
  setItems(items) {
    this._state.items = items || [];
    this._state.loading = false;
    this._render();
  }
  setLoading(bool) {
    this._state.loading = bool;
    this._render();
  }
  setError(msg) {
    this._state.error = msg;
    this._render();
  }
}

export default { createItemList };
