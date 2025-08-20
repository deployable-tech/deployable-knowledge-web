export function setupChatHistoryUI({ getSDK, setSession, renderHistory, elements, helpers }) {
  const { sessionList,listSessions, newChat } = elements;
  const { ensureSDK, setBusy, toastERR } = helpers;

  async function loadSessions() {
    const sdk = getSDK();
    if (!sdk) return;
    try {
      const res = await sdk.sessions.list();
      sessionList.innerHTML = '';
      (res || []).forEach(sess => {
        const item = document.createElement('div');
        item.className = 'item';
        item.textContent = sess.title || sess.session_id;
        item.addEventListener('click', async () => {
          try {
            const s = await sdk.sessions.get(sess.session_id);
            setSession(s.session_id);
            renderHistory(s);
          } catch (e) {
            toastERR(sessionList, e);
          }
        });
        sessionList.appendChild(item);
      });
    } catch (e) {
      toastERR(sessionList, e);
    }
  }

  listSessions.addEventListener('click', async () => {
    try {
      ensureSDK();
      const sdk = getSDK();
      setBusy(listSessions, true);
      const res = await sdk.sessions.list();
      sessionList.innerHTML = '';
      (res || []).forEach(sess => {
        const item = document.createElement('div');
        item.className = 'item';
        item.textContent = sess.title || sess.session_id;
        item.addEventListener('click', async () => {
          try {
            ensureSDK();
            const s = await sdk.sessions.get(sess.session_id);
            setSession(s.session_id);
            renderHistory(s);
          } catch (e) {
            toastERR(sessionList, e);
          }
        });
        sessionList.appendChild(item);
      });
    } catch (e) {
      toastERR(sessionList, e);
    } finally {
      setBusy(listSessions, false);
    }
  });

  newChat.addEventListener('click', async () => {
    try {
      ensureSDK();
      setBusy(newChat, true);
      const sdk = getSDK();
      const res = await sdk.sessions.create();
      setSession(res.session_id);
      renderHistory({ history: [] });
      await loadSessions();
    } catch (e) {
      toastERR(sessionList, e);
    } finally {
      setBusy(newChat, false);
    }
  });

  loadSessions();
  document.addEventListener('dk-sdk-ready', loadSessions);
}
