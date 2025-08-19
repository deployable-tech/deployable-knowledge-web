import { renderWithModes } from '/static/ui/js/render.js';

export function createDocumentSchema({ onSegments } = {}) {
  return {
    modes: {
      mini: {
        elements: {
          source: { type: 'text', format: 'title' }
        }
      },
      default: {
        extends: 'mini',
        elements: {
          size:   { type: 'number' }
        },
        order: ['size'],
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
  const schema = createDocumentSchema(deps);
  const host = renderWithModes(doc, schema, { mode: opts.mode || 'mini' });
  host.addEventListener('click', (e) => {
    if (e.target.closest('button')) return;
    host.setMode(host.getMode() === 'mini' ? 'default' : 'mini');
  });
  return host;
}
