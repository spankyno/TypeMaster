// Analítica propia (Cloudflare Worker). Se carga DESPUÉS del evento load y en un momento ocioso para no
// competir con el render (LCP/TBT), y no se carga para rastreadores (ahorra peticiones/cuota del Worker).
// Archivo externo (no inline) para poder usar una CSP sin 'unsafe-inline' en script-src.
// OJO: el host de abajo debe coincidir con script-src / connect-src / img-src en vercel.json.
(function () {
  if (/bot|crawl|spider|slurp|facebookexternalhit|preview|headless/i.test(navigator.userAgent)) return;
  function load() {
    var s = document.createElement('script');
    s.src = 'https://aitors-hub-dashboard.asanchezgu.workers.dev/tracker.js';
    s.async = true;
    s.setAttribute('data-app', 'typemaster');
    s.setAttribute('data-key', 'ak_2c249677f0a240cb986a541e11b8f0cb');
    document.head.appendChild(s);
  }
  function whenIdle() {
    if ('requestIdleCallback' in window) requestIdleCallback(load, { timeout: 4000 });
    else setTimeout(load, 2000);
  }
  if (document.readyState === 'complete') whenIdle();
  else window.addEventListener('load', whenIdle);
})();
