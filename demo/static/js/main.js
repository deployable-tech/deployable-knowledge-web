import { initWindowDnD } from "/static/js/dnd.js";
import { initSplitter } from "/static/js/splitter.js";
import { createMiniWindowFromConfig, initWindowResize, mountModal } from "/static/js/window.js";
import { initMenu } from "/static/js/menu.js";
import { createUserMenu } from "/static/js/user_menu.js";
import { getVar, setVar } from "/static/js/theme.js";

// Initialise basic UI helpers
initSplitter();
initWindowDnD();
initWindowResize();

function spawnWindow(cfg) {
  const node = createMiniWindowFromConfig(cfg);
  if (cfg.modal) {
    mountModal(node, { fade: cfg.modalFade !== false });
  } else {
    const col = document.getElementById(cfg.col === "right" ? "col-right" : "col-left");
    col.appendChild(node);
  }
  return node;
}

const headerRight = document.querySelector(".app-header .right");
const userMenu = createUserMenu({
  name: "Demo User",
  items: [
    { id: "account", label: "Account Settings", onClick: () => console.log("account") },
    { id: "appearance", label: "Appearance", onClick: () => spawnAppearanceWindow() },
    { separator: true },
    { id: "logout", label: "Logout", onClick: () => console.log("logout") }
  ]
});
headerRight.appendChild(userMenu);

function spawnAppearanceWindow() {
  const win = spawnWindow({
    id: `appearance_${counter++}`,
    window_type: "window_generic",
    title: "Appearance",
    col: "right",
    resizable: true,
    dockable: true,
    Elements: [
      {
        type: "number_field",
        id: "theme_h",
        name: "Hue",
        min: 0,
        max: 360,
        value: parseInt(getVar("--h")) || 220
      },
      {
        type: "number_field",
        id: "theme_sat",
        name: "Sat",
        min: 0,
        max: 100,
        value: parseInt(getVar("--sat")) || 18
      },
      {
        type: "number_field",
        id: "theme_radius",
        name: "Radius",
        min: 0,
        max: 40,
        value: parseInt(getVar("--radius")) || 16
      },
      { type: "submit_button", text: "Apply" }
    ]
  });

  const form = win.querySelector("form");
  const apply = () => {
    const h = form.querySelector("#theme_h").value;
    const s = form.querySelector("#theme_sat").value;
    const r = form.querySelector("#theme_radius").value;
    setVar("--h", h);
    setVar("--sat", `${s}%`);
    setVar("--radius", `${r}px`);
  };
  form.addEventListener("change", apply);
  form.addEventListener("submit", (e) => { e.preventDefault(); apply(); });
}

// Seed demo windows
spawnWindow({
  id: "win_left",
  window_type: "window_generic",
  title: "Left Demo",
  col: "left",
  unique: true,
  resizable: true,
  Elements: [
    { type: "text", text: "This is a generic left window." }
  ]
});

spawnWindow({
  id: "win_right",
  window_type: "window_generic",
  title: "Right Demo",
  col: "right",
  unique: true,
  resizable: true,
  Elements: [
    { type: "text", text: "This is a generic right window." }
  ]
});

