import { DKClient } from './sdk.js';
import { setupLLMServiceUI } from './llm_service.js';
import { setupChatUI } from './chat.js';
import { setupDocumentsUI } from './documents.js';
import { setupPromptTemplatesUI } from './prompt_templates.js';
import { setupLLMServiceAdminUI } from './llm_service_admin.js';
import { renderSearchResultItem } from './search_result_item.js';
import { setupChatHistoryUI } from './chat_history.js';
import { initWindows } from '../../ui/js/windows.js';

const $ = (id) => document.getElementById(id);
const j = (o) => JSON.stringify(o, null, 2);

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
const serviceCards = $('serviceCards');
const modelCards = $('modelCards');

const q = $('q');
const topK = $('topK');
const doSearch = $('doSearch');
const searchOut = $('searchOut');

const listSessions = $('listSessions');
const sessionList = $('sessionList');

const listDocs = $('listDocs');
const docCount = $('docCount');
const docs = $('docs');
const segSource = $('segSource');
const listSegs = $('listSegs');
const segs = $('segs');
const segView = $('segView');

const persona = $('persona');
const savePersona = $('savePersona');
const cancelPersona = $('cancelPersona');
const templateId = $('templateId');
const msg = $('msg');
const send = $('send');
const meta = $('meta');
const chatOut = $('chatOut');

const files = $('files');
const upload = $('upload');
const ingestAll = $('ingestAll');
const removeSource = $('removeSource');
const removeBtn = $('remove');
const clearDb = $('clearDb');
const ingOut = $('ingOut');

const loadTemplates = $('loadTemplates');
const tplSel = $('tplSel');
const tplCard = $('tplCard');
const userId = $('userId');
const getSettings = $('getSettings');

const manageServices = $('manageServices');
const newSvcProvider = $('newSvcProvider');
const newSvcBaseUrl = $('newSvcBaseUrl');
const newSvcAuth = $('newSvcAuth');
const delSvcId = $('delSvcId');
const modelSvcId = $('modelSvcId');
const modelName = $('modelName');
const modelModality = $('modelModality');
const delModelId = $('delModelId');
const createSvc = $('createSvc');
const deleteSvc = $('deleteSvc');
const createModel = $('createModel');
const deleteModel = $('deleteModel');
const svcAdminOut = $('svcAdminOut');

initWindows({ menuId: 'windowMenu', menuBtnId: 'windowMenuBtn', containerId: 'desktop' });

const svcAdminWin = document.querySelector('.window[data-id="service-admin"]');
if (svcAdminWin) svcAdminWin.style.display = 'none';
manageServices.addEventListener('click', () => {
  if (svcAdminWin) svcAdminWin.style.display = 'block';
});

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

function setSession(id) {
  sessionId = id;
  sidOut.textContent = `session_id: ${sessionId}`;
}

function sdkHandler(btn, outEl, fn) {
  return async () => {
    try {
      ensureSDK();
      setBusy(btn, true);
      const res = await fn();
      if (outEl) toastOK(outEl, res);
    } catch (e) {
      if (outEl) toastERR(outEl, e); else console.error(e);
    } finally {
      setBusy(btn, false);
    }
  };
}

function ensureSDK() {
  if (!sdk) throw new Error('Init SDK first.');
}

async function ensureSession() {
  ensureSDK();
  const res = await sdk.sessions.ensure();
  setSession(res.session_id);
  return sessionId;
}

// ---- init & session ----
initBtn.addEventListener('click', () => {
  try {
    sdk = new DKClient({ baseUrl: base.value });
    window.sdk = sdk;
    console.log('SDK ready.');
  } catch (e) {
    console.error(e);
  }
});

prime.addEventListener('click', async () => {
  try {
    ensureSDK();
    setBusy(prime, true);
    await sdk.auth.beginUser();
    console.log('User session primed via /begin');
  } catch (e) {
    console.error(e);
  } finally {
    setBusy(prime, false);
  }
});
ensure.addEventListener('click', async () => {
  try {
    setBusy(ensure, true);
    await ensureSession();
    console.log({ session_id: sessionId });
  } catch (e) {
    console.error(e);
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
      topK: Number(topK.value) || 5
    });
    renderSearchResults(res);
  } catch (e) {
    searchOut.innerHTML = '';
    const err = document.createElement('div');
    err.textContent = e?.message || String(e);
    err.classList.add('err');
    searchOut.appendChild(err);
  } finally {
    setBusy(doSearch, false);
  }
});

