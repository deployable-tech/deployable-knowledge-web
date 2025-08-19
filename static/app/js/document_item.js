import { renderWithModes } from '/static/ui/js/render.js';

export function createDocumentSchema({ onSegments } = {}) {
  return {
    modes: {
      default: {
        elements: {
          source: { type: 'text', format: 'title' },
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
  const data = (typeof doc === 'string') ? { source: doc } : doc;
  const schema = createDocumentSchema(deps);
  return renderWithModes(data, schema, { mode: opts.mode || 'default' });
}
