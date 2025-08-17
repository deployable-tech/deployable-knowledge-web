import { el } from "../ui.js";

/**
 * ListView — feature-rich list component with:
 * - filtering, sorting, paging
 * - templating (avatar/title/subtitle/badges/meta/extra/actions)
 * - single/multi selection with stable keying
 *
 * Config (partial):
 * {
 *   id?: string,
 *   items?: Array<any>,
 *   keyField?: string,         // default "id"
 *   filter?: (item) => boolean,
 *   sort?: (a,b) => number,
 *   page?: number, pageSize?: number,
 *   emptyText?: string,
 *   selectable?: boolean,      // enable row selection
 *   multi?: boolean,           // multi-select if true
 *   selected?: (item) => bool, // initial selection detector
 *   onRowClick?: (item, idx, ev) => void,
 *   onSelectChange?: (sel) => void, // sel is item or array of items
 *   template?: {
 *     avatar?: (item) => HTMLElement|string,
 *     title?: (item) => HTMLElement|string,
 *     subtitle?: (item) => HTMLElement|string,
 *     badges?: Array<(item) => HTMLElement|string>,
 *     meta?: (item) => HTMLElement|string,
 *     extra?: (item) => HTMLElement|false|undefined,
 *     actions?: Array<{label?:string, icon?:HTMLElement|string, title?:string, variant?:'primary'|'danger', onClick?: (item, idx, ev)=>void}>
 *   }
 * }
 */
export class ListView {
  constructor(cfg = {}) {
    this.config = { keyField: "id", page: 1, ...cfg };
    this.container = el("div", { class: "list-view", id: this.config.id });
    // selection tracked by stable key; fall back to object identity if no key
    this._selectedKeys = new Set();
  }

  // ---------- helpers ----------
  _keyOf(item, idx) {
    const kf = this.config.keyField || "id";
    return item && (kf in item) ? item[kf] : `__idx_${idx}`;
  }

  _toNode(res, cls) {
    if (res == null) return null;
    const node = typeof res === "string" ? el("div", { class: cls }, [res]) : res;
    if (node.classList) node.classList.add(cls);
    return node;
  }

