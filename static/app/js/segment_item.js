import { renderWithModes } from '/static/ui/js/render.js';
import { enableClickToggle } from '/static/ui/js/dom.js';

export function createSegmentSchema({ sdk, segView } = {}) {
  return {
    modes: {
      mini: {
        elements: {
          preview: { type: 'text', format: 'title' }
        }
      },
      default: {
        extends: 'mini',
        elements: {
          source:        { type: 'text' },
          segment_index: { type: 'number' },
          priority:      { type: 'number' }
        },
        order: ['segment_index', 'priority'],
        actions: [
          {
            id: 'open',
            label: 'Open',
            onAction: async (values) => {
              const detail = await sdk?.segments?.get(values.id || values.uuid);
              segView.textContent = detail?.text || '(no text)';
            }
          },
          {
            id: 'delete',
            label: 'Delete',
            variant: 'danger',
            onAction: async (values, ctx) => {
              await sdk?.segments?.remove(values.id || values.uuid);
              ctx.node.remove();
            }
          }
        ]
      }
    }
  };
}

export function renderSegmentItem(seg, deps = {}, opts = {}) {
  const schema = createSegmentSchema(deps);
  const host = renderWithModes(seg, schema, { mode: opts.mode || 'mini' });
  enableClickToggle(host);
  return host;
}
