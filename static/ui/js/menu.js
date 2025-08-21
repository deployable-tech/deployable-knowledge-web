export function createMenu({ containerId, buttonText, items = [], onSelect } = {}) {
  const container = document.getElementById(containerId);
  if (!container) return null;
  container.classList.add('menu');

  const btn = document.createElement('button');
  btn.textContent = buttonText || '';
  container.appendChild(btn);

  const list = document.createElement('ul');
  list.className = 'menu-list';
  items.forEach(it => {
    const li = document.createElement('li');
    li.textContent = it.label || it.action;
    if (it.action) li.dataset.action = it.action;
    list.appendChild(li);
  });
  container.appendChild(list);

  btn.addEventListener('click', e => {
    e.stopPropagation();
    list.classList.toggle('visible');
  });

  list.addEventListener('click', e => {
    const li = e.target.closest('li');
    if (!li) return;
    list.classList.remove('visible');
    if (onSelect) onSelect(li.dataset.action, li);
  });

  document.addEventListener('click', () => list.classList.remove('visible'));
  return { button: btn, menu: list };
}
