const KEY_SESSION = 'dk.session';
const KEY_SEL = 'dk.selection';
const KEY_INACTIVE = 'dk.inactive';

const inactiveSet = new Set();
try {
  const raw = localStorage.getItem(KEY_INACTIVE);
  if (raw) JSON.parse(raw).forEach((id) => inactiveSet.add(id));
} catch {}

function syncInactive() {
  try { localStorage.setItem(KEY_INACTIVE, JSON.stringify([...inactiveSet])); } catch {}
}

export function setSessionId(id) {
  if (id) localStorage.setItem(KEY_SESSION, id);
  else localStorage.removeItem(KEY_SESSION);
}
export function getSessionId() {
  return localStorage.getItem(KEY_SESSION);
}

export function setSelection(sel) {
  try { localStorage.setItem(KEY_SEL, JSON.stringify(sel || {})); } catch {}
}
export function getSelection() {
  try { return JSON.parse(localStorage.getItem(KEY_SEL) || '{}'); } catch { return {}; }
}

export function addInactiveIds(ids = []) {
  ids.forEach((id) => inactiveSet.add(id));
  syncInactive();
}
export function removeInactiveIds(ids = []) {
  ids.forEach((id) => inactiveSet.delete(id));
  syncInactive();
}
export function getInactiveIds() {
  return [...inactiveSet];
}

export function getTopK() {
  const el = document.getElementById('top-k-select');
  return el ? Number(el.value) || null : null;
}
