export function initWindows({ containerId = 'desktop', menuId = 'windowMenu', menuBtnId = 'windowMenuBtn' } = {}) {
  const container = document.getElementById(containerId) || document.body;
  const menu = document.getElementById(menuId);
  const menuBtn = document.getElementById(menuBtnId);
  const registry = new Map();
  let zTop = 1;

  if (menu) {
    menu.innerHTML = '';
  }

  const bringToFront = (w) => {
    zTop += 1;
    w.style.zIndex = zTop;
    w.focus();
  };

  function buildWindow(section, idx) {
    const id = section.dataset.win || `win-${idx}`;
    const title = section.dataset.title || section.querySelector('h2')?.textContent || id;

    const wrap = document.createElement('div');
    wrap.className = 'window';
    wrap.dataset.id = id;
    wrap.tabIndex = 0;
    const saved = JSON.parse(localStorage.getItem(`win:${id}`) || '{}');
    wrap.style.left = saved.left || `${40 + idx * 30}px`;
    wrap.style.top = saved.top || `${40 + idx * 30}px`;
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
    const h2 = section.querySelector('h2');
    if (h2) h2.remove();
    while (section.firstChild) {
      body.appendChild(section.firstChild);
    }
    section.remove();

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

    minBtn.addEventListener('click', () => {
      body.style.display = body.style.display === 'none' ? '' : 'none';
      saveState();
    });
    closeBtn.addEventListener('click', () => {
      wrap.style.display = 'none';
      saveState();
    });

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
      if (e.key === 'Escape') {
        wrap.style.display = 'none';
        saveState();
      }
    });

    registry.set(id, wrap);
    container.appendChild(wrap);

    clamp();

    if (menu) {
      const li = document.createElement('li');
      li.textContent = title;
      li.addEventListener('click', () => {
        wrap.style.display = 'block';
        bringToFront(wrap);
        menu.classList.remove('visible');
      });
      menu.appendChild(li);
    }
  }

  document.querySelectorAll('section[data-win]').forEach((s, idx) => buildWindow(s, idx));

  if (menu && menuBtn) {
    menuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      menu.classList.toggle('visible');
    });
    document.addEventListener('click', () => menu.classList.remove('visible'));
  }
}
