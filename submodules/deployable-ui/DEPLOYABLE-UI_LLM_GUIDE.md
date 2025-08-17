# Deployable UI — LLM Integration Guide (Library Usage)

This document teaches an LLM (or any dev) how to **use the framework as a library** to build UI quickly and safely.
It focuses on: _what exists, how to wire it, config schemas, and copy‑pasteable examples_.

> TL;DR: Initialize the framework, then `spawnWindow({ window_type, Elements: [...] })`. Use built‑in window types or register your own. Use the `Field` registry for form inputs and views. Theme with CSS variables or the `theme` helpers.


---

## 1) Installation & Bootstrapping

### Required files
- CSS (include in page head, in this order):
  - `src/ui/css/framework.css`
  - `src/ui/css/style.css` (base app styles)
  - Optionally: component CSS files (already imported by framework.css in most setups)

- JS (ES modules):
  - `src/ui/js/framework.js` (init + `spawnWindow`)
  - `src/ui/js/window.js` (built‑in window types registry)
  - `src/ui/js/ui.js` (DOM factory + field registry)
  - `src/ui/js/theme.js` (theme helpers)
  - `src/ui/js/components/*.js` (modal, form, list, select, spinner)
  - `src/ui/js/fields/*.js` (list_view, file_upload, color_picker)
  - `src/ui/js/windows/*.js` (window renderers: generic, chat, text editor, theme editor)

### Minimal HTML scaffold
Your page must provide a **left/right column** layout and a splitter:

```html
<main id="columns" class="columns">
  <section id="col-left" class="col"></section>
  <div id="splitter" class="splitter" role="separator" aria-orientation="vertical"></div>
  <section id="col-right" class="col"></section>
</main>
```

### Boot code
```js
import { initFramework, spawnWindow } from "../src/ui/js/framework.js";

window.addEventListener("DOMContentLoaded", () => {
  initFramework();                // sets up splitter + drag/resize
  spawnWindow({                   // quick test window
    id: "win_hello",
    title: "Hello",
    col: "left",
    window_type: "window_generic",
    Elements: [{ type: "text", html: "<b>Ready.</b>" }],
  });
});
```

---

## 2) Core Concepts

### 2.1 Framework entry points
```js
import { initFramework, spawnWindow } from "src/ui/js/framework.js";
import { registerWindowType } from "src/ui/js/window.js";
```
- `initFramework()` — initialize splitter, drag‑and‑drop, window resize logic.
- `spawnWindow(cfg)` — create and mount a window from a **config object** (see §3). If `cfg.modal` is true, the window mounts as a modal overlay instead of a column.

### 2.2 Window types
The framework renders windows by **type**. Built‑ins:
- `"window_generic"` — form builder + item list (schema‑driven)
- `"window_text_editor"` — textarea editor with optional toolbars
- `"window_chat"` — chat UI with async send handler
- `"window_theme_editor"` — theme variable editor

You can register your own:
```js
import { registerWindowType } from "src/ui/js/window.js";
registerWindowType("my_window", (cfg, winId) => {
  // return an HTMLElement that becomes the .content of the window
  const el = document.createElement("div");
  el.textContent = `My window ${winId}`;
  return el;
});
```

### 2.3 Fields and components
- `ui.el(tag, attrs, children)` — small DOM builder.
- `Field.create({ type, ... })` — construct an input/view by type. Extendable via `Field.renderers[type] = (cfg) => HTMLElement`.
- Provided field renderers:
  - `text_field`, `number_field`, `select`, `textarea`, **plus** advanced fields:
  - `list_view` (filter/sort/page/select templated lists)
  - `file_upload` (hidden `<input type=file>` + list + programmatic APIs)
  - `color_picker` (linked `<input type=color>` + hex text input)

**Component modules** (importable directly if you prefer imperative use):
- `components/form.js` — schema‑driven forms. Returns a **FormController**.
- `components/list.js` — `createItemList({ target, columns, items, actions, getRowId })`.
- `components/select.js` — simple data‑bound select.
- `components/modal.js` — `openModal({ parentWindow, title, size, content, onClose })`.
- `components/spinner.js` — `createSpinner({ inline })`.

> The generic window (`window_generic`) uses `Field.create` + `fieldRow()` to lay out labeled rows.

