// applications/windows/documents.js
import { createItemList } from "/static/ui/js/components/list.js"; // imperative list API

const INACTIVE_SOURCES = new Set();
let table; // item list controller

export function initDocumentsWindow({ sdk, spawnWindow }) {
  if (typeof spawnWindow !== "function") throw new Error("spawnWindow missing");

  // 1) Window with an explicit slot for the list
  spawnWindow({
    id: "win_docs",
    title: "Document Library",
    col: "left",
    window_type: "window_generic",
    Elements: [
      {
        type: "file_upload",
        id: "doc_upload",
        label: "Upload",
        multiple: true,
        onUpload: async (files) => {
          await sdk.ingest.upload(files);
          await refreshDocs(sdk);
        }
      },
      { type: "submit_button", id: "doc_refresh", text: "Refresh" },
      // Slot to mount the item list (keeps framework untouched)
      { type: "text", id: "doc_slot", showLabel: false, html: '<div id="doc_table_slot"></div>' }
    ]
  });

  // 2) Mount the item list into the slot
  const slot = document.getElementById("doc_table_slot");
    slot.classList.add("list"); // just gives nice vertical rhythm
  table = createItemList({
    target: slot,
    keyField: "id",
    multi: true,
    columns: [
      { key: "title",    label: "Title" },
      { key: "segments", label: "Segments" },
      { key: "status",   label: "Status" }
    ],
    items: [],
    actions: {
      del: {
        label: "Delete",
        handler: async (row) => {
          await sdk.ingest.remove(row.id);
          INACTIVE_SOURCES.delete(row.id);
          await refreshDocs(sdk);
        }
      }
    },
    toolbar: {
      primary: [
        {
          id: "deactivate",
          label: "Deactivate",
          when: (s) => s.selection.length,
          handler: async () => {
            const ids = table.getSelection().map((r) => r.id);
            ids.forEach((id) => INACTIVE_SOURCES.add(id));
            await refreshDocs(sdk);
          }
        },
        {
          id: "activate",
          label: "Activate",
          when: (s) => s.selection.length,
          handler: async () => {
            const ids = table.getSelection().map((r) => r.id);
            ids.forEach((id) => INACTIVE_SOURCES.delete(id));
            await refreshDocs(sdk);
          }
        }
      ]
    }
  });

  // 3) Wire refresh
  document.getElementById("doc_refresh")?.addEventListener("click", () => refreshDocs(sdk));

  // 4) Initial paint
  refreshDocs(sdk);
}

async function refreshDocs(sdk) {
  const docs = await sdk.documents.list(); // [{title,id,segments}, ...]
  const rows = docs.map(d => ({
    ...d,
    status: INACTIVE_SOURCES.has(d.id) ? "inactive" : "active"
  }));
  table?.setItems(rows);
}
