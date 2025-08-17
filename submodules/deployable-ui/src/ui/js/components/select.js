/** Data-bound select component. */
export function createSelect({ target, options = [], value, onChange, emptyLabel = "None" }) {
  const select = document.createElement("select");
  const emptyOpt = document.createElement("option");
  emptyOpt.value = "";
  emptyOpt.textContent = emptyLabel;
  select.appendChild(emptyOpt);
  for (const opt of options) {
    const o = document.createElement("option");
    o.value = typeof opt === "object" ? opt.value : opt;
    o.textContent = typeof opt === "object" ? opt.label : opt;
    select.appendChild(o);
  }
  if (value !== undefined) select.value = value;
  select.addEventListener("change", () => onChange?.(select.value));
  target.appendChild(select);
  return {
    setValue(v) { select.value = v; },
    getValue() { return select.value; },
  };
}

export default { createSelect };
