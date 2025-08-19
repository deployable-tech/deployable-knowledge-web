// ./inputs.js - Renders the inputs based on schema

/* -------------------- inputs -------------------- */

export function renderInput(key, val, cfg, onChange) {
  const ic = cfg.input || {};
  const t = (ic.type || inferInputType(cfg)).toLowerCase();
  const common = (elNode) => {
    if (ic.placeholder) elNode.setAttribute('placeholder', ic.placeholder);
    if (ic.disabled) elNode.disabled = true;
    if (ic.readonly) elNode.readOnly = true;
    if (ic.required) elNode.required = true;
    return elNode;
  };

  // text
  if (t === 'text') {
    const input = common(el('input', { type: 'text', class: 'in in-text', value: val ?? '' }));
    input.addEventListener('input', () => onChange(input.value));
    return wrapCtrl(input, () => input.value, (v) => input.value = v ?? '');
  }


  if (t === 'textarea') {
    const isJSON = cfg.type === 'json' || cfg.format === 'json_as_text' || ic.json === true;
    const initial = isJSON
      ? tryStringify(val ?? {}, 2)
      : (val ?? '');

    const ta = common(el('textarea', { class: 'in in-textarea' }, initial));
    if (ic.rows) ta.rows = ic.rows;

    ta.addEventListener('input', () => {
      if (isJSON) {
        const s = ta.value.trim();
        try { onChange(s ? JSON.parse(s) : {}); }
        catch { onChange(s); } // fallback to raw string if user breaks JSON
      } else {
        onChange(ta.value);
      }
    });

    return wrapCtrl(ta,
      () => isJSON ? safeTryParse(ta.value) : ta.value,
      (v)  => ta.value = isJSON ? tryStringify(v ?? {}, 2) : (v ?? '')
    );
  }
  // number
  if (t === 'number') {
    const input = common(el('input', { type: 'number', class: 'in in-number' }));
    if (ic.min != null) input.min = String(ic.min);
    if (ic.max != null) input.max = String(ic.max);
    if (ic.step != null) input.step = String(ic.step);
    input.value = (val ?? '') === '' ? '' : String(val);
    input.addEventListener('input', () => {
      const raw = input.value;
      onChange(raw === '' ? null : (ic.integer ? parseInt(raw, 10) : parseFloat(raw)));
    });
    return wrapCtrl(input, () => (input.value === '' ? null : Number(input.value)), (v) => input.value = (v ?? '') === '' ? '' : String(v));
  }

  // select / dropdown
  if (t === 'select' || t === 'dropdown') {
    const select = common(el('select', { class: 'in in-select' }));
    applyOptions(select, ic.options ?? ic.enum ?? [], val);
    select.addEventListener('change', () => onChange(normalizeSelectValue(select.value, ic)));
    return wrapCtrl(select, () => normalizeSelectValue(select.value, ic), (v) => { select.value = stringifyOptValue(v); });
  }

  // combo (text input with datalist suggestions)
  if (t === 'combo') {
    const listId = `dl_${key}_${Math.random().toString(36).slice(2, 8)}`;
    const input = common(el('input', { type: 'text', class: 'in in-text', list: listId, value: val ?? '' }));
    const dl = el('datalist', { id: listId });
    applyDatalist(dl, ic.options ?? ic.enum ?? []);
    input.addEventListener('input', () => onChange(input.value));
    const wrapper = el('div', { class: 'combo-wrap' }, input, dl);
    return wrapCtrl(wrapper, () => input.value, (v) => (input.value = v ?? ''));
  }

  // slider (range)
  if (t === 'slider' || t === 'range') {
    const min = ic.min ?? 0, max = ic.max ?? 100, step = ic.step ?? 1;
    const input = common(el('input', { type: 'range', class: 'in in-range' }));
    input.min = String(min); input.max = String(max); input.step = String(step);
    input.value = String(clampNumber(val ?? min, min, max));
    const readout = el('span', { class: 'range-readout mono' }, input.value);
    input.addEventListener('input', () => { readout.textContent = input.value; onChange(Number(input.value)); });
    const wrap = el('div', { class: 'range-wrap' }, input, readout);
    return wrapCtrl(wrap, () => Number(input.value), (v) => { input.value = String(clampNumber(v ?? min, min, max)); readout.textContent = input.value; });
  }

  // bool -> checkbox by default (unless user forces a different input type)
  if (t === 'checkbox' || cfg.type === 'bool' || cfg.type === 'boolean') {
    const box = common(el('input', { type: 'checkbox', class: 'in in-check' }));
    box.checked = !!val;
    box.addEventListener('change', () => onChange(!!box.checked));
    return wrapCtrl(box, () => !!box.checked, (v) => { box.checked = !!v; });
  }

  // fallback to text
  const input = common(el('input', { type: 'text', class: 'in in-text', value: val ?? '' }));
  input.addEventListener('input', () => onChange(input.value));
  return wrapCtrl(input, () => input.value, (v) => input.value = v ?? '');
}

function normalizeSelectValue(v, ic) {
  if (!ic) return v;
  if (ic.number) {
    const n = Number(v);
    return Number.isNaN(n) ? null : n;
  }
  if (ic.boolean) return v === 'true';
  return v;
}
function clampNumber(v, min, max) {
  const n = Number(v);
  if (Number.isNaN(n)) return min;
  return Math.min(max, Math.max(min, n));
}

function wrapCtrl(node, get, set) { return { node, get, set }; }

function inferInputType(cfg) {
  const t = (cfg?.type || 'text').toLowerCase();
  if (t === 'bool' || t === 'boolean') return 'checkbox';
  if (t === 'date' || t === 'datetime') return 'text'; // keep formatting control external
  if (t === 'json') return 'textarea';
  return 'text';
}

function applyOptions(select, options, value) {
  const opts = normalizeOptions(options);
  for (const o of opts) {
    const opt = el('option', { value: stringifyOptValue(o.value) }, o.label ?? String(o.value));
    select.appendChild(opt);
  }
  if (value != null) select.value = stringifyOptValue(value);
}

function applyDatalist(datalist, options) {
  const opts = normalizeOptions(options);
  for (const o of opts) datalist.appendChild(el('option', { value: String(o.value) }, o.label ?? String(o.value)));
}

function normalizeOptions(options) {
  if (!options) return [];
  if (Array.isArray(options)) {
    return options.map(o => (typeof o === 'object' && o != null && ('value' in o || 'label' in o))
      ? { value: o.value ?? o.label, label: o.label ?? String(o.value ?? '') }
      : { value: o, label: String(o) });
  }
  return [];
}

function stringifyOptValue(v) { return v == null ? '' : String(v); }

// shared element factory (same semantics as formats.el)
export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null) continue;
    if (k === 'class' || k === 'className') node.className = String(v);
    else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, String(v));
  }
  for (const c of children) {
    if (c == null) continue;
    if (c instanceof Node) node.appendChild(c);
    else node.appendChild(document.createTextNode(String(c)));
  }
  return node;
}



function tryStringify(v, space=2){ try { return JSON.stringify(v, null, space); } catch { return String(v); } }
function safeTryParse(s){ try { return JSON.parse(s); } catch { return s; } }