export function openModal({ parentWindow, title = '', size = 'md', content, onClose } = {}) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  const el = document.createElement('div');
  el.className = 'modal';
  const header = document.createElement('div');
  header.className = 'header';
  const titleEl = document.createElement('div');
  titleEl.className = 'title';
  titleEl.textContent = title;
  const closeBtn = document.createElement('button');
  closeBtn.className = 'close';
  closeBtn.textContent = '\u00d7';
  header.append(titleEl, closeBtn);
  const body = document.createElement('div');
  body.className = 'content';
  el.append(header, body);
  overlay.append(el);
  document.body.append(overlay);
  const controller = {
    close(){ overlay.remove(); onClose && onClose(); },
    on(){}, emit(){},
    setTitle(t){ titleEl.textContent = t; },
    getContentEl(){ return body; }
  };
  closeBtn.addEventListener('click', controller.close);
  if (typeof content === 'function') content(controller);
  return controller;
}
