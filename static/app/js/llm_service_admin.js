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
