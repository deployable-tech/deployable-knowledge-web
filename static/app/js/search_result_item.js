import { renderWithModes } from '/static/ui/js/render.js';
import { enableClickToggle } from '/static/ui/js/dom.js';
import { renderSegmentItem } from './segment_item.js';

export function createSearchResultSchema(deps = {}) {
  return {
    modes: {
      default: {
        elements: {
          text:        { type: 'text', format: 'title' },
          source:      { type: 'text' },
          document_id: { type: 'text' },
          score:       { type: 'number' },
          page:        { type: 'number' },
          segment:     {
            render: (seg) => seg ? renderSegmentItem(seg, deps.segmentDeps, { mode: 'mini' }) : document.createTextNode('')
          }
        },
        order: ['text','source','document_id','score','page','segment']
      }
    }
  };
}

export function renderSearchResultItem(res, deps = {}, opts = {}) {
  const schema = createSearchResultSchema(deps);
  const host = renderWithModes(res, schema, { mode: opts.mode || 'default' });
  // allow toggle to collapse/expand
  if (opts.clickToggle !== false) enableClickToggle(host);
  return host;
}
