/* Shared portal styling and sticky header offsets. */
(function () {
  'use strict';
  const service = document.currentScript?.dataset.qmService;
  if (!service) return;

  let pinnedHeader = null;
  let frame = 0;
  const headerResize = window.ResizeObserver ? new ResizeObserver(schedule) : null;

  function update() {
    frame = 0;
    const path = location.pathname;
    const isRoot = path === '/' || path === '/index.html' || (service === 'account' && path === '/account');
    document.body.classList.toggle('qmw-root-view', isRoot);

    let header = document.querySelector('.lab-header,#dict-app-header,body>.qmf-header,body>.topbar,body>.site-header');
    while (header && header !== document.body && !['fixed', 'sticky'].includes(getComputedStyle(header).position)) {
      header = header.parentElement;
    }
    if (header === document.body) header = null;

    if (header !== pinnedHeader) {
      headerResize?.disconnect();
      if (header) headerResize?.observe(header);
      pinnedHeader = header;
    }
    const height = pinnedHeader ? Math.round(pinnedHeader.getBoundingClientRect().height) : 0;
    document.body.style.setProperty('--qmw-header-offset', height + 'px');
  }

  function schedule() {
    if (!frame) frame = requestAnimationFrame(update);
  }

  function boot() {
    document.body.classList.add('qmw-site');
    document.body.dataset.qmwService = service;
    document.body.style.setProperty('--qmw-context-height', '0px');
    update();
    new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();

  window.addEventListener('popstate', schedule);
  window.addEventListener('resize', schedule);
})();
