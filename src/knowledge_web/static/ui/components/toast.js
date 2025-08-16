export function showToast({ type = 'info', message = '', timeoutMs = 3000 } = {}) {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), timeoutMs);
}
