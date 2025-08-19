import { renderDocumentItem } from './document_item.js';
import { renderSegmentItem } from './segment_item.js';

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
        const host = renderDocumentItem(d, {
          onSegments: () => { segSource.value = d.source || ''; }
        }, { mode: 'mini' });
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
