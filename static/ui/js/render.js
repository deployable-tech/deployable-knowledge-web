// render.js — mode-aware schema renderer (safe element factory)
import { labelize, renderValue, safeText } from './formats.js';
import { renderInput } from './inputs.js';
import { el } from './dom.js';

// Resolve a spec + mode into a concrete { elements, order, use_inputs, actions }
function resolveModeSpec(spec, mode = 'default') {
  if (spec.elements) return { elements: spec.elements, order: spec.order || null, use_inputs: true, actions: [] };

  const modes = spec.render_modes || spec.modes || {};
  if (!Object.keys(modes).length) throw new Error("renderBySchema: spec has no elements or modes");

  let sel = modes[mode] || modes.default || Object.values(modes)[0];
  if (!sel) throw new Error(`renderBySchema: mode "${mode}" not found`);

  // collect base → selected with "extends"
  const chain = [];
  (function collect(s){
    if (!s) return;
    chain.unshift(s);
    const ext = s.extends;
    if (!ext) return;
    if (typeof ext === 'string') collect(modes[ext]);
    else if (Array.isArray(ext)) ext.forEach(x => collect(modes[x]));
  })(sel);

  let merged = {};
  let use_inputs = false;
  let order = null;
  let actions = [];

  for (const s of chain) {
    if (s.elements) merged = { ...merged, ...s.elements };
    if (s.order)    order = s.order;
    if (s.use_inputs === true) use_inputs = true;

    // 🔑 action replacement
    if (Array.isArray(s.actions)) {
      if (s.actions_replace === true || s.inherit_actions === false) actions = [];
      actions = actions.concat(s.actions);
    }
  }
  if (sel.use_inputs === false) use_inputs = false;

  return { elements: merged, order, use_inputs, actions };
}

// MAIN
export function renderBySchema(data, spec = {}, opts = {}) {
  if (!data || !spec) throw new Error("renderBySchema: invalid inputs");

  const mode = opts.mode || 'default';
  const { elements, order, use_inputs, actions } = resolveModeSpec(spec, mode);

  const state = { ...data };
  const inputCtrls = new Map();
  const errorNodes = new Map();
  let changeHook = null;

  const controller = {
    getValues: () => ({ ...state }),
    setValue: (key, val) => {
      state[key] = val;
      const ctl = inputCtrls.get(key);
      if (ctl?.set) ctl.set(val);
      emitChange(key, val);
    },
    onChange: (fn) => { changeHook = typeof fn === 'function' ? fn : null; },
    validate: () => {
      let ok = true;
      for (const key of Object.keys(elements)) {
        if (!validateField(key)) ok = false;
      }
      return ok;
    }
  };
  function emitChange(key, val) {
    opts.onChange?.(key, val, controller.getValues());
    changeHook?.(key, val, controller.getValues());
  }

  function validateField(key) {
    const cfg = elements[key];
    if (!cfg) return true;
    const err = errorNodes.get(key);
    if (!err) return true;
    if (cfg?.input?.required) {
      const val = state[key];
      const empty = val == null || val === '' || (Array.isArray(val) && val.length === 0);
      if (empty) {
        err.textContent = 'Required';
        return false;
      }
    }
    err.textContent = '';
    return true;
  }

  const wrap = el('div', { class: 'obj-card', 'data-mode': mode });
  wrap.__controller = controller;

  // header (title + actions[header])
  const header = el('div', { class: 'obj-card__head' });
  for (const [key, cfg] of Object.entries(elements)) {
    if (cfg?.type === 'text' && cfg?.format === 'title' && key in data) {
      header.appendChild(el('h3', { class: 'obj-card__title' }, safeText(data[key])));
    }
  }
  // actions
  const hdrActions = actions.filter(a => (a.where || 'header') === 'header');
  if (hdrActions.length) {
    header.appendChild(buildActions(hdrActions, wrap, controller, opts));
  }
  if (header.childNodes.length) wrap.appendChild(header);

  // body fields
  const body = el('div', { class: 'obj-card__body' });
  const keys = (order && Array.isArray(order))
    ? [...new Set(order.filter(k => k in elements).concat(Object.keys(elements).filter(k => !order.includes(k))))] 
    : Object.keys(elements);

  for (const key of keys) {
    const cfg = elements[key];
    if (!cfg || !(key in data)) continue;
    if (cfg.hidden) continue;
    if (cfg?.type === 'text' && cfg?.format === 'title') continue;

    const labelPos = cfg.labelPosition || 'above';
    const row = el('div', { class: `obj-card__row obj-card__row--${labelPos}` });
    row.appendChild(el('div', { class: 'obj-card__label' }, labelize(key)));

    let valueNode;
    if (use_inputs && cfg.input) {
      const { node, get, set } = renderInput(key, state[key], cfg, (val) => {
        state[key] = val;
        emitChange(key, val);
        validateField(key);
      });
      inputCtrls.set(key, { get, set });
      valueNode = node;
    } else if (typeof cfg.render === 'function') {
      valueNode = cfg.render(state[key], cfg, { data: state, key });
    } else {
      valueNode = renderValue(state[key], cfg);
    }

    const valueWrap = el('div', { class: 'obj-card__value' }, valueNode, el('div', { class: 'obj-card__error' }));
    errorNodes.set(key, valueWrap.lastChild);
    row.appendChild(valueWrap);
    body.appendChild(row);
  }
  wrap.appendChild(body);

  // footer actions
  const ftrActions = actions.filter(a => (a.where || 'header') === 'footer');
  if (ftrActions.length) {
    const foot = el('div', { class: 'obj-card__foot' });
    foot.appendChild(buildActions(ftrActions, wrap, controller, opts));
    wrap.appendChild(foot);
  }

  return wrap;
}

