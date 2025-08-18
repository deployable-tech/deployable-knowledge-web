import { spawnWindow } from '/static/ui/js/window.js';
import { sendChat } from '../sdk.js';
import { getInactiveIds, getTopK, getSelection } from '../state.js';

export function createChatWindow() {
  spawnWindow({
    id: 'win_chat',
    title: 'Chat',
    col: 'right',
    window_type: 'window_chat',
    onSend: async (text) => {
      const resp = await sendChat({
        prompt: text,
        inactiveIds: getInactiveIds(),
        topK: getTopK(),
        selection: getSelection()
      });
      return { role: 'assistant', content: resp.response };
    }
  });
}
