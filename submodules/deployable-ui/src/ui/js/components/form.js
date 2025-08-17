/**
 * Schema driven form builder.
 * @module components/form
 */

/**
 * Create a form.
 * @param {Object} opts
 * @param {HTMLElement} opts.target
 * @param {Array} opts.fields
 * @param {Object} [opts.initial]
 * @param {string} [opts.submitLabel]
 * @param {Function} [opts.onSubmit]
 * @param {Function} [opts.onChange]
 * @returns {FormController}
 */
export function createForm({
  target,
  fields,
  initial = {},
  submitLabel = "Save",
  onSubmit,
  onChange,
}) {
  const form = document.createElement("form");
  form.className = "ui-form";
  const state = {
    values: { ...initial },
    dirty: false,
    errors: {},
  };

  const inputs = new Map();
  const errorEls = new Map();

  function setError(key, msg) {
    state.errors[key] = msg;
    const el = errorEls.get(key);
    if (el) el.textContent = msg || "";
  }

  function handleChange() {
    state.dirty = true;
    onChange?.({ ...state.values }, state.dirty);
  }

  for (const field of fields) {
    const row = document.createElement("div");
    row.className = "form-row";
    const label = document.createElement("label");
    label.textContent = field.label || field.key;
    label.htmlFor = field.key;
    const inputWrap = document.createElement("div");
    let input;
    switch (field.type) {
      case "number":
      case "text":
        input = document.createElement("input");
        input.type = field.type;
        break;
      case "textarea":
        input = document.createElement("textarea");
        break;
      case "select":
        input = document.createElement("select");
        (field.options || []).forEach((opt) => {
          const o = document.createElement("option");
          o.value = typeof opt === "object" ? opt.value : opt;
          o.textContent = typeof opt === "object" ? opt.label : opt;
          input.appendChild(o);
        });
        break;
      case "toggle":
        input = document.createElement("input");
        input.type = "checkbox";
        break;
      case "json":
        input = document.createElement("textarea");
        break;
      default:
        throw new Error(`Unknown field type ${field.type}`);
    }
    input.id = field.key;
    input.placeholder = field.placeholder || "";
    if (field.type === "toggle") {
      input.checked = initial[field.key] ?? false;
      state.values[field.key] = input.checked;
      input.addEventListener("change", () => {
        state.values[field.key] = input.checked;
        setError(field.key, "");
        handleChange();
      });
    } else {
      const initialValue =
        field.type === "json"
          ? JSON.stringify(initial[field.key] || {}, null, 2)
          : initial[field.key] ?? "";
      input.value = initialValue;
      state.values[field.key] = initial[field.key];
      input.addEventListener("input", () => {
        if (field.type === "json") {
          try {
            state.values[field.key] = JSON.parse(input.value || "{}");
            setError(field.key, "");
          } catch (e) {
            setError(field.key, "Invalid JSON");
          }
        } else if (field.type === "number") {
          const v = input.value;
          state.values[field.key] = v === "" ? null : Number(v);
        } else {
          state.values[field.key] = input.value;
        }
        handleChange();
      });
    }
    inputs.set(field.key, input);
    inputWrap.appendChild(input);
    const err = document.createElement("div");
    err.className = "error";
    errorEls.set(field.key, err);
    row.append(label, inputWrap, err);
    form.appendChild(row);
  }

  const footer = document.createElement("div");
  footer.className = "form-footer";
  const submit = document.createElement("button");
  submit.type = "submit";
  submit.textContent = submitLabel;
  footer.appendChild(submit);
  form.appendChild(footer);

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit?.({ ...state.values });
    state.dirty = false;
  });

  function validate() {
    let ok = true;
    for (const field of fields) {
      const v = state.values[field.key];
      if (field.required && (v === undefined || v === "" || v === null)) {
        setError(field.key, "Required");
        ok = false;
        continue;
      }
      if (field.validate) {
        const msg = field.validate(v);
        if (msg) {
          setError(field.key, msg);
          ok = false;
          continue;
        }
      }
      setError(field.key, "");
    }
    return ok;
  }

  target.appendChild(form);

  return new FormController(state, inputs, errorEls, form);
}

export class FormController {
  constructor(state, inputs, errorEls, form) {
    this._state = state;
    this._inputs = inputs;
    this._errorEls = errorEls;
    this.form = form;
  }
  getValues() {
    return { ...this._state.values };
  }
  setValues(obj) {
    for (const [k, v] of Object.entries(obj)) {
      const input = this._inputs.get(k);
      if (!input) continue;
      if (input.type === "checkbox") {
        input.checked = Boolean(v);
      } else if (input.tagName === "TEXTAREA" && typeof v === "object") {
        input.value = JSON.stringify(v, null, 2);
      } else {
        input.value = v;
      }
      this._state.values[k] = v;
    }
  }
  setDisabled(bool) {
    for (const input of this._inputs.values()) input.disabled = bool;
    this.form.querySelector("button[type=submit]").disabled = bool;
  }
  setErrors(map) {
    for (const [k, msg] of Object.entries(map)) {
      const el = this._errorEls.get(k);
      if (el) el.textContent = msg;
    }
  }
  isDirty() {
    return this._state.dirty;
  }
}

export default { createForm };
