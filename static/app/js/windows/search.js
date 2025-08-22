import { renderSearchResultItem } from '../items/search_result_item.js';

export const searchWindow = {
  id: 'search',
  title: 'Search',
  layout: [
    {
      tag: 'div',
      class: 'row',
      children: [
        { tag: 'input', id: 'q', attrs: { placeholder: 'query…' } },
        { tag: 'label', text: 'Top K' },
        { tag: 'input', id: 'topK', attrs: { type: 'number', value: '5', style: 'max-width:80px;' } },
        { tag: 'button', id: 'doSearch', text: 'Run' }
      ]
    },
    { tag: 'div', id: 'searchOut', class: 'list' }
  ]
};

export function setupSearchUI({ getSDK, elements, helpers, deps = {} }) {
  const { q, topK, doSearch, searchOut } = elements;
  const { ensureSDK, setBusy } = helpers;
  const { segView } = deps;

  doSearch.addEventListener('click', async () => {
    try {
      ensureSDK();
      const sdk = getSDK();
      setBusy(doSearch, true);
      searchOut.innerHTML = '';
      const res = await sdk.search.query({ q: q.value, topK: Number(topK.value) || 5 });
      searchOut.innerHTML = '';
      (res || []).forEach(r => {
        searchOut.appendChild(renderSearchResultItem(r, { segmentDeps: { sdk, segView } }));
      });
    } catch (e) {
      const err = document.createElement('div');
      err.textContent = e?.message || e;
      err.className = 'err';
      searchOut.innerHTML = '';
      searchOut.appendChild(err);
    } finally {
      setBusy(doSearch, false);
    }
  });
}
