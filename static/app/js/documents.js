import { renderDocumentItem } from './document_item.js';
import { renderSegmentItem } from './segment_item.js';

export const documentsWindow = {
  id: 'documents',
  title: 'Documents',
  layout: [
    {
      tag: 'div',
      class: 'row',
      children: [
        { tag: 'input', id: 'files', attrs: { type: 'file', multiple: true } },
        { tag: 'button', id: 'upload', text: 'Upload' },
        { tag: 'button', id: 'ingestAll', text: 'Ingest All' }
      ]
    },
    {
      tag: 'div',
      class: 'row',
      children: [
        { tag: 'input', id: 'removeSource', attrs: { placeholder: 'source name to remove…' } },
        { tag: 'button', id: 'remove', text: 'Remove Source' },
        { tag: 'button', id: 'clearDb', text: 'Clear DB' }
      ]
    },
    { tag: 'pre', id: 'ingOut', class: 'mono', attrs: { style: 'max-height:160px;' } },
    {
      tag: 'div',
      class: 'row',
      children: [
        { tag: 'button', id: 'listDocs', text: 'List Documents' },
        { tag: 'span', id: 'docCount', class: 'subtle' }
      ]
    },
    { tag: 'div', id: 'docs', class: 'list' },
    { tag: 'div', class: 'spacer' },
    {
      tag: 'div',
      class: 'row',
      children: [
        { tag: 'label', attrs: { style: 'min-width:80px;' }, text: 'Segments of' },
        { tag: 'input', id: 'segSource', attrs: { placeholder: 'source.txt (auto-fills on click)' } },
        { tag: 'button', id: 'listSegs', text: 'List Segments' }
      ]
    },
    { tag: 'div', id: 'segs', class: 'list' },
    { tag: 'pre', id: 'segView', class: 'mono', attrs: { style: 'max-height:160px;' } }
  ]
};

export function setupDocumentsUI({ getSDK, elements, helpers }) {
  const { listDocs, docCount, docs, segSource, listSegs, segs, segView } = elements;
  const { ensureSDK, setBusy, toastERR } = helpers;

  listDocs.addEventListener('click', async () => {
    try {
      ensureSDK();
      const sdk = getSDK();
      setBusy(listDocs, true);
      const res = await sdk.documents.list();
      docCount.textContent = `${res?.length || 0} docs`;
      docs.innerHTML = '';
      (res || []).forEach(d => {
        const doc = (typeof d === 'string') ? { source: d } : d;
        const host = renderDocumentItem(
          doc,
          { onSegments: () => { segSource.value = doc.source || ''; } },
          { mode: 'mini' }
        );
        docs.appendChild(host);
      });
    } catch (e) {
      toastERR(docCount, e);
    } finally {
      setBusy(listDocs, false);
    }
  });

  listSegs.addEventListener('click', async () => {
    try {
      ensureSDK();
      const sdk = getSDK();
      setBusy(listSegs, true);
      const src = segSource.value.trim();
      const res = await sdk.segments.list({ source: src || undefined });
      segs.innerHTML = '';
      (res || []).forEach(s => {
        const host = renderSegmentItem(s, { sdk, segView }, { mode: 'mini' });
        segs.appendChild(host);
      });
    } catch (e) {
      toastERR(segView, e);
    } finally {
      setBusy(listSegs, false);
    }
  });
}
