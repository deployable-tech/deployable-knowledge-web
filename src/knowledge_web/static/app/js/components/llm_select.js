import { llm } from "../sdk.js";

export function attachLLMSelect(container) {
  if (!container) return;
  container.classList?.add("llm-select");
  const svcSel = document.createElement("select");
  svcSel.className = "input";
  const mdlSel = document.createElement("select");
  mdlSel.className = "input";
  container.appendChild(svcSel);
  container.appendChild(mdlSel);

  async function refreshServices() {
    const services = await llm.listServices();
    svcSel.innerHTML = "";
    const optEmpty = document.createElement("option");
    optEmpty.value = "";
    optEmpty.textContent = "(service)";
    svcSel.appendChild(optEmpty);
    for (const s of services) {
      const o = document.createElement("option");
      o.value = s.id;
      o.textContent = s.name;
      svcSel.appendChild(o);
    }
  }

  async function refreshModels(serviceId) {
    mdlSel.innerHTML = "";
    if (!serviceId) return;
    const models = await llm.listModels(serviceId);
    const optEmpty = document.createElement("option");
    optEmpty.value = "";
    optEmpty.textContent = "(model)";
    mdlSel.appendChild(optEmpty);
    for (const m of models) {
      const o = document.createElement("option");
      o.value = m.id;
      o.textContent = m.name;
      mdlSel.appendChild(o);
    }
  }

  svcSel.addEventListener("change", async () => {
    const svcId = svcSel.value || null;
    await refreshModels(svcId);
    await llm.setSelection({ service_id: svcId, model_id: null });
  });
  mdlSel.addEventListener("change", async () => {
    await llm.setSelection({ service_id: svcSel.value || null, model_id: mdlSel.value || null });
  });

  llm.onSelectionChange(async sel => {
    if (svcSel.value !== (sel.service_id || "")) svcSel.value = sel.service_id || "";
    await refreshModels(sel.service_id);
    mdlSel.value = sel.model_id || "";
  });

  (async () => {
    await refreshServices();
    const sel = await llm.getSelection();
    svcSel.value = sel.service_id || "";
    await refreshModels(sel.service_id);
    mdlSel.value = sel.model_id || "";
  })();
}
