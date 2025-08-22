let sdkGetter = null;
export let currentSessionId = null;

const sessionChangeHandlers = [];
const sessionsLoadedHandlers = [];

export function init(getSDK) {
  sdkGetter = getSDK;
}

function getSDK() {
  return typeof sdkGetter === 'function' ? sdkGetter() : null;
}

export function onSessionChange(fn) {
  sessionChangeHandlers.push(fn);
}

export function onSessionsLoaded(fn) {
  sessionsLoadedHandlers.push(fn);
}

function emitSessionChange(id) {
  sessionChangeHandlers.forEach(fn => fn(id));
}

function emitSessionsLoaded(list) {
  sessionsLoadedHandlers.forEach(fn => fn(list));
}

export async function list() {
  const sdk = getSDK();
  if (!sdk) return [];
  const res = await sdk.sessions.list();
  emitSessionsLoaded(res);
  return res;
}

export async function get(id) {
  const sdk = getSDK();
  if (!sdk) throw new Error('SDK not ready');
  return sdk.sessions.get(id);
}

export async function create() {
  const sdk = getSDK();
  if (!sdk) throw new Error('SDK not ready');
  const res = await sdk.sessions.create();
  setCurrent(res.session_id);
  return res;
}

export async function ensure() {
  const sdk = getSDK();
  if (!sdk) throw new Error('SDK not ready');
  const res = await sdk.sessions.ensure();
  setCurrent(res.session_id);
  return res;
}

export function setCurrent(id) {
  currentSessionId = id;
  emitSessionChange(id);
}

export function getCurrent() {
  return currentSessionId;
}
