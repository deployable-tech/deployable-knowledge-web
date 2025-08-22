import * as sessionStore from '../state/session_store.js';

export const historyWindow = {
  id: 'history',
  title: 'Chat History',
  layout: [
    {
      tag: 'div',
      class: 'row',
      children: [
        { tag: 'button', id: 'newChat', text: 'New Chat' },
        { tag: 'button', id: 'listSessions', text: 'List Sessions' }
      ]
    },
    { tag: 'div', id: 'sessionList', class: 'list' }
  ]
};

export function setupChatHistoryUI({ renderHistory, elements, helpers }) {
  const { sessionList, listSessions, newChat } = elements;
  const { setBusy, toastERR } = helpers;

  function renderList(sessions) {
    sessionList.innerHTML = '';
    (sessions || []).forEach(sess => {
      const item = document.createElement('div');
      item.className = 'item';
      item.textContent = sess.title || sess.session_id;
      item.addEventListener('click', () => sessionStore.setCurrent(sess.session_id));
      sessionList.appendChild(item);
    });
  }

  sessionStore.onSessionsLoaded(renderList);

  sessionStore.onSessionChange(async (id) => {
    try {
      const s = await sessionStore.get(id);
      renderHistory(s);
    } catch (e) {
      toastERR(sessionList, e);
    }
  });

  listSessions.addEventListener('click', async () => {
    try {
      setBusy(listSessions, true);
      await sessionStore.list();
    } catch (e) {
      toastERR(sessionList, e);
    } finally {
      setBusy(listSessions, false);
    }
  });

  newChat.addEventListener('click', async () => {
    try {
      setBusy(newChat, true);
      await sessionStore.create();
      await sessionStore.list();
      renderHistory({ history: [] });
    } catch (e) {
      toastERR(sessionList, e);
    } finally {
      setBusy(newChat, false);
    }
  });

  sessionStore.list();
}
