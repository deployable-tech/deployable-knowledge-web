// render.js — mode-aware schema renderer (safe element factory)
import { labelize, renderValue, el, safeText } from './formats.js';
import { renderInput } from './inputs.js';

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
  let changeHook = null;

  const controller = {
    getValues: () => ({ ...state }),
    setValue: (key, val) => {
      state[key] = val;
      const ctl = inputCtrls.get(key);
      if (ctl?.set) ctl.set(val);
      emitChange(key, val);
    },
    onChange: (fn) => { changeHook = typeof fn === 'function' ? fn : null; }
  };
  function emitChange(key, val) {
    opts.onChange?.(key, val, controller.getValues());
    changeHook?.(key, val, controller.getValues());
  }

  const wrap = h('div', { class: 'obj-card', 'data-mode': mode });
  wrap.__controller = controller;

  // header (title + actions[header])
  const header = h('div', { class: 'obj-card__head' });
  for (const [key, cfg] of Object.entries(elements)) {
    if (cfg?.type === 'text' && cfg?.format === 'title' && key in data) {
      header.appendChild(h('h3', { class: 'obj-card__title' }, safeText(data[key])));
    }
  }
  // actions
  const hdrActions = actions.filter(a => (a.where || 'header') === 'header');
  if (hdrActions.length) {
    header.appendChild(buildActions(hdrActions, wrap, controller, opts));
  }
  if (header.childNodes.length) wrap.appendChild(header);

  // body fields
  const body = h('div', { class: 'obj-card__body' });
  const keys = (order && Array.isArray(order))
    ? [...new Set(order.filter(k => k in elements).concat(Object.keys(elements).filter(k => !order.includes(k))))] 
    : Object.keys(elements);

  for (const key of keys) {
    const cfg = elements[key];
    if (!cfg || !(key in data)) continue;
    if (cfg.hidden) continue;
    if (cfg?.type === 'text' && cfg?.format === 'title') continue;

    const row = h('div', { class: 'obj-card__row' });
    row.appendChild(h('div', { class: 'obj-card__label' }, labelize(key)));

    let valueNode;
    if (use_inputs && cfg.input) {
      const { node, get, set } = renderInput(key, state[key], cfg, (val) => {
        state[key] = val;
        emitChange(key, val);
      });
      inputCtrls.set(key, { get, set });
      valueNode = node;
    } else {
      valueNode = renderValue(state[key], cfg);
    }

    row.appendChild(h('div', { class: 'obj-card__value' }, valueNode));
    body.appendChild(row);
  }
  wrap.appendChild(body);

  // footer actions
  const ftrActions = actions.filter(a => (a.where || 'header') === 'footer');
  if (ftrActions.length) {
    const foot = h('div', { class: 'obj-card__foot' });
    foot.appendChild(buildActions(ftrActions, wrap, controller, opts));
    wrap.appendChild(foot);
  }

  return wrap;
}

// Convenience wrapper that lets you flip modes and wire onAction
export function renderWithModes(data, spec, { mode = 'default', ...opts } = {}) {
  const host = document.createElement('div');
  let node = null;

  const draw = () => {
    host.innerHTML = '';
    node = renderBySchema(data, spec, {
      ...opts,
      mode,
      setMode: (m) => { mode = m; draw(); }
    });
    host.appendChild(node);
  };

  draw();

  host.setMode   = (m) => { mode = m; draw(); };
  host.getValues = () => node.__controller.getValues();
  host.onChange  = (fn) => node.__controller.onChange(fn);

  return host;
}

/* ---------- helpers ---------- */

function h(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null) continue;
    node.setAttribute(k, String(v));
  }
  for (const c of children) {
    if (c == null) continue;
    if (c instanceof Node) node.appendChild(c);
    else node.appendChild(document.createTextNode(String(c)));
  }
  return node;
}

function buildActions(list, wrap, controller, opts) {
  const bar = h('div', { class: 'obj-card__actions' });
  for (const a of list) {
    const btn = h('button', { class: `btn ${a.variant ? `btn--${a.variant}` : ''}` }, a.label || a.id);
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
