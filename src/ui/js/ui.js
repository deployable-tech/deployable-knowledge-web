export function el(tag, props = {}, children = []) {
  const elem = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'style' && v && typeof v === 'object') {
      Object.assign(elem.style, v);
    } else if (k === 'class') {
      elem.className = v;
    } else if (k.startsWith('data-')) {
      elem.setAttribute(k, v);
    } else if (k in elem) {
      // e.g. id
      elem[k] = v;
    } else {
      elem.setAttribute(k, v);
    }
  }
  if (!Array.isArray(children)) children = [children];
  for (const child of children) {
    if (child == null) continue;
    if (typeof child === 'string') {
      elem.appendChild(document.createTextNode(child));
    } else {
      elem.appendChild(child);
    }
  }
  return elem;
}

// Minimal stubs to satisfy existing imports
export class Field {
  constructor(element) {
    this.element = element;
  }
}

export function fieldRow(...els) {
  const row = el('div', { class: 'field-row' });
  els.forEach((e) => {
    if (typeof e === 'string') {
      row.appendChild(document.createTextNode(e));
    } else if (e) {
      row.appendChild(e);
    }
  });
  return row;
}
