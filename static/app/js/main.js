 import { renderWithModes, renderBySchema } from '/static/ui/js/render.js';
    import { DKClient, ensureChatSessionId } from './sdk.js'; // adjust path if needed
    import { llm_service_schema } from './schemas.js';
    import { renderServiceCard } from "./llm_services_item.js";
    import { renderModelCard } from './llm_service_model_item.js';

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

    // ---- init & session ----
    initBtn.addEventListener('click', () => {
      try {
        sdk = new DKClient({ baseUrl: base.value });
        window.sdk = sdk; // for console play
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
        ensureSDK();
        setBusy(ensure, true);
        const res = await sdk.sessions.ensure();
        sessionId = res.session_id;
        sidOut.textContent = `session_id: ${sessionId}`;
        toastOK(selOut, res);
      } catch (e) {
        toastERR(selOut, e);
      } finally {
        setBusy(ensure, false);
      }
    });

    // ---- services/models ----
    async function populateModels() {
      try {
        ensureSDK();
        const sid = svcSel.value;
        modelSel.innerHTML = '';
        if (!sid) return;
        const models = await sdk.llm.listModels(sid);
        for (const m of models) {
          const opt = document.createElement('option');
          opt.value = m.id;
          opt.textContent = `${m.name || m.model_name || m.id} (${m.modality || m.mode || 'text'})`;
          modelSel.appendChild(opt);
        }
      } catch (e) {
        toastERR(selOut, e);
      }
    }

    const cards = new Map();
    const highlight = (ctx, id) => {
      for (const n of cards.values()) n.classList.remove("obj-card--selected");
      ctx.node.classList.add("obj-card--selected");
    };

