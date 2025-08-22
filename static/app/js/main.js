import { DKClient } from './sdk.js';
import { setupLLMServiceUI, servicesWindow } from './windows/llm_service.js';
import { setupChatUI, chatWindow } from './windows/chat.js';
import { setupDocumentsUI, documentsWindow } from './windows/documents.js';
import { setupPromptTemplatesUI, templatesWindow } from './windows/prompt_templates.js';
import { setupLLMServiceAdminUI, serviceAdminWindow } from './windows/llm_service_admin.js';
import { setupChatHistoryUI, historyWindow } from './windows/chat_history.js';
import { setupSearchUI, searchWindow } from './windows/search.js';
import { setupPersonaUI, personaWindow } from './windows/persona.js';
import { initWindows } from '../../ui/js/windows.js';
import { LayoutOptions } from '../../ui/js/layout-windows.js';
import { createMenu } from '../../ui/js/menu.js';
import store from './state/store.js';

const j = (o) => JSON.stringify(o, null, 2);

const windows = [
  servicesWindow,
  serviceAdminWindow,
  searchWindow,
  documentsWindow,
  chatWindow,
  historyWindow,
  personaWindow,
  templatesWindow
];

// ---- build windows ----
const { showWindow, elements, applyLayout } = initWindows({
  config: windows,
  containerId: 'desktop'
});

const windowMenu = {
  id: 'windowMenu',
  title: 'Windows',
  options: windows.map(w => ({
    id: w.id,
    title: w.title,
    action: showWindow,
  })),
};

const layoutMenu = {
  id: 'layoutMenu',
  title: 'Layout',
  options: Object.values(LayoutOptions).map(opt => ({
    id: opt.id,
    title: opt.title,
    action: applyLayout,
  })),
};

const winMenuUI = createMenu(windowMenu);
const layoutMenuUI = createMenu(layoutMenu);

if (winMenuUI && layoutMenuUI) {
  winMenuUI.button.addEventListener('click', () => layoutMenuUI.menu.classList.remove('visible'));
  layoutMenuUI.button.addEventListener('click', () => winMenuUI.menu.classList.remove('visible'));
}

function openChat() {
  showWindow('chat');
}
window.openChat = openChat;
window.showWindow = showWindow;

const svcAdminWin = document.querySelector('.window[data-id="service-admin"]');
if (svcAdminWin) svcAdminWin.style.display = 'none';

// ---- state ----
let sdk = null;

// default API base -> same host, port 8000
const API_BASE = `${location.protocol}//${location.hostname}:8000`;

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

// ---- setup windows ----
setupSearchUI({
  getSDK: () => sdk,
  elements: elements.search,
  helpers: { ensureSDK, setBusy },
  deps: { segView: elements.documents.segView }
});

setupDocumentsUI({
  getSDK: () => sdk,
  elements: elements.documents,
  helpers: { ensureSDK, setBusy, toastERR, toastOK, sdkHandler }
});

const personaAPI = setupPersonaUI({ elements: elements.persona });

setupChatUI({
  getSDK: () => sdk,
  elements: elements.chat,
  helpers: { ensureSDK, setBusy },
  getPersona: personaAPI.getPersona,
  deps: {
    templateId: elements.templates.templateId,
    topK: elements.search.topK,
    userId: elements.templates.userId
  }
});

setupChatHistoryUI({
  renderHistory: (s) => {
    showWindow('chat');
    const chatOut = elements.chat.chatOut;
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
  elements: elements.history,
  helpers: { setBusy, toastERR }
});

setupLLMServiceUI({
  getSDK: () => sdk,
  userIdEl: elements.templates.userId,
  elements: elements.services,
  helpers: { ensureSDK },
  deps: { showWindow }
});

setupPromptTemplatesUI({
  getSDK: () => sdk,
  elements: elements.templates,
  helpers: { ensureSDK }
});

setupLLMServiceAdminUI({
  getSDK: () => sdk,
  elements: elements['service-admin'],
  helpers: { ensureSDK, setBusy, toastOK, toastERR }
});

// Optional boot
(async function boot() {
  try {
    sdk = new DKClient({ baseUrl: API_BASE });
    store.init(() => sdk);
    window.sdk = sdk;
    await sdk.auth.beginUser();
    await store.session.ensure();
    await store.session.list();
    await store.llm.loadSelection();

    // auto-update windows on boot
    try { elements.services.loadServices.click(); } catch {}
    try { elements.services.refreshSelection.click(); } catch {}
    try { elements.documents.listDocs.click(); } catch {}
    try { elements.templates.loadTemplates.click(); } catch {}
    try { elements.templates.getSettings.click(); } catch {}
  } catch (e) {
    // non-fatal
  }
})();
