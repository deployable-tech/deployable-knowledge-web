export function createSpinner(target){
  const el = document.createElement('div');
  el.className = 'spinner';
  if(target) target.appendChild(el);
  return { remove(){ el.remove(); } };
}
