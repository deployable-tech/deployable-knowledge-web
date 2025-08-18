import { spawnWindow } from '/static/ui/js/window.js';

export function createSegmentsWindow() {
  spawnWindow({
    id: 'win_segments',
    window_type: 'window_generic',
    title: 'DB Segments',
    col: 'left',
    unique: true,
    resizable: true,
    Elements: [
      {
        type: 'item_list',
        id: 'segments_list',
        label: 'Segments',
        label_position: 'top',
        class: 'label-top',
        fetch: async () => {
          const segs = await fetch('/segments').then(r => r.json()).catch(() => []);
          return segs.map(s => ({
            id: s.id,
            source: s.source || '',
            priority: s.priority || '',
            preview: (s.preview || s.text || '').replace(/\s+/g, ' ').slice(0, 120)
          }));
        },
        item_template: {
          elements: [
            { type: 'text', bind: 'source', class: 'li-title' },
            { type: 'text', bind: 'priority', class: 'li-meta' },
            { type: 'text', bind: 'preview', class: 'li-subtle' },
            { type: 'button', label: 'Open', action: 'open' }
          ]
        },
        on: {
          open: (item) => {
            // TODO(voxa): open segment
            console.log('open', item);
          }
        }
      }
    ]
  });
}
