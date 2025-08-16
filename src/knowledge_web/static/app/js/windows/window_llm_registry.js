import { spawnWindow } from '../../ui/framework/window.js';
import { createForm } from '../../ui/components/form.js';
import { createItemList } from '../../ui/components/list.js';
import { withAsyncState } from '../../ui/components/async.js';
import { showToast } from '../../ui/components/toast.js';
import { llm } from '../sdk.js';

export function openLLMRegistry(){
  const win = spawnWindow({ id:'win_llm_registry', title:'LLM Services', resizable:true });
  const content = win.getContentEl();
  const formEl = document.createElement('div');
  const listEl = document.createElement('div');
  content.append(formEl, listEl);

  let currentService = null;
  const serviceForm = createForm({
    target: formEl,
    initial: { name:'', provider:'openai', base_url:'', auth_ref:'', timeout_sec:30, is_enabled:true, extra:{} },
    fields: [
      { type:'text', key:'name', label:'Name', required:true },
      { type:'select', key:'provider', label:'Provider', options:['openai','anthropic','ollama','vllm','custom'] },
      { type:'text', key:'base_url', label:'Base URL' },
      { type:'text', key:'auth_ref', label:'Auth Ref' },
      { type:'number', key:'timeout_sec', label:'Timeout (sec)' },
      { type:'toggle', key:'is_enabled', label:'Enabled' },
      { type:'json', key:'extra', label:'Extra (JSON)' }
    ],
    submitLabel:'Save',
    onSubmit: async (vals) => {
      try {
        if(currentService && currentService.id){
          await llm.updateService(currentService.id, vals);
        } else {
          await llm.createService(vals);
        }
        showToast({ type:'success', message:'Service saved' });
        currentService = null;
        serviceForm.setValues({ name:'', provider:'openai', base_url:'', auth_ref:'', timeout_sec:30, is_enabled:true, extra:{} });
        loadServices();
      } catch(err){
        showToast({ type:'error', message:String(err) });
      }
    }
  });

  const svcList = createItemList({
    target:listEl,
    columns:[{ key:'name', label:'Service' },{ key:'provider', label:'Provider' }],
    actions:{
      edit: (item)=>{ currentService = item; serviceForm.setValues(item); loadModels(item.id); },
      delete: async (item)=>{ if(confirm('Delete service?')){ await llm.deleteService(item.id); loadServices(); }}
    },
    getRowId: s=>s.id
  });

  const modelsTitle = document.createElement('h3');
  modelsTitle.textContent = 'Models';
  const modelsEl = document.createElement('div');
  content.append(modelsTitle, modelsEl);

  const modelList = createItemList({
    target: modelsEl,
    columns:[{ key:'name', label:'Model' }, { key:'engine', label:'Engine' }],
    actions:{
      rename: (m)=> openModelModal('Rename Model', { ...m }, async vals => { await llm.updateModel(m.id, vals); loadModels(m.service_id); }),
      delete: async (m)=>{ if(confirm('Delete model?')){ await llm.deleteModel(m.id); loadModels(m.service_id); }}
    },
    getRowId: m=>m.id
  });

  const addModelBtn = document.createElement('button');
  addModelBtn.textContent = 'Add Model';
  addModelBtn.addEventListener('click', () => {
    if(!currentService){ showToast({ type:'warn', message:'Select a service first' }); return; }
    openModelModal('Add Model', { service_id: currentService.id }, async vals => { await llm.createModel({ ...vals, service_id: currentService.id }); loadModels(currentService.id); });
  });
  modelsEl.prepend(addModelBtn);

  function openModelModal(title, initial, onSave){
    win.openModal({
      title,
      content(modal){
        const formDiv = modal.getContentEl();
        const frm = createForm({
          target: formDiv,
          initial: { name: initial.name || '', engine: initial.engine || '', extra: initial.extra || {} },
          fields:[
            { type:'text', key:'name', label:'Name', required:true },
            { type:'text', key:'engine', label:'Engine', required:true },
            { type:'json', key:'extra', label:'Params (JSON)' }
          ],
          submitLabel:'Save',
          onSubmit: async (vals) => {
            try { await onSave(vals); showToast({ type:'success', message:'Model saved' }); modal.close(); }
            catch(err){ showToast({ type:'error', message:String(err) }); }
          }
        });
      }
    });
  }

  function loadServices(){
    withAsyncState(llm.listServices(), {
      onLoading: ()=>svcList.setLoading && svcList.setLoading(true),
      onError: err=>{ svcList.setLoading && svcList.setLoading(false); svcList.setError && svcList.setError('Error'); showToast({ type:'error', message:String(err) }); },
      onData: data=>{ svcList.setLoading && svcList.setLoading(false); svcList.setItems(data); if(data.length===0) svcList.setError && svcList.setError('No services'); }
    });
  }

  function loadModels(serviceId){
    withAsyncState(llm.listModels(serviceId), {
      onLoading: ()=>modelList.setLoading && modelList.setLoading(true),
      onError: err=>{ modelList.setLoading && modelList.setLoading(false); modelList.setError && modelList.setError('Error'); showToast({ type:'error', message:String(err) }); },
      onData: data=>{ modelList.setLoading && modelList.setLoading(false); modelList.setItems(data); if(data.length===0) modelList.setError && modelList.setError('No models'); }
    });
  }

  loadServices();
  return win;
}
