/** Toast notifications and async helpers. */

const containerId = "toast-container";
function ensureContainer() {
  let c = document.getElementById(containerId);
  if (!c) {
    c = document.createElement("div");
    c.id = containerId;
    c.className = "toast-container";
    document.body.appendChild(c);
  }
  return c;
}

/** Show a toast message. */
export function showToast({ type = "info", message, timeoutMs = 3000 }) {
  const c = ensureContainer();
  const el = document.createElement("div");
  el.className = `toast toast-${type}`;
  el.textContent = message;
  c.appendChild(el);
  setTimeout(() => {
    el.remove();
    if (!c.children.length) c.remove();
  }, timeoutMs);
}

/** Wrap an async function with loading/error callbacks. */
export async function withAsyncState(promise, { onLoading, onError, onData }) {
  try {
    onLoading?.(true);
    const data = await promise;
    onData?.(data);
    return data;
  } catch (e) {
    onError?.(e);
    throw e;
  } finally {
    onLoading?.(false);
  }
}

export default { showToast, withAsyncState };
