(function(){
  if(!('serviceWorker' in navigator)) return;
  // the worker sits next to this file, so pages in /pt/ find it too
  const base = new URL('.', (document.currentScript && document.currentScript.src) || location.href);
  function register(){
    const u = new URL('service-worker.js', base).toString();
    (async()=>{
      try{
        const r = await fetch(u, { cache: 'no-store' });
        if(!r.ok) throw new Error('SW missing: ' + r.status);
        await navigator.serviceWorker.register(u, { scope: base.pathname });
        console.log('[SW] registered');
      }catch(e){
        console.warn('[SW] skipped:', e && e.message ? e.message : e);
      }
    })();
  }
  // After full load, and then when the main thread is idle (non-critical).
  window.addEventListener('load', function(){
    if('requestIdleCallback' in window){
      requestIdleCallback(register, { timeout: 5000 });
    }else{
      setTimeout(register, 3000);
    }
  });
})();