### 2.4 Theme helpers
```js
import { getVar, setVar, applyThemeSettings, generatePalette } from "src/ui/js/theme.js";

setVar("--h", 270);   // change base hue (HSL). Entire theme updates.
applyThemeSettings(localStorage.getItem("theme")); // or pass an object
generatePalette(210); // derive pos/neg/neutral hues
```

---

## 3) `spawnWindow` config schema

```ts
type WindowConfig = {
  id?: string;            // DOM id
  title?: string;
  col?: "left" | "right"; // ignored if modal
  modal?: boolean;        // if true, mount in overlay
  modalFade?: boolean;    // default true

  resizable?: boolean;    // default true
  dockable?: boolean;     // enable drag/dock behavior

  window_type: string;    // e.g., "window_generic"
  Elements?: FieldConfig[]; // for window_generic

  // Window‑specific options are allowed (see §4)
};
```

#### FieldConfig (generic form rows)
`window_generic` renders `Elements[]` row‑by‑row. Each element becomes a labeled row using `fieldRow()` with optional label positioning.
```ts
type FieldConfig = {
  id?: string;                  // stable id (recommended)
  name?: string;                // label fallback
  label?: string;               // explicit label
  showLabel?: boolean;          // default true
  labelPosition?: "left" | "right" | "top" | "bottom"; // default "left"

  // Field type + per‑type options:
  type: "text" | "text_field" | "number_field" | "select" | "textarea"
      | "list_view" | "file_upload" | "color_picker" | string /* custom */;

  // Common options:
  value?: any;
  placeholder?: string;
  options?: Array<string | { value: string, label?: string }>; // for select
  min?: number; max?: number; step?: number;                    // numeric
  html?: string; // for type: "text" — raw HTML injection (trusted content)
  // ...plus any specific options consumed by custom renderers
};
```

**Item list** inside `window_generic`:
```js
Elements: [
  { type: "item_list", id: "svc_list",
    columns: [
      { key: "id", label: "ID" },
      { key: "name", label: "Name" },
      { key: "model", label: "Model" },
    ],
    items: [ { id:"a1", name:"OpenAI", model:"gpt-4o" } ],
    actions: { edit: (row) => {...}, del: (row) => {...} },
    getRowId: (row) => row.id,
  }
]
```

> `window_generic` forwards `item_list` configs to the list component and everything else to the `Field` registry.


---

## 4) Built‑in window types

### 4.1 `window_generic` (schema‑driven form + list)
**Purpose:** Build forms and lists without writing DOM code.

**Config keys**
- `Elements: FieldConfig[]` (see §3)
- Each element renders via `Field.create()` or as a data list if `type: "item_list"`

**Interacting after mount**
- Recommended: give each element a stable `id` and then fetch its API via the component registry.
  - `getComponent(winId, elementId)` from `src/ui/js/components.js` (returns the API object the renderer registered; e.g., a list might expose `{ render(items) }`, a file upload exposes `{ getFiles(), clear() }`).
  - If you’re wiring your own custom field, call `registerComponent(winId, id, api)` when you create it.

### 4.2 `window_text_editor`
**Purpose:** Simple textarea editor with optional toolbars on any edge.
**Common options**
```ts
{
  window_type: "window_text_editor",
  content?: string,
  placeholder?: string,
  readonly?: boolean,
  monospace?: boolean,
  wordWrap?: boolean,          // default true
  toolbarTop?: ToolbarItem[],
  toolbarBottom?: ToolbarItem[],
  toolbarLeft?: ToolbarItem[],
  toolbarRight?: ToolbarItem[],
}
type ToolbarItem = { label: string, onClick?: (ctx) => void, action?: string };
```
> If you pass an `action` string, handle it via your own dispatch; or attach `onClick` directly. Each toolbar factory receives a context with the textarea element.

### 4.3 `window_chat`
**Purpose:** Chat/LLM UI with autosizing input and Enter‑to‑send.

**Config keys**
```ts
{
  window_type: "window_chat",
  toolbarTop?: ToolbarItem[],
  messages?: Array<{ role: "system"|"user"|"assistant", content: string }>,
  onSend?: async (text) => { return { role:"assistant", content:"..." } | void }
}
```
**Behavior**
- Shift+Enter inserts newline. Enter submits.
- If `onSend` resolves to a message, it is appended. Otherwise, append manually via the returned API (see below).

**Returned API (via component registry)**
Register your chat window under its `winId` to expose typical helpers like:
```ts
appendMessage({ role, content });
getMessages(): Array<{role, content, ts?:number}>;
clear();
setBusy(bool);
```
> Implementation may evolve, but this is the intended surface for LLM usage. Prefer interacting via the **registry** rather than querying DOM.


