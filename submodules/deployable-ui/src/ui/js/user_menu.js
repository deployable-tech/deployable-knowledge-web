import { el } from "./ui.js";

/**
 * createUserMenu - renders a top bar user/account menu with optional avatar
 * @param {Object} opts
 * @param {string} opts.name - Display name
 * @param {string} [opts.avatar] - Optional image URL; if omitted, first letter is shown
 * @param {Array} [opts.items] - Menu items [{ id, label, onClick, separator }]
 * @returns {HTMLElement}
 */
export function createUserMenu(opts = {}) {
  const { name = "", avatar = null, items = [] } = opts;
  const wrap = el("div", { class: "menu user-menu" });

  const trigger = el(
    "button",
    {
      class: "menu-trigger user-trigger",
      "aria-haspopup": "true",
      "aria-expanded": "false"
    },
    [
      avatar
        ? el("img", { src: avatar, class: "avatar", alt: name || "" })
        : el("span", { class: "avatar" }, [name ? name[0].toUpperCase() : "?"]),
      name ? el("span", { class: "user-name" }, [name]) : null,
      "\u25BE" // down arrow
    ]
  );

  const dropdown = el("div", {
    class: "menu-dropdown user-dropdown",
    role: "menu",
    "aria-hidden": "true"
  });

  function close() {
    dropdown.classList.remove("open");
    trigger.setAttribute("aria-expanded", "false");
    dropdown.setAttribute("aria-hidden", "true");
  }
  function open() {
    dropdown.classList.add("open");
    trigger.setAttribute("aria-expanded", "true");
    dropdown.setAttribute("aria-hidden", "false");
  }

  trigger.addEventListener("click", (e) => {
    e.stopPropagation();
    dropdown.classList.contains("open") ? close() : open();
  });
  document.addEventListener("click", (e) => {
    if (!dropdown.contains(e.target) && e.target !== trigger) close();
  });

  items.forEach((it) => {
    if (it.separator) {
      dropdown.appendChild(el("div", { class: "menu-sep" }));
      return;
    }
    const btn = el(
      "button",
      {
        class: "menu-item user-item",
        role: "menuitem",
        "data-id": it.id || ""
      },
      [it.label || it.id || "Item"]
    );
    if (it.title) btn.title = it.title;
    btn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      close();
      if (it.onClick) it.onClick({ id: it.id });
    });
    dropdown.appendChild(btn);
  });

  wrap.append(trigger, dropdown);
  return wrap;
}

