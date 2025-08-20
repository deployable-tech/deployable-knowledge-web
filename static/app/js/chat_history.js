export function setupChatHistoryUI({ getSDK, setSession, renderHistory, elements, helpers }) {
  const { listSessions, sessionList } = elements;
  const { ensureSDK, setBusy, toastERR } = helpers;

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
}