  _makeAction(def, item, index) {
    const cls =
      def.variant === "danger" ? "btn btn-danger" :
      def.variant === "primary" ? "btn btn-primary" :
      "btn";
    const btn = el("button", { class: cls, title: def.title || def.label || "" }, [def.icon || def.label || ""]);
    btn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      def.onClick?.(item, index, ev);
    });
    return btn;
  }

  // ---------- selection ----------
  _isSelectedKey(key) {
    return this._selectedKeys.has(key);
  }

  _toggleSelectionByKey(key, row, item) {
    const { selectable, multi, onSelectChange } = this.config;
    if (!selectable) return;

    if (multi) {
      if (this._selectedKeys.has(key)) {
        this._selectedKeys.delete(key);
        row.classList.remove("is-selected");
      } else {
        this._selectedKeys.add(key);
        row.classList.add("is-selected");
      }
    } else {
      // single-select
      this._selectedKeys.clear();
      // clear DOM
      this.container.querySelectorAll(".lv-row.is-selected")
        .forEach((elmt) => elmt.classList.remove("is-selected"));
      this._selectedKeys.add(key);
      row.classList.add("is-selected");
    }

    if (onSelectChange) {
      const items = this._currentItems || [];
      const selectedItems = items.filter((it, i) => this._isSelectedKey(this._keyOf(it, i)));
      onSelectChange(multi ? selectedItems : selectedItems[0] ?? null);
    }
  }

  getSelection() {
    const items = this._currentItems || [];
    const selectedItems = items.filter((it, i) => this._isSelectedKey(this._keyOf(it, i)));
    return this.config.multi ? selectedItems.slice() : (selectedItems[0] ?? null);
  }

  setSelection(sel) {
    const wantKeys = new Set();
    const items = this._currentItems || [];
    const kf = this.config.keyField || "id";
    const arr = Array.isArray(sel) ? sel : (sel == null ? [] : [sel]);

    // Convert requested selection into keys
    for (const it of arr) {
      if (typeof it === "object" && it !== null) {
        wantKeys.add(this._keyOf(it, items.indexOf(it)));
      } else {
        // assume it's a key
        wantKeys.add(it);
      }
    }

    // update set
    this._selectedKeys = wantKeys;

    // update DOM
    this.container.querySelectorAll(".lv-row").forEach((row) => {
      const key = row.getAttribute("data-key");
      if (!key) return;
      row.classList.toggle("is-selected", this._selectedKeys.has(key));
    });

    // notify
    this.config.onSelectChange?.(this.getSelection());
  }

  // ---------- render ----------
  renderItems() {
    let items = Array.isArray(this.config.items) ? [...this.config.items] : [];

    if (this.config.filter) items = items.filter(this.config.filter);
    if (this.config.sort) items.sort(this.config.sort);

    if (this.config.pageSize) {
      const page = this.config.page || 1;
      const start = (page - 1) * this.config.pageSize;
      items = items.slice(start, start + this.config.pageSize);
    }

    this._currentItems = items; // keep for selection mapping
    this.container.innerHTML = "";

    if (items.length === 0) {
      this.container.appendChild(
        el("div", { class: "lv-row" }, [this.config.emptyText || "No items"])
      );
      return;
    }

    const tpl = this.config.template || {};
    items.forEach((item, idx) => {
      const key = this._keyOf(item, idx);

      const row = el("div", { class: "lv-row", "data-key": String(key) });

      if (tpl.avatar) {
        const av = this._toNode(tpl.avatar(item), "lv-avatar");
        if (av) row.appendChild(av);
      }

      const main = el("div", { class: "lv-main" });
      if (tpl.title) {
        const t = this._toNode(tpl.title(item), "lv-title");
        if (t) main.appendChild(t);
      }
      if (tpl.subtitle) {
        const s = this._toNode(tpl.subtitle(item), "lv-subtitle");
        if (s) main.appendChild(s);
      }
      if (tpl.badges && tpl.badges.length) {
        const bWrap = el("div", { class: "lv-badges" });
        tpl.badges.forEach((fn) => {
          const b = fn(item);
          bWrap.appendChild(typeof b === "string" ? el("span", {}, [b]) : b);
        });
        main.appendChild(bWrap);
      }
      row.appendChild(main);

      if (tpl.meta) {
        const m = this._toNode(tpl.meta(item), "lv-meta");
        if (m) row.appendChild(m);
      }

      if (tpl.extra) {
        const ex = tpl.extra(item);
        if (ex) row.appendChild(ex);
      }

      if (tpl.actions && tpl.actions.length) {
        const act = el("div", { class: "lv-actions" });
        tpl.actions.forEach((a) => act.appendChild(this._makeAction(a, item, idx)));
        row.appendChild(act);
      }

      // initial selection support
      if (this.config.selectable) {
        const isSel = typeof this.config.selected === "function" ? !!this.config.selected(item) : false;
        if (isSel) {
          this._selectedKeys.add(String(key));
          row.classList.add("is-selected");
        }
        row.addEventListener("click", (ev) => {
          this.config.onRowClick?.(item, idx, ev);
          this._toggleSelectionByKey(String(key), row, item);
        });
      } else if (this.config.onRowClick) {
        row.addEventListener("click", (ev) => this.config.onRowClick(item, idx, ev));
      }

      if (this._selectedKeys.has(String(key))) {
        row.classList.add("is-selected");
      }

      this.container.appendChild(row);
    });
  }

  update(patch = {}) {
    this.config = { ...this.config, ...patch };
    this.renderItems();
  }
}

/**
 * Backwards-compatibility adapter for old code that expects a function
 * returning an HTMLElement. It creates a ListView, renders it, and returns
 * the container. You can still interact via returnedElement.update(),
 * returnedElement.getSelection(), returnedElement.setSelection().
 */
export function renderListView(cfg = {}) {
  const view = new ListView(cfg);
  // add the helper methods to the container so legacy code still works
  view.renderItems();
  const elRef = view.container;
  elRef.update = (c) => view.update(c);
  elRef.getSelection = () => view.getSelection();
  elRef.setSelection = (s) => view.setSelection(s);
  return elRef;
}
