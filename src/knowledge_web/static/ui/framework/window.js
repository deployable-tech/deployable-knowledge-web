export function spawnWindow({ id, title = '', onOpen, onClose, resizable = true } = {}) {
  const el = document.createElement('div');
  el.className = 'window';
  if (id) el.id = id;
  const header = document.createElement('div');
  header.className = 'header';
  const titleEl = document.createElement('div');
  titleEl.className = 'title';
  titleEl.textContent = title;
  const closeBtn = document.createElement('button');
  closeBtn.className = 'close';
  closeBtn.textContent = '\u00d7';
  closeBtn.addEventListener('click', () => controller.close());
  header.append(titleEl, closeBtn);
  const content = document.createElement('div');
  content.className = 'content';
  el.append(header, content);
  document.body.appendChild(el);
  const controller = {
    setTitle(t){ titleEl.textContent = t; },
    close(){ el.remove(); onClose && onClose(); },
    on(){},
    emit(){},
    openModal(opts){ return openModal({ parentWindow: controller, ...opts }); },
    getContentEl(){ return content; }
  };
  onOpen && onOpen(controller);
  return controller;
}

// minimal modal helper referenced by spawnWindow; defined later in components
import { openModal } from '../components/modal.js';
