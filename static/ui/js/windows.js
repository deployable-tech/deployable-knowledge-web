export function initWindows({ containerId = 'desktop', menuId = 'windowMenu' } = {}) {
  const container = document.getElementById(containerId) || document.body;
  const menu = document.getElementById(menuId);
  const registry = new Map();
  let zTop = 1;

  if (menu) {
    menu.innerHTML = '';
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Windows…';
    menu.appendChild(placeholder);
  }

  const bringToFront = (w) => {
    zTop += 1;
    w.style.zIndex = zTop;
  };

  function buildWindow(section, idx) {
    const id = section.dataset.win || `win-${idx}`;
    const title = section.dataset.title || section.querySelector('h2')?.textContent || id;

    const wrap = document.createElement('div');
    wrap.className = 'window';
    wrap.dataset.id = id;
    wrap.style.left = `${40 + idx * 30}px`;
    wrap.style.top = `${40 + idx * 30}px`;
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

    // drag
    bar.addEventListener('mousedown', (e) => {
      bringToFront(wrap);
      const startX = e.clientX - wrap.offsetLeft;
      const startY = e.clientY - wrap.offsetTop;
      function onMove(ev) {
        wrap.style.left = `${ev.clientX - startX}px`;
        wrap.style.top = `${ev.clientY - startY}px`;
      }
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', () => document.removeEventListener('mousemove', onMove), { once: true });
    });

    bar.addEventListener('dblclick', () => {
      wrap.classList.toggle('window--docked');
    });

    wrap.addEventListener('mousedown', () => bringToFront(wrap));

    minBtn.addEventListener('click', () => {
      body.style.display = body.style.display === 'none' ? '' : 'none';
    });
    closeBtn.addEventListener('click', () => {
      wrap.style.display = 'none';
    });

    wrap.style.resize = 'both';
    wrap.style.overflow = 'auto';

    registry.set(id, wrap);
    container.appendChild(wrap);

    if (menu) {
      const opt = document.createElement('option');
      opt.value = id;
      opt.textContent = title;
      menu.appendChild(opt);
    }
  }

  document.querySelectorAll('section[data-win]').forEach((s, idx) => buildWindow(s, idx));

  if (menu) {
    menu.addEventListener('change', () => {
      const id = menu.value;
      const win = registry.get(id);
      if (win) {
        win.style.display = 'block';
        bringToFront(win);
      }
      menu.value = '';
    });
  }
}
