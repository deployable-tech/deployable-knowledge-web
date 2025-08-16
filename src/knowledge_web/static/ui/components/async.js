export function withAsyncState(promise, { onLoading, onError, onData }) {
  try {
    onLoading && onLoading();
    Promise.resolve(promise)
      .then(d => { onData && onData(d); })
      .catch(err => { onError && onError(err); });
  } catch (e) {
    onError && onError(e);
  }
}
