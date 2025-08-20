export function initWindows({ config = [], containerId = 'desktop', menuId = 'windowMenu', menuBtnId = 'windowMenuBtn' } = {}) {
  const container = document.getElementById(containerId) || document.body;
  const menu = document.getElementById(menuId);
  const menuBtn = document.getElementById(menuBtnId);
  const registry = new Map();
  const elements = {};
  let zTop = 1;

  if (menu) {
    menu.innerHTML = '';
  }

  const bringToFront = (w) => {
    zTop += 1;
    w.style.zIndex = zTop;
    w.focus();
  };

  const defaults = [
    { left: 40,  top: 40 },
    { left: 360, top: 40 },
    { left: 680, top: 40 },
    { left: 40,  top: 300 },
    { left: 360, top: 300 },
    { left: 680, top: 300 },
  ];

  function createElement(desc) {
    const el = document.createElement(desc.tag || 'div');
    if (desc.id) { el.id = desc.id; elements[desc.id] = el; }
    if (desc.class) el.className = desc.class;
    if (desc.text) el.textContent = desc.text;
    if (desc.html) el.innerHTML = desc.html;
    if (desc.attrs) {
      for (const [k, v] of Object.entries(desc.attrs)) {
        if (v === true) el.setAttribute(k, '');
        else if (v !== false && v != null) el.setAttribute(k, v);
      }
    }
    if (desc.children) {
      for (const c of desc.children) {
        el.appendChild(createElement(c));
      }
    }
    return el;
  }

  function hideWindow(id) {
    const w = registry.get(id);
    if (w) {
      w.style.display = 'none';
      try {
        const st = {
          left: w.style.left,
          top: w.style.top,
          width: w.style.width,
          height: w.style.height,
          hidden: true
        };
        localStorage.setItem(`win:${id}`, JSON.stringify(st));
      } catch {}
    }
  }

  function showWindow(id) {
    const w = registry.get(id);
    if (w) {
      w.style.display = '';
      bringToFront(w);
      try {
        const st = JSON.parse(localStorage.getItem(`win:${id}`) || '{}');
        st.hidden = false;
        localStorage.setItem(`win:${id}`, JSON.stringify(st));
      } catch {}
    }
  }

  function buildWindow(def, idx) {
    const id = def.id || `win-${idx}`;
    const title = def.title || id;

    const wrap = document.createElement('div');
    wrap.className = 'window';
    wrap.dataset.id = id;
    wrap.tabIndex = 0;
    const saved = JSON.parse(localStorage.getItem(`win:${id}`) || '{}');
    const defPos = defaults[idx] || { left: 40 + idx * 30, top: 40 + idx * 30 };
    wrap.style.left = saved.left || `${defPos.left}px`;
    wrap.style.top = saved.top || `${defPos.top}px`;
    if (saved.width) wrap.style.width = saved.width;
    if (saved.height) wrap.style.height = saved.height;
    if (saved.hidden) wrap.style.display = 'none';
    bringToFront(wrap);

    const bar = document.createElement('div');
    bar.className = 'window__titlebar';
    const titleSpan = document.createElement('span');
    titleSpan.textContent = title;
    const ctrls = document.createElement('div');
    ctrls.className = 'window__controls';
    const minBtn = document.createElement('button');
    minBtn.textContent = '–';
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    ctrls.appendChild(minBtn);
    ctrls.appendChild(closeBtn);
    bar.appendChild(titleSpan);
    bar.appendChild(ctrls);

    const body = document.createElement('div');
    body.className = 'window__body';
    if (def.layout) {
      for (const item of def.layout) {
        body.appendChild(createElement(item));
      }
    }

    wrap.appendChild(bar);
    wrap.appendChild(body);

    // bounds helper
    const clamp = () => {
      const maxX = container.clientWidth - wrap.offsetWidth;
      const maxY = container.clientHeight - wrap.offsetHeight;

      if (wrap.offsetLeft < 0) {
        wrap.style.left = '0px';
      } else if (wrap.offsetLeft > maxX) {
        wrap.style.left = `${Math.max(maxX, 0)}px`;
      }

      if (wrap.offsetTop < 0) {
        wrap.style.top = '0px';
      } else if (wrap.offsetTop > maxY) {
        wrap.style.top = `${Math.max(maxY, 0)}px`;
      }

      if (wrap.offsetWidth > container.clientWidth) {
        wrap.style.width = `${container.clientWidth}px`;
      }
      if (wrap.offsetHeight > container.clientHeight) {
        wrap.style.height = `${container.clientHeight}px`;
      }
    };

    // drag
    bar.addEventListener('mousedown', (e) => {
      bringToFront(wrap);
      const startX = e.clientX - wrap.offsetLeft;
      const startY = e.clientY - wrap.offsetTop;
      function onMove(ev) {
        wrap.style.left = `${ev.clientX - startX}px`;
        wrap.style.top = `${ev.clientY - startY}px`;
        clamp();
      }
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', () => {
        document.removeEventListener('mousemove', onMove);
        clamp();
        saveState();
      }, { once: true });
    });

    bar.addEventListener('dblclick', () => {
      wrap.classList.toggle('window--docked');
    });

    wrap.addEventListener('mousedown', () => bringToFront(wrap));

    minBtn.addEventListener('click', () => hideWindow(id));
    closeBtn.addEventListener('click', () => hideWindow(id));

    wrap.style.resize = 'both';
    wrap.style.overflow = 'hidden';
    body.style.overflow = 'auto';

    // keep within bounds on resize
    new ResizeObserver(() => { clamp(); saveState(); }).observe(wrap);

    function saveState() {
      const st = {
        left: wrap.style.left,
        top: wrap.style.top,
        width: wrap.style.width,
        height: wrap.style.height,
        hidden: wrap.style.display === 'none'
      };
      try { localStorage.setItem(`win:${id}`, JSON.stringify(st)); } catch {}
    }

    wrap.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') hideWindow(id);
    });

    registry.set(id, wrap);
    container.appendChild(wrap);

    clamp();

    if (menu) {
      const li = document.createElement('li');
      li.textContent = title;
      li.addEventListener('click', () => {
        showWindow(id);
        menu.classList.remove('visible');
      });
      menu.appendChild(li);
    }
  }

  config.forEach((def, idx) => buildWindow(def, idx));

  if (menu && menuBtn) {
    menuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      menu.classList.toggle('visible');
    });
    document.addEventListener('click', () => menu.classList.remove('visible'));
  }

  return { windows: registry, elements, showWindow };
}