// Convenience wrapper that lets you flip modes and wire onAction
export function renderWithModes(data, spec, { mode = 'default', ...opts } = {}) {
  const host = document.createElement('div');
  const cache = new Map();
  let current = mode;
  const shared = { ...data };

  function build(m) {
    const node = renderBySchema(shared, spec, {
      ...opts,
      mode: m,
      setMode,
      onChange: (k, v, vals) => { Object.assign(shared, vals); opts.onChange?.(k, v, vals); }
    });
    cache.set(m, node);
    return node;
  }

  function setMode(m) {
    if (current === m) return;
    const curNode = cache.get(current);
    if (curNode) Object.assign(shared, curNode.__controller.getValues());
    let next = cache.get(m);
    if (!next) next = build(m);
    else {
      const ctl = next.__controller;
      for (const [k, v] of Object.entries(shared)) ctl.setValue?.(k, v);
    }
    host.replaceChildren(next);
    current = m;
    host.dataset.mode = m;
  }

  const first = build(mode);
  host.appendChild(first);
  host.dataset.mode = mode;

  host.setMode   = setMode;
  host.getMode   = () => current;
  host.getValues = () => cache.get(current).__controller.getValues();
  host.onChange  = (fn) => cache.get(current).__controller.onChange(fn);

  return host;
}

/* ---------- helpers ---------- */

function buildActions(list, wrap, controller, opts) {
  const bar = el('div', { class: 'obj-card__actions' });
  for (const a of list) {
    const btn = el('button', { class: `btn ${a.variant ? `btn--${a.variant}` : ''}` }, a.label || a.id);
    btn.addEventListener('click', async (ev) => {
      btn.disabled = true;
      try {
        const payload = { action:a, node:wrap, controller, setMode:opts.setMode, event:ev };
        if (typeof a.onAction === 'function') {
          await a.onAction(controller.getValues(), payload);
        } else {
          await opts.onAction?.(a, controller.getValues(), payload);
        }
      } finally {
        btn.disabled = false;
      }
    });
    bar.appendChild(btn);
  }
  return bar;
}

