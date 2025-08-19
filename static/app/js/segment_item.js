import { renderWithModes } from '/static/ui/js/render.js';

export function createSegmentSchema({ sdk, segView } = {}) {
  return {
    modes: {
      default: {
        elements: {
          source:        { type: 'text' },
          segment_index: { type: 'number' },
          priority:      { type: 'number' },
          preview:       { type: 'text' }
        },
        order: ['segment_index', 'priority', 'preview'],
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
  return renderWithModes(seg, schema, { mode: opts.mode || 'default' });
}
