let sdkGetter = null;

function getSDK() {
  return typeof sdkGetter === 'function' ? sdkGetter() : null;
}

const store = {
  init(getSDK) {
    sdkGetter = getSDK;
  },

  session: {
    currentId: null,
    changeHandlers: [],
    loadedHandlers: [],

    onChange(fn) {
      this.changeHandlers.push(fn);
    },

    onLoaded(fn) {
      this.loadedHandlers.push(fn);
    },

    emitChange(id) {
      this.changeHandlers.forEach(fn => fn(id));
    },

    emitLoaded(list) {
      this.loadedHandlers.forEach(fn => fn(list));
    },

    async list() {
      const sdk = getSDK();
      if (!sdk) return [];
      const res = await sdk.sessions.list();
      this.emitLoaded(res);
      return res;
    },

    async get(id) {
      const sdk = getSDK();
      if (!sdk) throw new Error('SDK not ready');
      return sdk.sessions.get(id);
    },

    async create() {
      const sdk = getSDK();
      if (!sdk) throw new Error('SDK not ready');
      const res = await sdk.sessions.create();
      this.setCurrent(res.session_id);
      return res;
    },

    async ensure() {
      const sdk = getSDK();
      if (!sdk) throw new Error('SDK not ready');
      const res = await sdk.sessions.ensure();
      this.setCurrent(res.session_id);
      return res;
    },

    setCurrent(id) {
      this.currentId = id;
      this.emitChange(id);
    },

    getCurrent() {
      return this.currentId;
    }
  },

  llm: {
    serviceId: null,
    modelId: null,
    changeHandlers: [],

    onChange(fn) {
      this.changeHandlers.push(fn);
    },

    emitChange(sel) {
      this.changeHandlers.forEach(fn => fn(sel));
    },

    getSelection() {
      return { serviceId: this.serviceId, modelId: this.modelId };
    },

    async loadSelection() {
      const sdk = getSDK();
      if (!sdk) return this.getSelection();
      const sel = await sdk.llm.getSelection();
      this.serviceId = sel?.service_id || null;
      this.modelId = sel?.model_id || null;
      const cur = this.getSelection();
      this.emitChange(cur);
      return cur;
    },

    async setSelection({ serviceId, modelId }, userId = 'local-user') {
      const sdk = getSDK();
      if (!sdk) throw new Error('SDK not ready');
      const payload = {
        user_id: userId,
        service_id: serviceId || undefined,
        model_id: modelId || undefined
      };
      const res = await sdk.llm.updateSelection(payload);
      this.serviceId = serviceId || null;
      this.modelId = modelId || null;
      this.emitChange(this.getSelection());
      return res;
    }
  }
};

export default store;
