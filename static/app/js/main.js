import { DKClient } from './sdk.js';
import { setupLLMServiceUI } from './llm_service.js';
import { setupChatUI } from './chat.js';
import { setupDocumentsUI } from './documents.js';

const $ = (id) => document.getElementById(id);
const j = (o) => JSON.stringify(o, null, 2);
const safeParse = (s, fallback) => { try { return JSON.parse(s); } catch { return fallback; } };

// ---- elements ----
const base    = $('base');
const initBtn = $('init');
const prime   = $('prime');
const ensure  = $('ensure');
const sidOut  = $('sid');

const loadServices = $('loadServices');
const refreshSel   = $('refreshSelection');
const svcSel = $('svc');
const modelSel = $('model');
const setSelection = $('setSelection');
const selOut = $('selOut');
const serviceCards = $('serviceCards');
const modelCards = $('modelCards');

const q = $('q');
const topK = $('topK');
const doSearch = $('doSearch');
const searchOut = $('searchOut');

const listDocs = $('listDocs');
const docCount = $('docCount');
const docs = $('docs');
const segSource = $('segSource');
const listSegs = $('listSegs');
const segs = $('segs');
const segView = $('segView');

const persona = $('persona');
const templateId = $('templateId');
const chatTopK = $('chatTopK');
const inactive = $('inactive');
const msg = $('msg');
const send = $('send');
const stream = $('stream');
const meta = $('meta');
const chatOut = $('chatOut');

const files = $('files');
const upload = $('upload');
const ingestAll = $('ingestAll');
const removeSource = $('removeSource');
const removeBtn = $('remove');
const clearDb = $('clearDb');
const ingOut = $('ingOut');

const tplList = $('tplList');
const tplId = $('tplId');
const tplGet = $('tplGet');
const userId = $('userId');
const getSettings = $('getSettings');
const miscOut = $('miscOut');

// ---- state ----
let sdk = null;
let sessionId = null;

// default base -> same host, port 8000
base.value = `${location.protocol}//${location.hostname}:8000`;

function setBusy(el, busy) {
  el.disabled = !!busy;
  if (busy) el.dataset.oldText = el.textContent, el.textContent = '…';
  else if (el.dataset.oldText) el.textContent = el.dataset.oldText;
}

function toastOK(outEl, data) {
  outEl.textContent = (typeof data === 'string') ? data : j(data);
  outEl.classList.remove('err'); outEl.classList.add('ok');
}
function toastERR(outEl, err) {
  outEl.textContent = err?.message || String(err);
  outEl.classList.remove('ok'); outEl.classList.add('err');
}

function ensureSDK() {
  if (!sdk) throw new Error('Init SDK first.');
}

async function ensureSession() {
  ensureSDK();
  const res = await sdk.sessions.ensure();
  sessionId = res.session_id;
  sidOut.textContent = `session_id: ${sessionId}`;
  return sessionId;
}

// ---- init & session ----
initBtn.addEventListener('click', () => {
  try {
    sdk = new DKClient({ baseUrl: base.value });
    window.sdk = sdk;
    selOut.textContent = 'SDK ready.';
  } catch (e) {
    toastERR(selOut, e);
  }
});

prime.addEventListener('click', async () => {
  try {
    ensureSDK();
    setBusy(prime, true);
    await sdk.auth.beginUser();
    toastOK(selOut, 'User session primed via /begin');
  } catch (e) {
    toastERR(selOut, e);
  } finally {
    setBusy(prime, false);
  }
});
ensure.addEventListener('click', async () => {
  try {
    setBusy(ensure, true);
    await ensureSession();
    toastOK(selOut, { session_id: sessionId });
  } catch (e) {
    toastERR(selOut, e);
  } finally {
    setBusy(ensure, false);
  }
});

// ---- search ----
doSearch.addEventListener('click', async () => {
  try {
    ensureSDK();
    setBusy(doSearch, true);
    const res = await sdk.search.run({
      q: q.value,
      topK: Number(topK.value) || 5,
      inactive: safeParse(inactive.value, undefined)
    });
    toastOK(searchOut, res);
  } catch (e) {
    toastERR(searchOut, e);
  } finally {
    setBusy(doSearch, false);
  }
});

// ---- documents & segments ----
setupDocumentsUI({
  getSDK: () => sdk,
  elements: { listDocs, docCount, docs, segSource, listSegs, segs, segView },
  helpers: { ensureSDK, setBusy, toastERR }
});

// ---- chat ----
setupChatUI({
  getSDK: () => sdk,
  ensureSession,
  getSessionId: () => sessionId,
  elements: { persona, templateId, chatTopK, inactive, msg, send, stream, meta, chatOut, userId, svcSel, modelSel },
  helpers: { ensureSDK, setBusy, toastERR, safeParse }
});

// ---- services/models ----
setupLLMServiceUI({
  getSDK: () => sdk,
  userIdEl: userId,
  elements: { loadServices, refreshSel, svcSel, modelSel, setSelection, selOut, serviceCards, modelCards },
  helpers: { ensureSDK, setBusy, toastOK, toastERR }
});

// ---- ingest ----
upload.addEventListener('click', async () => {
  try {
    ensureSDK();
    setBusy(upload, true);
    const res = await sdk.ingest.upload(files.files);
    toastOK(ingOut, res);
  } catch (e) {
    toastERR(ingOut, e);
  } finally {
    setBusy(upload, false);
  }
});

ingestAll.addEventListener('click', async () => {
  try {
    ensureSDK();
    setBusy(ingestAll, true);
    const res = await sdk.ingest.ingestAll();
    toastOK(ingOut, res);
  } catch (e) {
    toastERR(ingOut, e);
  } finally {
    setBusy(ingestAll, false);
  }
});

removeBtn.addEventListener('click', async () => {
  try {
    ensureSDK();
    setBusy(removeBtn, true);
    const res = await sdk.ingest.remove(removeSource.value.trim());
    toastOK(ingOut, res);
  } catch (e) {
    toastERR(ingOut, e);
  } finally {
    setBusy(removeBtn, false);
  }
});

clearDb.addEventListener('click', async () => {
  try {
    ensureSDK();
    setBusy(clearDb, true);
    const res = await sdk.ingest.clearDb();
    toastOK(ingOut, res);
  } catch (e) {
    toastERR(ingOut, e);
  } finally {
    setBusy(clearDb, false);
  }
});

// ---- templates & settings ----
tplList.addEventListener('click', async () => {
  try {
    ensureSDK();
    const res = await sdk.templates.list();
    toastOK(miscOut, res);
  } catch (e) {
    toastERR(miscOut, e);
  }
});

tplGet.addEventListener('click', async () => {
  try {
    ensureSDK();
    const res = await sdk.templates.get(tplId.value.trim());
    toastOK(miscOut, res);
  } catch (e) {
    toastERR(miscOut, e);
  }
});

getSettings.addEventListener('click', async () => {
  try {
    ensureSDK();
    const res = await sdk.settings.get(userId.value || 'local-user');
    toastOK(miscOut, res);
  } catch (e) {
    toastERR(miscOut, e);
  }
});

// Optional boot
(async function boot() {
  try {
    sdk = new DKClient({ baseUrl: base.value });
    await sdk.auth.beginUser();
    const res = await sdk.sessions.ensure();
    sessionId = res.session_id;
    sidOut.textContent = `session_id: ${sessionId}`;
  } catch (e) {
    // non-fatal
  }
})();
