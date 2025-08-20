// dom.js - shared DOM helpers
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

export function enableClickToggle(host, { ignore = 'button,[data-action]' } = {}) {
  if (!host?.getMode || !host?.setMode) return;
  host.addEventListener('click', (e) => {
    if (e.target.closest(ignore)) return;
    const mode = host.getMode();
    host.setMode(mode === 'mini' ? 'default' : 'mini');
  });
}
