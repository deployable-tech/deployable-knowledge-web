export function createForm({ target, initial = {}, fields = [], submitLabel = 'Save', onSubmit, onChange } = {}) {
  const form = document.createElement('form');
  const values = { ...initial };
  const dirty = new Set();
  function update(key, value){
    values[key] = value;
    if(JSON.stringify(value) !== JSON.stringify(initial[key])) dirty.add(key); else dirty.delete(key);
    onChange && onChange({ ...values }, dirty.size>0);
  }
  fields.forEach(f => {
    const wrap = document.createElement('label');
    wrap.className = 'field';
    const lab = document.createElement('div');
    lab.textContent = f.label || f.key;
    wrap.append(lab);
    let input;
    switch(f.type){
      case 'text':
      case 'number':
        input = document.createElement('input');
        input.type = f.type === 'number' ? 'number' : 'text';
        input.value = initial[f.key] ?? '';
        input.addEventListener('input', () => update(f.key, f.type==='number'? Number(input.value): input.value));
        break;
      case 'textarea':
        input = document.createElement('textarea');
        input.value = initial[f.key] ?? '';
        input.addEventListener('input', () => update(f.key, input.value));
        break;
      case 'toggle':
        input = document.createElement('input');
        input.type = 'checkbox';
        input.checked = Boolean(initial[f.key]);
        input.addEventListener('change', () => update(f.key, input.checked));
        break;
      case 'select':
        input = document.createElement('select');
        (f.options || []).forEach(o => {
          const opt = document.createElement('option');
          if(typeof o === 'object'){ opt.value=o.value; opt.textContent=o.label||o.value; } else { opt.value=o; opt.textContent=o; }
          input.append(opt);
        });
        input.value = initial[f.key] ?? '';
        input.addEventListener('change', () => update(f.key, input.value));
        break;
      case 'json':
        input = document.createElement('textarea');
        input.value = initial[f.key] ? JSON.stringify(initial[f.key], null, 2) : '';
        input.addEventListener('input', () => {
          try {
            const obj = input.value ? JSON.parse(input.value) : null;
            input.classList.remove('invalid');
            update(f.key, obj);
          } catch {
            input.classList.add('invalid');
          }
        });
        break;
      default:
        input = document.createElement('input');
    }
    wrap.append(input);
    form.append(wrap);
  });
  const footer = document.createElement('div');
  footer.className = 'form-footer';
  const submit = document.createElement('button');
  submit.type = 'submit';
  submit.textContent = submitLabel;
  footer.append(submit);
  form.append(footer);
  form.addEventListener('submit', e => {
    e.preventDefault();
    onSubmit && onSubmit({ ...values });
  });
  target?.appendChild(form);
  return {
    getValues: () => ({ ...values }),
    setValues: v => { Object.keys(v).forEach(k => { initial[k]=v[k]; update(k,v[k]); }); },
    el: form
  };
}
