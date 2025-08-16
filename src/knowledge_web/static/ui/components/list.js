export function createItemList({ target, columns = [], items = [], actions = {}, getRowId } = {}) {
  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const trHead = document.createElement('tr');
  columns.forEach(c => {
    const th = document.createElement('th');
    th.textContent = c.label || c.key;
    trHead.append(th);
  });
  if (actions && Object.keys(actions).length){
    const th = document.createElement('th');
    th.textContent = 'Actions';
    trHead.append(th);
  }
  thead.append(trHead);
  table.append(thead);
  const tbody = document.createElement('tbody');
  table.append(tbody);
  function render(data){
    tbody.innerHTML = '';
    data.forEach(item => {
      const tr = document.createElement('tr');
      columns.forEach(c => {
        const td = document.createElement('td');
        td.textContent = item[c.key];
        tr.append(td);
      });
      if(actions && Object.keys(actions).length){
        const td = document.createElement('td');
        Object.entries(actions).forEach(([name, cb]) => {
          const btn = document.createElement('button');
          btn.textContent = name;
          btn.addEventListener('click', () => cb(item));
          td.append(btn);
        });
        tr.append(td);
      }
      tbody.append(tr);
    });
  }
  render(items);
  target?.appendChild(table);
  return { setItems: render, setLoading(){}, setError(){}, el: table };
}
