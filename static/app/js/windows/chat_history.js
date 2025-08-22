import store from '../state/store.js';

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
      item.addEventListener('click', () => store.session.setCurrent(sess.session_id));
      sessionList.appendChild(item);
    });
  }

  store.session.onLoaded(renderList);

  store.session.onChange(async (id) => {
    try {
      const s = await store.session.get(id);
      renderHistory(s);
    } catch (e) {
      toastERR(sessionList, e);
    }
  });

  listSessions.addEventListener('click', async () => {
    try {
      setBusy(listSessions, true);
      await store.session.list();
    } catch (e) {
      toastERR(sessionList, e);
    } finally {
      setBusy(listSessions, false);
    }
  });

  newChat.addEventListener('click', async () => {
    try {
      setBusy(newChat, true);
      await store.session.create();
      await store.session.list();
      renderHistory({ history: [] });
    } catch (e) {
      toastERR(sessionList, e);
    } finally {
      setBusy(newChat, false);
    }
  });

  store.session.list();
}
