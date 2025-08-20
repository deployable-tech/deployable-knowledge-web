import { renderWithModes } from '/static/ui/js/render.js';
import { enableClickToggle } from '/static/ui/js/dom.js';

export function createDocumentSchema({ onSegments } = {}) {
  return {
    modes: {
      mini: {
        elements: {
          title:  { type: 'text', format: 'title' },
          source: { type: 'text' }
        },
        order: ['title','source']
      },
      default: {
        extends: 'mini',
        elements: {
          size: { type: 'number' }
        },
        order: ['title','source','size'],
        actions: [
          {
            id: 'segments',
            label: 'Segments',
            onAction: (values, ctx) => onSegments?.(values, ctx)
          }
        ]
      }
    }
  };
}

export function renderDocumentItem(doc, deps = {}, opts = {}) {
  const data = (typeof doc === 'string') ? { source: doc } : (doc || {});
  const schema = createDocumentSchema(deps);
  const host = renderWithModes(data, schema, { mode: opts.mode ?? 'mini' });

  // click-to-toggle unless explicitly disabled
  if (opts.clickToggle !== false) enableClickToggle(host);
  return host;
}
