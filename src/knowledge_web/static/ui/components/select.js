export function createSelect({ target, options = [], value, onChange, emptyLabel = 'Select' } = {}) {
  const sel = document.createElement('select');
  const emptyOpt = document.createElement('option');
  emptyOpt.value = '';
  emptyOpt.textContent = emptyLabel;
  sel.append(emptyOpt);
  options.forEach(o => {
    const opt = document.createElement('option');
    opt.value = o.value ?? o;
    opt.textContent = o.label ?? o.value ?? o;
    sel.append(opt);
  });
  if(value != null) sel.value = value;
  sel.addEventListener('change', () => onChange && onChange(sel.value));
  target?.appendChild(sel);
  return { setOptions(newOpts){
    sel.innerHTML='';
    const empty = document.createElement('option');
    empty.value='';
    empty.textContent=emptyLabel;
    sel.append(empty);
    newOpts.forEach(o=>{
      const opt=document.createElement('option');
      opt.value=o.value??o;
      opt.textContent=o.label??o.value??o;
      sel.append(opt);
    });
  }, setValue(v){ sel.value=v; } };
}
