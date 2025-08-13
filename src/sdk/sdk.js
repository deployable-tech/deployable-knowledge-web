// sdk.js — minimal browser SDK wired to the fake API
const BASE = '';
function isSafe(method){ return /^(GET|HEAD|OPTIONS|TRACE)$/i.test(method); }

async function fetchJSON(path, { method='GET', headers={}, body=null } = {}) {
  const init = {
    method,
    headers: { ...headers },
    body,
    credentials: 'same-origin',
  };

  if (!isSafe(method)) {
    // Pull CSRF token from cookie when needed
    const csrf = document.cookie.split('; ').find(s => s.startsWith('csrf_token='));
    if (csrf) {
      const token = csrf.split('=')[1];
      init.headers['X-CSRF-Token'] = decodeURIComponent(token);
    }
  }

  const res = await fetch(BASE + path, init);
  if (!res.ok) {
    const txt = await res.text().catch(()=> '');
    throw new Error(`HTTP ${res.status} on ${path}: ${txt}`);
  }
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) return res.json();
  // fallback: last line JSON
  const t = await res.text();
  try { return JSON.parse((t.trim().split(/\n+/)).slice(-1)[0]); }
  catch { return { ok: true, body: t }; }
}

// ---- Sessions ----
export async function beginUserSession(){
  // start the user session (sets session_id + csrf_cookie)
  await fetch('/begin', { credentials: 'same-origin' }); // allow redirect
}
export async function getUser(){ return fetchJSON('/user'); }

export async function getOrCreateChatSession(){
  try {
    const data = await fetchJSON('/session');
    return data;
  } catch(_) {
    // fallback to POST with CSRF
    return fetchJSON('/session', { method: 'POST' });
  }
}
export async function listSessions(){ return fetchJSON('/sessions'); }
export async function getSession(id){ return fetchJSON(`/sessions/${encodeURIComponent(id)}`); }

// ---- Documents ----
export async function listDocuments(){ return fetchJSON('/documents'); }

// ---- Segments ----
export async function listSegments(source){
  const q = source ? `?source=${encodeURIComponent(source)}` : '';
  return fetchJSON(`/segments${q}`);
}
export async function getSegment(id){ return fetchJSON(`/segments/${encodeURIComponent(id)}`); }
export async function deleteSegment(id){ return fetchJSON(`/segments/${encodeURIComponent(id)}`, { method: 'DELETE' }); }

// ---- Chat (non-stream) ----
export async function chat({ message, session_id, persona = '', inactive = [], template_id = '', top_k = 6 }){
  const fd = new FormData();
  fd.set('message', message);
  if (session_id) fd.set('session_id', session_id);
  if (persona) fd.set('persona', persona);
  if (inactive && inactive.length) fd.set('inactive', JSON.stringify(inactive));
  if (template_id) fd.set('template_id', template_id);
  fd.set('top_k', String(top_k));

  // endpoint expected from the original app; your dev server can stub it later
  return fetchJSON('/chat?stream=false', { method: 'POST', body: fd });
}