### 4.4 `window_theme_editor`
**Purpose:** Edit CSS variables of the theme in‑app.
**Uses:** `getVar`, `setVar`, and `generatePalette()` under the hood.
**Notes:** Provides color sync between hex and color input; writes changes to CSS vars (e.g., `--h`, `--win-radius`).


---

## 5) Component APIs (imperative usage)

### 5.1 Form (schema‑driven)
```js
import { /* default export */ } from "src/ui/js/components/form.js";
// Create
const form = createForm({
  target: document.getElementById("slot"),
  fields: [
    { type: "text_field", name: "Title", id: "title" },
    { type: "number_field", name: "Items", id: "items", min: 1, max: 50 },
    { type: "select", name: "Model", id: "model", options: ["gpt-4o", "llama3"] },
  ],
  initial: { title: "Hello", items: 3 },
  submitLabel: "Save",
  onSubmit: (values) => console.log(values),
  onChange: (values) => console.log("changed:", values),
});
// Controller API
form.getValues();
form.setValues({ title: "Updated" });
form.setDisabled(true|false);
form.setErrors({ title: "Required" });
form.isDirty(); // boolean
```

### 5.2 Item list
```js
import { createItemList } from "src/ui/js/components/list.js";
const api = createItemList({
  target: document.getElementById("slot"),
  columns: [{ key:"id", label:"ID" }, { key:"name", label:"Name" }],
  items: [{ id:"1", name:"Alpha" }],
  actions: {
    edit: (row) => console.log("edit", row),
    del:  (row) => console.log("delete", row),
  },
  getRowId: (row) => row.id,
});
// Typical controls
api.setItems(newItems);
api.setLoading(true|false);
api.setError("Message");
```

### 5.3 Modal
```js
import { openModal } from "src/ui/js/components/modal.js";
const { close, on, emit, setTitle, header, body } = openModal({
  parentWindow,                        // optional
  title: "Confirm",
  size: "sm"|"md"|"lg",
  content: document.createTextNode("Are you sure?"),
  onClose: () => console.log("closed"),
});
on("ok", () => ...); emit("ok");
close();
```

### 5.4 Select
```js
import { createSelect } from "src/ui/js/components/select.js";
const sel = createSelect({
  target: document.getElementById("slot"),
  options: [{ value:"gpt-4o", label:"OpenAI GPT‑4o" }, "llama3"],
  value: "llama3",
  onChange: (v) => console.log(v),
});
sel.setValue("gpt-4o"); sel.getValue();
```

### 5.5 File upload (as a Field)
If you use it inside `window_generic`, it registers an API under the component registry:
```js
// After window renders:
import { getComponent } from "src/ui/js/components.js";
const fu = getComponent("win_id", "files");  // ids you configured
fu.getFiles(); fu.clear();
```

### 5.6 Color picker (as a Field)
Renders a linked `input[type=color]` and hex text input. Listen to `input` events on the text input for changes.


---

## 6) DnD / Splitter / Window shell

- **Splitter** (`src/ui/js/splitter.js`) is initialized by `initFramework()` and controls left/right column width via pointer events on `#splitter`.
- **DnD** (`src/ui/js/dnd.js`) enables grabbing a window by its titlebar to undock/drag; it handles close buttons and modal cleanup.
- **Window shell** (`src/ui/js/framework/window.js`) provides a spawn helper used by built‑in window types; it also exposes a minimal controller with `.openModal()` scoped to a window and `.getContentEl()`.

> You normally don’t need to call these directly unless you’re writing a new window type.


---

## 7) Theme & CSS variables (high‑level)

Key variables defined in `framework.css`:
- `--h` (base hue), `--sat` (global saturation bias), `--txt` (text lightness)
- Layout: `--titlebar-height`, `--font-size-base`, `--font-family`, `--win-gap-*`, `--win-radius`
- Palette: `--bg`, `--bg2`, `--panel`, `--panel2`, `--border`, `--text`, `--muted`, plus accent variants (`--positive-*`, `--negative-*`)

Changing `--h` (and friends) recolors the whole UI. Use `generatePalette()` to derive complementary accents from a base hue.


---

## 8) Best‑practice rules for LLMs

