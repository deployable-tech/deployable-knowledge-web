export function setupChatUI({ getSDK, ensureSession, getSessionId, elements, helpers }) {
  const { persona, templateId, chatTopK, inactive, msg, send, stream, meta, chatOut, userId, svcSel, modelSel } = elements;
  const { ensureSDK, setBusy, safeParse } = helpers;

  function appendMessage(role, text) {
    const div = document.createElement('div');
    div.className = `chat-msg chat-msg--${role}`;
    div.textContent = text;
    chatOut.appendChild(div);
    chatOut.scrollTop = chatOut.scrollHeight;
    return div;
  }

  send.addEventListener('click', async () => {
    try {
      ensureSDK();
      const sdk = getSDK();
      setBusy(send, true);
      await ensureSession();
      meta.textContent = '';
      const userText = msg.value;
      appendMessage('user', userText);
      msg.value = '';
      const res = await sdk.chat.send({
        message: userText,
        sessionId: getSessionId(),
        userId: userId.value || 'local-user',
        serviceId: svcSel.value || undefined,
        modelId: modelSel.value || undefined,
        persona: persona.value || '',
        templateId: templateId.value || 'rag_chat',
        topK: Number(chatTopK.value) || 8,
        inactive: safeParse(inactive.value, undefined)
      });
      appendMessage('bot', res.response);
    } catch (e) {
      appendMessage('bot', e?.message || String(e));
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
      meta.textContent = '';
      const userText = msg.value;
      appendMessage('user', userText);
      msg.value = '';
      const controller = new AbortController();
      const botDiv = appendMessage('bot', '');
      const p = {
        message: userText,
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
        onToken: (t) => { botDiv.textContent += t; chatOut.scrollTop = chatOut.scrollHeight; },
        onDone: (final) => {
          botDiv.textContent += '\n';
          botDiv.textContent += '\n— DONE —\n' + JSON.stringify(final?.usage || {});
          chatOut.scrollTop = chatOut.scrollHeight;
        },
        onError: (err) => { botDiv.textContent += `\n[error] ${err?.message || err}`; }
      };
      await sdk.chat.stream(p);
    } catch (e) {
      appendMessage('bot', e?.message || String(e));
    } finally {
      setBusy(stream, false);
    }
  });
}
