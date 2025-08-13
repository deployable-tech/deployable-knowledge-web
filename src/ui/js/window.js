const registry = new Map();

export function registerWindowType(name, renderer) {
  registry.set(name, renderer);
}

export function createWindow(type, cfg = {}, winId) {
  const renderer = registry.get(type);
  if (!renderer) throw new Error(`Unknown window type: ${type}`);
  return renderer(cfg, winId);
}

export { registry as _registry };
