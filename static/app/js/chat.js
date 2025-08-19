export function setupChatUI({ getSDK, ensureSession, getSessionId, elements, helpers }) {
  const { persona, templateId, chatTopK, inactive, msg, send, stream, meta, chatOut, userId, svcSel, modelSel } = elements;
  const { ensureSDK, setBusy, toastERR, safeParse } = helpers;

  send.addEventListener('click', async () => {
    try {
      ensureSDK();
      const sdk = getSDK();
      setBusy(send, true);
      await ensureSession();
      chatOut.textContent = '';
      meta.textContent = '';
      const res = await sdk.chat.send({
        message: msg.value,
        sessionId: getSessionId(),
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
      const sdk = getSDK();
      setBusy(stream, true);
      await ensureSession();
      chatOut.textContent = '';
      meta.textContent = '';
      const controller = new AbortController();
      const p = {
        message: msg.value,
        sessionId: getSessionId(),
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
          chatOut.textContent += '\n— DONE —\n' + JSON.stringify(final?.usage || {});
        },
        onError: (err) => { chatOut.textContent += `\n[error] ${err?.message || err}`; }
      };
      await sdk.chat.stream(p);
    } catch (e) {
      toastERR(chatOut, e);
    } finally {
      setBusy(stream, false);
    }
  });
}
