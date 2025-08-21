export const chatWindow = {
  id: 'chat',
  title: 'Chat',
  layout: [
    { tag: 'div', id: 'chatOut', class: 'chat-history' },
    {
      tag: 'div',
      class: 'chat-input',
      children: [
        { tag: 'textarea', id: 'msg', attrs: { placeholder: 'Ask your system something grounded…' } },
        {
          tag: 'div',
          class: 'row',
          children: [
            { tag: 'button', id: 'send', text: 'Send' },
            { tag: 'span', id: 'meta', class: 'subtle mono' }
          ]
        }
      ]
    }
  ]
};

export function setupChatUI({ getSDK, ensureSession, getSessionId, elements, helpers, getPersona, deps = {} }) {
  const { msg, send, meta, chatOut } = elements;
  const { templateId, topK, userId, svcSel, modelSel } = deps;
  const { ensureSDK, setBusy } = helpers;

  function appendMessage(role, text) {
    const div = document.createElement('div');
    div.className = `chat-msg chat-msg--${role}`;
    div.textContent = text;
    chatOut.appendChild(div);
    chatOut.scrollTop = chatOut.scrollHeight;
    return div;
  }

  msg.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send.click();
    }
  });

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
      const botDiv = appendMessage('bot', '');
      const p = {
        message: userText,
        sessionId: getSessionId(),
        userId: userId.value || 'local-user',
        serviceId: svcSel.value || undefined,
        modelId: modelSel.value || undefined,
        persona: (typeof getPersona === 'function' ? getPersona() : '') || '',
        templateId: templateId.value || 'rag_chat',
        topK: Number(topK.value) || 8,
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
      setBusy(send, false);
    }
  });
}
