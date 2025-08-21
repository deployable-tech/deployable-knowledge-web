export const serviceAdminWindow = {
  id: 'service-admin',
  title: 'LLM Service Admin',
  layout: [
    {
      tag: 'div',
      class: 'row',
      children: [
        { tag: 'input', id: 'newSvcProvider', attrs: { placeholder: 'provider' } },
        { tag: 'input', id: 'newSvcBaseUrl', attrs: { placeholder: 'base URL' } },
        { tag: 'input', id: 'newSvcAuth', attrs: { placeholder: 'auth ref' } },
        { tag: 'button', id: 'createSvc', text: 'Create Service' }
      ]
    },
    {
      tag: 'div',
      class: 'row',
      children: [
        { tag: 'input', id: 'delSvcId', attrs: { placeholder: 'service id' } },
        { tag: 'button', id: 'deleteSvc', text: 'Delete Service' }
      ]
    },
    {
      tag: 'div',
      class: 'row',
      children: [
        { tag: 'input', id: 'modelSvcId', attrs: { placeholder: 'service id' } },
        { tag: 'input', id: 'modelName', attrs: { placeholder: 'model name' } },
        { tag: 'input', id: 'modelModality', attrs: { placeholder: 'modality' } },
        { tag: 'button', id: 'createModel', text: 'Add Model' }
      ]
    },
    {
      tag: 'div',
      class: 'row',
      children: [
        { tag: 'input', id: 'delModelId', attrs: { placeholder: 'model id' } },
        { tag: 'button', id: 'deleteModel', text: 'Delete Model' }
      ]
    },
    { tag: 'pre', id: 'svcAdminOut', class: 'mono', attrs: { style: 'max-height:200px;' } }
  ]
};

export function setupLLMServiceAdminUI({ getSDK, elements, helpers }) {
  const {
    createSvc,
    deleteSvc,
    createModel,
    deleteModel,
    newSvcProvider,
    newSvcBaseUrl,
    newSvcAuth,
    delSvcId,
    modelSvcId,
    modelName,
    modelModality,
    delModelId,
    out
  } = elements;
  const { ensureSDK, setBusy, toastOK, toastERR } = helpers;

  createSvc.addEventListener('click', async () => {
    try {
      ensureSDK();
      setBusy(createSvc, true);
      const sdk = getSDK();
      const payload = {
        provider: newSvcProvider.value,
        base_url: newSvcBaseUrl.value,
        auth_ref: newSvcAuth.value || undefined
      };
      const res = await sdk.llm.createService(payload);
      toastOK(out, res);
    } catch (e) {
      toastERR(out, e);
    } finally {
      setBusy(createSvc, false);
    }
  });

  deleteSvc.addEventListener('click', async () => {
    try {
      ensureSDK();
      setBusy(deleteSvc, true);
      const sdk = getSDK();
      const res = await sdk.llm.deleteService(delSvcId.value);
      toastOK(out, res);
    } catch (e) {
      toastERR(out, e);
    } finally {
      setBusy(deleteSvc, false);
    }
  });

  createModel.addEventListener('click', async () => {
    try {
      ensureSDK();
      setBusy(createModel, true);
      const sdk = getSDK();
      const payload = {
        service_id: modelSvcId.value,
        model_name: modelName.value,
        modality: modelModality.value
      };
      const res = await sdk.llm.createModel(payload);
      toastOK(out, res);
    } catch (e) {
      toastERR(out, e);
    } finally {
      setBusy(createModel, false);
    }
  });

  deleteModel.addEventListener('click', async () => {
    try {
      ensureSDK();
      setBusy(deleteModel, true);
      const sdk = getSDK();
      const res = await sdk.llm.deleteModel(delModelId.value);
      toastOK(out, res);
    } catch (e) {
      toastERR(out, e);
    } finally {
      setBusy(deleteModel, false);
    }
  });
}
