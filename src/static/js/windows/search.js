// applications/windows/search.js
export function initSearchWindow({ sdk, spawnWindow }) {
  if (typeof spawnWindow !== "function") throw new Error("spawnWindow missing");

  spawnWindow({
    id: "win_search",
    title: "Semantic Search",
    col: "right",
    window_type: "window_generic",
    Elements: [
      { type: "text_field", id: "search_q", label: "Query", placeholder: "Search..." },
      { type: "submit_button", id: "search_run", text: "Search" },
      { type: "list_view", id: "search_results", items: [], template: { title: r => r.source, subtitle: r => String(r.score) } }
    ]
  });

  document.getElementById("search_run")?.addEventListener("click", async () => {
    const q = document.getElementById("search_q").value;
    const res = await sdk.search.run({ q });
    document.getElementById("search_results")?.update({ items: res.results || [] });
  });
}