1. **Prefer configs over manual DOM.** Use `spawnWindow` + `window_type` and `Elements` instead of building HTML yourself.
2. **Give stable IDs** to `Elements`. Then access behavior via the **component registry** (`getComponent(winId, elementId)`) rather than `querySelector` chains.
3. **Don’t fight layout.** Keep content inside a window’s `.content`. Use provided classes and fields.
4. **Be deterministic.** Avoid random IDs unless you must. If you must, prefix with a known window id.
5. **Respect async send flows.** `window_chat.onSend` can be `async`. Set busy states and append results only when complete.
6. **Keep themes atomic.** Use `setVar("--token", value)` instead of editing CSS text directly.
7. **No direct style overrides** unless necessary. Prefer variables and provided classes.
8. **Don’t attach global listeners to `document`** unless you know they will be cleaned up when the window is closed. Prefer per‑window scoping.
9. **Validate field types.** When using `Field.create`, ensure `type` matches a known renderer—otherwise register your own.


---

## 9) Worked examples

### Example A — Service config editor (form + list in one column)
```js
spawnWindow({
  id: "svc_editor",
  title: "Services",
  col: "left",
  window_type: "window_generic",
  Elements: [
    { type: "text_field", id: "svc_name", label: "Name", placeholder: "ex: openai-prod" },
    { type: "select", id: "svc_model", label: "Model", options: ["gpt-4o", "llama3", "mistral"] },
    { type: "number_field", id: "svc_timeout", label: "Timeout (s)", min: 1, max: 120, value: 30 },
    { type: "file_upload", id: "svc_cert", label: "Client Cert" },
    { type: "item_list", id: "svc_list",
      columns: [{key:"id",label:"ID"},{key:"name",label:"Name"},{key:"model",label:"Model"}],
      items: [],
      actions: { edit:(row)=>..., del:(row)=>... },
      getRowId: (row) => row.id,
    },
  ],
});
```

### Example B — Chat window with async send
```js
spawnWindow({
  id: "chat1",
  title: "Chat",
  col: "right",
  window_type: "window_chat",
  messages: [{ role:"system", content:"You are terse." }],
  onSend: async (text) => {
    const out = await fetch("/api/llm", { method:"POST", body: text }).then(r=>r.text());
    return { role: "assistant", content: out };
  },
  toolbarTop: [{ label:"Clear", onClick: (_, api) => api.clear?.() }],
});
```

### Example C — Register and use a custom field
```js
import { Field } from "src/ui/js/ui.js";
Field.renderers["badge"] = (cfg) => {
  const el = document.createElement("span");
  el.className = "badge";
  el.textContent = cfg.text ?? "Badge";
  return el;
};
spawnWindow({
  id:"w_custom", title:"Custom", col:"left", window_type:"window_generic",
  Elements: [{ type: "badge", id: "b1", label: "Status", text: "OK" }]
});
```


---

## 10) Troubleshooting & Gotchas

- **“Unknown field type”** — You used `Field.create` with a missing renderer. Add one: `Field.renderers["my_type"] = fn`.
- **List/form updates don’t show** — Use the component registry API (e.g., `getComponent(winId, id).render(items)`) instead of replacing DOM nodes.
- **Splitter not working** — The page needs `#columns`, `#col-left`, `#col-right`, and `#splitter`. Call `initFramework()` once on DOMContentLoaded.
- **Drag/close not working** — Titlebar markup is provided by the framework. Don’t remove `.titlebar` or `.js-close` controls from the window shell.
- **Themes don’t persist** — Persist your settings and pass them to `applyThemeSettings()` at boot.


---

## 11) Reference Index (what to import)

```js
// Framework
import { initFramework, spawnWindow } from "src/ui/js/framework.js";
import { registerWindowType } from "src/ui/js/window.js";

// Fields & DOM
import { el, Field } from "src/ui/js/ui.js";

// Components (imperative)
import { openModal } from "src/ui/js/components/modal.js";
import { createItemList } from "src/ui/js/components/list.js";
import { createSelect } from "src/ui/js/components/select.js";
import { createSpinner } from "src/ui/js/components/spinner.js";
import { registerComponent, getComponent, deregisterComponent } from "src/ui/js/components.js";

// Theme
import { getVar, setVar, applyThemeSettings, generatePalette } from "src/ui/js/theme.js";
```

---

### License & Compatibility
- ES Modules. Works in modern evergreen browsers.
- No external runtime dependency (vanilla JS + CSS Variables).

**End of guide.**
