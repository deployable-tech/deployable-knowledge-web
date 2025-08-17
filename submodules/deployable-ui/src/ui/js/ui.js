// ui.js — element factory + basic field registry (inputs + views)
import { renderListView } from "./fields/list_view.js";
import { renderFileUpload } from "./fields/file_upload.js";
import { renderColorPicker } from "./fields/color_picker.js";
export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") node.className = v;
    else if (k === "style") Object.assign(node.style, v);
    else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2), v);
    else if (v !== undefined && v !== null) node.setAttribute(k, v);
  }
  for (const child of [].concat(children)) {
    if (child == null) continue;
    node.appendChild(typeof child === "string" ? document.createTextNode(child) : child);
  }
  return node;
}

export function fieldRow(id, labelText, inputEl, opts = {}) {
  const showLabel = opts.showLabel !== false;
  const labelPosition = opts.labelPosition || opts.label_position || "left";
  const classes = ["row", `label-${labelPosition}`];
  if (!showLabel) classes.push("no-label");
  const labelEl = showLabel ? el("label", { for: id }, [labelText]) : null;
  const row = el("div", { class: classes.join(" ") }, []);
  switch (labelPosition) {
    case "right":
      row.appendChild(inputEl);
      if (labelEl) row.appendChild(labelEl);
      break;
    case "top":
      if (labelEl) row.appendChild(labelEl);
      row.appendChild(inputEl);
      break;
    case "bottom":
      row.appendChild(inputEl);
      if (labelEl) row.appendChild(labelEl);
      break;
    case "left":
    default:
      if (labelEl) row.appendChild(labelEl);
      row.appendChild(inputEl);
  }
  return row;
}

export const Field = {
  renderers: {
    "text_field": ({ id, name, placeholder = "", value = "" }) => {
      const input = el("input", { id, name: name || id, class: "input", type: "text", placeholder });
      if (value) input.value = value;
      return input;
    },
    "number_field": ({ id, name, value = 5, min = 1, max = 50 }) => {
      const input = el("input", { id, name: name || id, class: "input", type: "number", value, min, max });
      return input;
    },
    "text_area": ({ id, name, placeholder = "", value = "", rows = 6 }) => {
      const textarea = el("textarea", { id, name: name || id, class: "textarea", placeholder, rows });
      if (value) textarea.value = value;
      return textarea;
    },
    "select": ({ id, name, options = [], value = "" }) => {
      const sel = el("select", { id, name: name || id, class: "input" });
      for (const opt of options) {
        const o = el("option", { value: opt.value }, [opt.label || opt.value]);
        if (opt.value === value) o.selected = true;
        sel.appendChild(o);
      }
      return sel;
    },
    "multi_select": ({ id, name, options = [], value = [] }) => {
      const sel = el("select", { id, name: name || id, class: "input", multiple: "multiple" });
      const vals = Array.isArray(value) ? value : [];
      for (const opt of options) {
        const o = el("option", { value: opt.value }, [opt.label || opt.value]);
        if (vals.includes(opt.value)) o.selected = true;
        sel.appendChild(o);
      }
      return sel;
    },
    "submit_button": ({ id, text = "Submit" }) => {
      return el("button", { id, type: "submit", class: "btn" }, [text]);
    },
 "text": ({ id, text = "", html = null, className = "" }) => {
   const attrs = {};
   if (id) {
     attrs.id = id;
     attrs["data-comp-id"] = id;
   }
   if (className) attrs.class = className;
   const s = el("span", attrs, []);
   if (html != null) s.innerHTML = html;
   else s.appendChild(document.createTextNode(String(text)));
   return s;
 },
  },
  create: (cfg) => {
    const r = Field.renderers[cfg.type];
    if (!r) throw new Error(`Unknown field type: ${cfg.type}`);
    return r(cfg);
  }
};

Field.renderers["list_view"] = renderListView;
Field.renderers["file_upload"] = renderFileUpload;
Field.renderers["color_picker"] = renderColorPicker;
