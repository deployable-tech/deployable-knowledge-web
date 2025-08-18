// applications/windows/segments.js
import { createItemList } from "/static/ui/js/components/list.js";

let segTable;

export function initSegmentsWindow({ sdk, spawnWindow }) {
  if (typeof spawnWindow !== "function") throw new Error("spawnWindow missing");

  spawnWindow({
    id: "win_segments",
    title: "DB Segments",
    col: "left",
    window_type: "window_generic",
    Elements: [
      { type: "submit_button", id: "seg_refresh", text: "Refresh" },
      { type: "text", id: "seg_slot", showLabel: false, html: '<div id="seg_table_slot"></div>' }
    ]
  });

  const slot = document.getElementById("seg_table_slot");
  slot.classList.add("list");

  segTable = createItemList({
    target: slot,
    keyField: "id",
    columns: [
      { key: "source",   label: "Source" },
      { key: "preview",  label: "Preview" },
      { key: "priority", label: "Priority" }
    ],
    items: []
  });

  segTable.on?.("row:click", () => {
    segTable.getSelection?.();
  });

  document.getElementById("seg_refresh")?.addEventListener("click", () => refreshSegments(sdk));
  refreshSegments(sdk);
}

async function refreshSegments(sdk) {
  const segs = await sdk.segments.list(); // [{id, source, preview, priority}, ...]
  const rows = segs.map(s => ({
    id: s.id,
    source: s.source ?? "",
    // If API sometimes sends full text instead of preview, fall back + truncate.
    preview: (s.preview ?? s.text ?? "").replace(/\s+/g, " ").slice(0, 120) +
             ((s.preview ?? s.text ?? "").length > 120 ? "…" : ""),
    priority: s.priority ?? ""
  }));
  segTable.setItems(rows);
}
