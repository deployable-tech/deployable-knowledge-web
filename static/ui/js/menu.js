export function createMenu({ id, title, options = [] } = {}) {
  const container = document.getElementById(id);
  if (!container) return null;
  container.classList.add('menu');

  const btn = document.createElement('button');
  btn.textContent = title || '';
  container.appendChild(btn);

  const list = document.createElement('ul');
  list.className = 'menu-list';
  options.forEach(opt => {
    const li = document.createElement('li');
    li.textContent = opt.title || opt.id;
    li.dataset.id = opt.id;
    list.appendChild(li);
    li.addEventListener('click', () => {
      list.classList.remove('visible');
      if (typeof opt.action === 'function') {
        opt.action(opt.id);
      }
    });
  });
  container.appendChild(list);

  btn.addEventListener('click', e => {
    e.stopPropagation();
    list.classList.toggle('visible');
  });

  document.addEventListener('click', () => list.classList.remove('visible'));
  return { button: btn, menu: list };
}