function renderSearchResults(res) {
  searchOut.innerHTML = '';
  const arr = Array.isArray(res) ? res : (res?.results || []);
  for (const r of arr) {
    searchOut.appendChild(renderSearchResultItem(r, { segmentDeps: { sdk, segView } }));
  }
}

// ---- documents & segments ----
setupDocumentsUI({
  getSDK: () => sdk,
  elements: { listDocs, docCount, docs, segSource, listSegs, segs, segView },
  helpers: { ensureSDK, setBusy, toastERR }
});

// ---- chat ----
let personaText = '';
try { personaText = localStorage.getItem('personaText') || ''; } catch {}
persona.value = personaText;
savePersona.addEventListener('click', () => {
  personaText = persona.value;
  try { localStorage.setItem('personaText', personaText); } catch {}
  const w = document.querySelector('.window[data-id="persona"]');
  if (w) w.style.display = 'none';
});
cancelPersona.addEventListener('click', () => {
  persona.value = personaText;
  const w = document.querySelector('.window[data-id="persona"]');
  if (w) w.style.display = 'none';
});

setupChatUI({
  getSDK: () => sdk,
  ensureSession,
  getSessionId: () => sessionId,
  elements: { templateId, topK, msg, send, meta, chatOut, userId, svcSel, modelSel },
  helpers: { ensureSDK, setBusy },
  getPersona: () => personaText
});

setupChatHistoryUI({
  getSDK: () => sdk,
  setSession: (id) => setSession(id),
  renderHistory: (s) => {
    const chatWin = document.querySelector('.window[data-id="chat"]');
    if (chatWin) chatWin.style.display = 'block';
    chatOut.innerHTML = '';
    (s.history || []).forEach(pair => {
      const [u, b] = pair;
      if (u != null) {
        const uDiv = document.createElement('div');
        uDiv.className = 'chat-msg chat-msg--user';
        uDiv.textContent = u;
        chatOut.appendChild(uDiv);
      }
      if (b != null) {
        const bDiv = document.createElement('div');
        bDiv.className = 'chat-msg chat-msg--bot';
        bDiv.textContent = b;
        chatOut.appendChild(bDiv);
      }
    });
    chatOut.scrollTop = chatOut.scrollHeight;
  },
  elements: { listSessions, sessionList },
  helpers: { ensureSDK, setBusy, toastERR }
});

// ---- services/models ----
setupLLMServiceUI({
  getSDK: () => sdk,
  userIdEl: userId,
  elements: { loadServices, refreshSel, svcSel, modelSel, setSelection, serviceCards, modelCards },
  helpers: { ensureSDK, setBusy }
});

// ---- prompt templates ----
setupPromptTemplatesUI({
  getSDK: () => sdk,
  elements: { loadTemplates, tplSel, tplCard, templateId },
  helpers: { ensureSDK }
});

// ---- service admin ----
setupLLMServiceAdminUI({
  getSDK: () => sdk,
  elements: {
    createSvc,
    deleteSvc,
    createModel,
    deleteModel,
    newSvcProvider,
    newSvcBaseUrl,
    newSvcAuth,
    delSvcId,
    modelSvcId,
    modelName,
    modelModality,
    delModelId,
    out: svcAdminOut
  },
  helpers: { ensureSDK, setBusy, toastOK, toastERR }
});

// ---- ingest ----
upload.addEventListener('click', sdkHandler(upload, ingOut, () => sdk.ingest.upload(files.files)));
ingestAll.addEventListener('click', sdkHandler(ingestAll, ingOut, () => sdk.ingest.ingestAll()));
removeBtn.addEventListener('click', sdkHandler(removeBtn, ingOut, () => sdk.ingest.remove(removeSource.value.trim())));
clearDb.addEventListener('click', sdkHandler(clearDb, ingOut, () => sdk.ingest.clearDb()));

// ---- templates & settings ----
getSettings.addEventListener('click', async () => {
  try {
    ensureSDK();
    const res = await sdk.settings.get(userId.value || 'local-user');
    console.log(res);
  } catch (e) {
    console.error(e);
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

    // auto-update windows on boot
    try { loadServices.click(); } catch {}
    try { refreshSel.click(); } catch {}
    try { listDocs.click(); } catch {}
    try { loadTemplates.click(); } catch {}
    try { getSettings.click(); } catch {}
  } catch (e) {
    // non-fatal
  }
})();