// Simple menu actions to spawn additional windows
let counter = 0;
initMenu((action) => {
  if (action === "spawn-left") {
    counter++;
    spawnWindow({
      id: `left_${counter}`,
      window_type: "window_generic",
      title: `Left Window ${counter}`,
      col: "left",
      resizable: true,
      Elements: [{ type: "text", text: `Dynamic left window ${counter}.` }]
    });
  }
  if (action === "spawn-right") {
    counter++;
    spawnWindow({
      id: `right_${counter}`,
      window_type: "window_generic",
      title: `Right Window ${counter}`,
      col: "right",
      resizable: true,
      Elements: [{ type: "text", text: `Dynamic right window ${counter}.` }]
    });
  }
  if (action === "spawn-dockable-modal") {
    counter++;
    spawnWindow({
      id: `dockable_${counter}`,
      window_type: "window_generic",
      title: `Dockable Modal ${counter}`,
      modal: true,
      dockable: true,
      resizable: true,
      Elements: [{ type: "text", text: "This modal can dock or undock." }]
    });
  }
  if (action === "spawn-simple-modal") {
    counter++;
    spawnWindow({
      id: `modal_${counter}`,
      window_type: "window_generic",
      title: `Simple Modal ${counter}`,
      modal: true,
      modalFade: false,
      Elements: [{ type: "text", text: "This modal cannot dock." }]
    });
  }
  if (action === "spawn-showcase") {
    counter++;
    const idx = counter;
    spawnWindow({
      id: `showcase_${idx}`,
      window_type: "window_generic",
      title: `UI Showcase ${idx}`,
      col: "left",
      resizable: true,
      Elements: [
        {
          type: "item_list",
          id: `list_basic_${idx}`,
          label: "Items",
          items: [
            { label: "Item A" },
            { label: "Item B" },
            { label: "Item C" }
          ],
          item_template: { elements: [{ type: "text", bind: "label" }] }
        },
        { type: "text_field", name: "title", label: "Title", placeholder: "Enter title" },
        { type: "text_area", name: "description", label: "Description" },
        {
          type: "select",
          name: "choice",
          label: "Choice",
          options: [
            { value: "one", label: "One" },
            { value: "two", label: "Two" },
            { value: "three", label: "Three" }
          ]
        },
        {
          type: "multi_select",
          name: "tags",
          label: "Tags",
          options: [
            { value: "red", label: "Red" },
            { value: "green", label: "Green" },
            { value: "blue", label: "Blue" }
          ]
        },
        { type: "submit_button", text: "Save" },
        {
          type: "item_list",
          id: `list_custom_${idx}`,
          label: "Files",
          items: [
            { name: "Report.pdf" },
            { name: "Chart.png" }
          ],
          item_template: {
            elements: [
              { type: "text", bind: "name" },
              { type: "button", label: "Open", action: "open" },
              { type: "button", label: "Remove", action: "remove", variant: "danger" }
            ]
          }
        }
      ]
    });
  }
  if (action === "spawn-editor") {
    counter++;
    spawnWindow({
      id: `editor_${counter}`,
      window_type: "window_text_editor",
      title: `Editor ${counter}`,
      col: "left",
      dockable: true,
      resizable: true,
      content: "Type here...",
      onSave: ({ id, content }) => console.log("save", id, content)
    });
  }
  if (action === "spawn-listview") {
    counter++;
    spawnWindow({
      id: `listview_${counter}`,
      window_type: "window_generic",
      title: `List View ${counter}`,
      col: "right",
      resizable: true,
      Elements: [
        {
          type: "list_view",
          id: `lv_${counter}`,
          items: [
            { id: 1, name: "Alpha", role: "admin" },
            { id: 2, name: "Beta", role: "user" },
            { id: 3, name: "Gamma", role: "guest" }
          ],
          keyField: "id",
          template: {
            title: (it) => it.name,
            subtitle: (it) => it.role,
            actions: [
              { label: "Ping", onClick: (item) => console.log("ping", item.name) }
            ]
          },
          selectable: true,
          onSelectChange: (sel) => console.log("select", sel)
        }
      ]
    });
  }
  if (action === "spawn-chat") {
    counter++;
    spawnWindow({
      id: `chat_${counter}`,
      window_type: "window_chat",
      title: `Chat ${counter}`,
      col: "left",
      dockable: true,
      resizable: true,
      onSend: async (text) => ({ role: "assistant", content: `Echo: ${text}` })
    });
  }
  if (action === "spawn-upload") {
    counter++;
    spawnWindow({
      id: `upload_${counter}`,
      window_type: "window_generic",
      title: `Upload ${counter}`,
      col: "right",
      resizable: true,
      Elements: [
        {
          type: "file_upload",
          id: `fu_${counter}`,
          multiple: true,
          buttonLabel: "Upload",
          onUpload: (files) => console.log("upload", files)
        }
      ]
    });
  }
});