loadServices.onclick = async () => {
  const services = await sdk.llm.listServices();
  test.innerHTML = '';
  cards.clear();

  for (const s of services) {
    const host = renderServiceCard(s, {
      sdk,
      getUserId: () => userId.value || 'local-user',
      onSelect: async (_values, ctx) => {
        highlight(ctx, s.id);           // your existing highlight
        await renderModelsForService(s.id); // <- paint models for this service
      }
    });
    test.appendChild(host);
    cards.set(s.id, host);
  }
};



    svcSel.addEventListener('change', populateModels);

    setSelection.addEventListener('click', async () => {
      try {
        ensureSDK();
        const payload = {
          user_id: userId.value || 'local-user',
          service_id: svcSel.value || undefined,
          model_id: modelSel.value || undefined
        };
        const res = await sdk.llm.updateSelection(payload);
        toastOK(selOut, res);
      } catch (e) {
        toastERR(selOut, e);
      }
    });

    refreshSel.addEventListener('click', async () => {
      try {
        ensureSDK();
        const sel = await sdk.llm.getSelection();
        toastOK(selOut, sel);
      } catch (e) {
        toastERR(selOut, e);
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
    listDocs.addEventListener('click', async () => {
      try {
        ensureSDK();
        setBusy(listDocs, true);
        const res = await sdk.documents.list();
        docCount.textContent = `${res?.length || 0} docs`;
        docs.innerHTML = '';
        (res || []).forEach(d => {
          const div = document.createElement('div');
          div.className = 'item';
          div.innerHTML = `<div><strong>${d.source || d.name || '(no source)'} </strong><div class="subtle">${d.size ? (d.size + ' bytes') : ''}</div></div>
                           <div><button data-source="${d.source}">Segments</button></div>`;
          div.querySelector('button').addEventListener('click', () => {
            segSource.value = d.source || '';
          });
          docs.appendChild(div);
        });
      } catch (e) {
        toastERR(searchOut, e);
      } finally {
        setBusy(listDocs, false);
      }
    });

    listSegs.addEventListener('click', async () => {
      try {
        ensureSDK();
        setBusy(listSegs, true);
        const src = segSource.value.trim();
        const res = await sdk.segments.list({ source: src || undefined });
        segs.innerHTML = '';
        (res || []).forEach(s => {
          const row = document.createElement('div');
          row.className = 'item';
          const left = document.createElement('div');
          left.innerHTML = `<div><strong>${s.source}</strong></div>
                            <div class="subtle">#${s.segment_index ?? ''} — ${s.priority ?? ''}</div>
                            <div class="subtle">${s.preview ?? ''}</div>`;
          const right = document.createElement('div');
          const bOpen = document.createElement('button');
          bOpen.textContent = 'Open';
          bOpen.addEventListener('click', async () => {
            try {
              const detail = await sdk.segments.get(s.id || s.uuid);
              segView.textContent = detail?.text || '(no text)';
            } catch (e) {
              toastERR(segView, e);
            }
          });
          const bDel = document.createElement('button');
          bDel.textContent = 'Delete';
          bDel.addEventListener('click', async () => {
            try {
              await sdk.segments.remove(s.id || s.uuid);
              row.remove();
            } catch (e) {
              toastERR(segView, e);
            }
          });
          right.appendChild(bOpen);
          right.appendChild(bDel);
          row.appendChild(left);
          row.appendChild(right);
          segs.appendChild(row);
        });
      } catch (e) {
        toastERR(segView, e);
      } finally {
        setBusy(listSegs, false);
      }
    });

    // ---- chat ----
    async function ensureSession() {
      if (!sessionId) {
        const res = await sdk.sessions.ensure();
        sessionId = res.session_id;
        sidOut.textContent = `session_id: ${sessionId}`;
      }
      return sessionId;
    }

    send.addEventListener('click', async () => {
      try {
        ensureSDK();
        setBusy(send, true);
        await ensureSession();
        chatOut.textContent = '';
        meta.textContent = '';

        const res = await sdk.chat.send({
          message: msg.value,
          sessionId,
          userId: userId.value || 'local-user',
          serviceId: svcSel.value || undefined,
          modelId: modelSel.value || undefined,
          persona: persona.value || '',
          templateId: templateId.value || 'rag_chat',
          topK: Number(chatTopK.value) || 8,
          inactive: safeParse(inactive.value, undefined)
        });
        chatOut.innerHTML = res.response;
      } catch (e) {
        toastERR(chatOut, e);
      } finally {
        setBusy(send, false);
      }
    });

    stream.addEventListener('click', async () => {
      try {
        ensureSDK();
        setBusy(stream, true);
        await ensureSession();
        chatOut.textContent = '';
        meta.textContent = '';

        const controller = new AbortController();
        const p = {
          message: msg.value,
          sessionId,
          userId: userId.value || 'local-user',
          serviceId: svcSel.value || undefined,
          modelId: modelSel.value || undefined,
          persona: persona.value || '',
          templateId: templateId.value || 'rag_chat',
          topK: Number(chatTopK.value) || 8,
          inactive: safeParse(inactive.value, undefined),
          signal: controller.signal,
          onMeta: (m) => { meta.textContent = `meta: ${typeof m === 'string' ? m : JSON.stringify(m)}`; },
          onToken: (t) => { chatOut.textContent += t; },
          onDone: (final) => {
            chatOut.textContent += '\n';
            chatOut.textContent += '\n— DONE —\n' + j(final?.usage || {});
          },
          onError: (err) => { chatOut.textContent += `\n[error] ${err?.message || err}`; }
        };
        // choose one:
        await sdk.chat.stream(p);      // /chat?stream=true
        // await sdk.chat.streamAlways(p); // /chat-stream
      } catch (e) {
        toastERR(chatOut, e);
      } finally {
        setBusy(stream, false);
      }
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

    // Optional: quick-start for sane defaults
    (async function boot() {
      try {
        sdk = new DKClient({ baseUrl: base.value });
        await sdk.auth.beginUser();
        const res = await sdk.sessions.ensure();
        sessionId = res.session_id;
        sidOut.textContent = `session_id: ${sessionId}`;
      } catch (e) {
        // non-fatal on boot
      }
    })();

const modelsWrap = document.getElementById('models');
const modelCards = new Map(); // id -> host node

async function renderModelsForService(serviceId) {
  ensureSDK();
  modelsWrap.innerHTML = '';
  modelCards.clear();
  if (!serviceId) return;

  const models = await sdk.llm.listModels(serviceId);
  for (const m of models) {
    const host = renderModelCard(m, {
      sdk,
      getUserId: () => userId.value || 'local-user',
      getSelectedServiceId: () => serviceId,
      onSelect: (_values, ctx) => {
        // highlight the chosen model card
        for (const n of modelCards.values()) n.classList.remove('obj-card--selected');
        ctx.node.classList.add('obj-card--selected');
        // keep dropdown in sync if you’re still using it
        const opt = [...modelSel.options].find(o => o.value === m.id);
        if (opt) modelSel.value = opt.value;
      }
    });
    modelsWrap.appendChild(host);
    modelCards.set(m.id, host);
  }
}
