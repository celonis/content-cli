// Keep in sync with ems-frontend fragments/sandbox route-observer.ts.
export const PREVIEW_ROUTE_OBSERVER = `(() => {
  const delivery = document.getElementById('fragment-delivery');
  const base = delivery ? JSON.parse(delivery.textContent).baseHref.slice(0, -1) : '';
  let last;
  let queued = false;
  const report = (initial = false) => {
    const path = location.pathname;
    const url = (path === base ? '/' : path.startsWith(base + '/') ? path.slice(base.length) : path)
      + location.search + location.hash;
    if (parent === window || url === last) return;
    last = url;
    parent.postMessage({type: 'ems-fragment-route-report-v1', url, initial}, '*');
  };
  const schedule = () => {
    if (queued) return;
    queued = true;
    queueMicrotask(() => { queued = false; report(); });
  };
  for (const name of ['pushState', 'replaceState']) {
    const original = history[name];
    history[name] = function (...args) {
      const result = Reflect.apply(original, this, args);
      schedule();
      return result;
    };
  }
  addEventListener('popstate', schedule);
  addEventListener('hashchange', schedule);
  report(true);
})();`;
