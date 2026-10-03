/**
 * QMF Join Overlay — reusable quiz / game entry experience.
 *
 * Public API:
 *   QMFJoinOverlay.open({ value?, source?, onJoin? })
 *   QMFJoinOverlay.close(reason?)
 *   QMFJoinOverlay.normalizeInput(value)
 *   QMFJoinOverlay.resolveRoute(value)
 *   QMFJoinOverlay.toJoinUrl(value)
 *
 * Routing:
 *   6-digit PIN     → play.quizzman.com/live/{pin}
 *   S…              → play.quizzman.com/slide?code=
 *   Q…              → play.quizzman.com?code=
 *   H…              → play.quizzman.com/homework/{code}
 *   PK…             → play.quizzman.com/pikahans?code=
 *
 * Declarative trigger:
 *   <button data-qmf-join data-qmf-join-value="123456">Join Quiz</button>
 */
(function() {
  'use strict';

  const VERSION = '1.0.5';
  const PIN_LENGTH = 6;
  const PLAY_ORIGIN = 'https://play.quizzman.com';
  const ALLOWED_INVITE_HOSTS = new Set([
    'play.quizzman.com',
    'www.play.quizzman.com',
    'join.quizzman.com',
    'www.join.quizzman.com',
  ]);
  const ROOT_ID = 'qmf-join-overlay';
  const STYLE_ID = 'qmf-join-overlay-styles';
  const FONT_ID = 'qmf-join-overlay-fonts';
  const RECENT_KEY = 'qmf:recent-live-games';
  const scriptSrc = document.currentScript?.src || '';
  const moduleBase = scriptSrc
    ? scriptSrc.replace(/\/join-overlay\.js(?:\?.*)?$/, '')
    : 'https://ui.quizzman.com/qmf/dist/modules/join-overlay';

  function dispatch(name, detail = {}) {
    window.dispatchEvent(new CustomEvent(`qmf:join-${name}`, { detail }));
  }

  function cleanCode(value) {
    return String(value || '')
      .trim()
      .toUpperCase()
      .replace(/[\s_-]+/g, '');
  }

  function digits(value) {
    return String(value || '').replace(/\D/g, '').slice(0, PIN_LENGTH);
  }

  function formatPin(value) {
    const pin = digits(value);
    return pin.length > 3 ? `${pin.slice(0, 3)} ${pin.slice(3)}` : pin;
  }

  function formatDisplay(code, type) {
    if (type === 'pin') return formatPin(code);
    return String(code || '').toUpperCase();
  }

  function routeFromCode(rawCode) {
    const code = cleanCode(rawCode);
    if (!code) return { valid: false, type: 'empty', code: '', url: '' };

    if (/^\d{6}$/.test(code)) {
      return {
        valid: true,
        type: 'pin',
        code,
        url: `${PLAY_ORIGIN}/live/${code}`,
      };
    }

    if (code.startsWith('PK')) {
      return {
        valid: true,
        type: 'pikahans',
        code,
        url: `${PLAY_ORIGIN}/pikahans?code=${encodeURIComponent(code)}`,
      };
    }

    if (code.startsWith('S') && code.length >= 2) {
      return {
        valid: true,
        type: 'slide',
        code,
        url: `${PLAY_ORIGIN}/slide?code=${encodeURIComponent(code)}`,
      };
    }

    if (code.startsWith('Q') && code.length >= 2) {
      return {
        valid: true,
        type: 'quiz',
        code,
        url: `${PLAY_ORIGIN}/?code=${encodeURIComponent(code)}`,
      };
    }

    if (code.startsWith('H') && code.length >= 2) {
      return {
        valid: true,
        type: 'homework',
        code,
        url: `${PLAY_ORIGIN}/homework/${encodeURIComponent(code)}`,
      };
    }

    return { valid: false, type: 'invalid', code, url: '' };
  }

  function routeFromAllowedUrl(raw) {
    let url;
    try {
      url = new URL(String(raw || '').trim());
    } catch {
      return { valid: false, type: 'invalid-link', code: '', url: '' };
    }
    if (url.protocol !== 'https:' || !ALLOWED_INVITE_HOSTS.has(url.hostname.toLowerCase())) {
      return { valid: false, type: 'invalid-link', code: '', url: '' };
    }

    const liveMatch = url.pathname.match(/\/live\/(\d{6})(?:\/|$)/i);
    if (liveMatch) return routeFromCode(liveMatch[1]);

    const hwMatch = url.pathname.match(/\/homework\/([^/?#]+)/i);
    if (hwMatch) return routeFromCode(hwMatch[1]);

    const codeParam = url.searchParams.get('code')
      || url.searchParams.get('pin')
      || url.searchParams.get('gamePin')
      || '';
    if (codeParam) return routeFromCode(codeParam);

    return { valid: false, type: 'invalid-link', code: '', url: '' };
  }

  function normalizeInput(value) {
    const raw = String(value || '').trim();
    if (!raw) return { valid: false, pin: '', code: '', type: 'empty', url: '' };
    if (/^https?:\/\//i.test(raw)) {
      const route = routeFromAllowedUrl(raw);
      return {
        valid: route.valid,
        pin: route.type === 'pin' ? route.code : '',
        code: route.code,
        type: route.type,
        url: route.url,
      };
    }
    const route = routeFromCode(raw);
    return {
      valid: route.valid,
      pin: route.type === 'pin' ? route.code : '',
      code: route.code,
      type: route.type,
      url: route.url,
    };
  }

  function toJoinUrl(value) {
    return normalizeInput(value).url || '';
  }

  function ensureFonts() {
    if (document.getElementById(FONT_ID)) return;
    const preconnect = document.createElement('link');
    preconnect.rel = 'preconnect';
    preconnect.href = 'https://fonts.googleapis.com';
    document.head.appendChild(preconnect);
    const preconnect2 = document.createElement('link');
    preconnect2.rel = 'preconnect';
    preconnect2.href = 'https://fonts.gstatic.com';
    preconnect2.crossOrigin = 'anonymous';
    document.head.appendChild(preconnect2);
    const link = document.createElement('link');
    link.id = FONT_ID;
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&family=Nunito:wght@600;700;800;900&display=swap';
    document.head.appendChild(link);
  }

  function ensureStyles() {
    ensureFonts();
    if (document.getElementById(STYLE_ID)) return;
    const link = document.createElement('link');
    link.id = STYLE_ID;
    link.rel = 'stylesheet';
    link.href = `${moduleBase}/join-overlay.css?v=${VERSION}`;
    document.head.appendChild(link);
  }

  function getRecentGames() {
    try {
      const parsed = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
      if (!Array.isArray(parsed)) return [];
      return parsed
        .map((item) => {
          if (!item) return null;
          const code = cleanCode(item.code || item.pin || '');
          const route = routeFromCode(code);
          if (!route.valid) return null;
          return { code: route.code, type: route.type, joinedAt: item.joinedAt || 0 };
        })
        .filter(Boolean)
        .slice(0, 3);
    } catch {
      return [];
    }
  }

  function rememberGame(route) {
    if (!route?.valid || !route.code) return;
    try {
      const current = getRecentGames().filter((item) => item.code !== route.code);
      current.unshift({ code: route.code, type: route.type, joinedAt: Date.now() });
      localStorage.setItem(RECENT_KEY, JSON.stringify(current.slice(0, 3)));
    } catch { /* storage may be blocked */ }
  }

  class JoinOverlay {
    constructor() {
      this.root = null;
      this.sheet = null;
      this.input = null;
      this.submitButton = null;
      this.error = null;
      this.lastFocus = null;
      this.options = {};
      this.inerted = [];
      this.opened = false;
      this.boundKeydown = this.onKeydown.bind(this);
      this.boundDocumentClick = this.onDocumentClick.bind(this);
      ensureStyles();
      document.addEventListener('click', this.boundDocumentClick);
    }

    build() {
      if (this.root) return;
      const root = document.createElement('div');
      root.id = ROOT_ID;
      root.className = 'qmf-join';
      root.hidden = true;
      root.innerHTML = `
        <div class="qmf-join__backdrop" data-qmf-join-close aria-hidden="true"></div>
        <section class="qmf-join__sheet" role="dialog" aria-modal="true" aria-labelledby="qmf-join-title" aria-describedby="qmf-join-subtitle">
          <div class="qmf-join__ambient" aria-hidden="true">
            <span class="qmf-join__orb qmf-join__orb--one"></span>
            <span class="qmf-join__orb qmf-join__orb--two"></span>
            <span class="qmf-join__orb qmf-join__orb--three"></span>
            <span class="qmf-join__spark qmf-join__spark--one">✦</span>
            <span class="qmf-join__spark qmf-join__spark--two">◆</span>
            <span class="qmf-join__spark qmf-join__spark--three">●</span>
          </div>
          <div class="qmf-join__content">
            <header class="qmf-join__head">
              <div class="qmf-join__title-wrap">
                <span class="qmf-join__game-icon" aria-hidden="true">🎮</span>
                <div>
                  <h2 id="qmf-join-title" class="qmf-join__title">Join Quiz</h2>
                  <p id="qmf-join-subtitle" class="qmf-join__subtitle">Enter a Game PIN or code (S / Q / H / PK).</p>
                </div>
              </div>
              <button type="button" class="qmf-join__close" data-qmf-join-close aria-label="Close Join Quiz">
                <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><path d="m5 5 10 10M15 5 5 15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>
              </button>
            </header>

            <form class="qmf-join__form" novalidate>
              <label class="qmf-join__label" for="qmf-join-pin">Game code</label>
              <div class="qmf-join__pin-wrap">
                <span class="qmf-join__pin-glow" aria-hidden="true"></span>
                <input id="qmf-join-pin" class="qmf-join__pin" type="text"
                  inputmode="text" maxlength="24"
                  autocomplete="one-time-code" enterkeyhint="go" autocapitalize="characters" spellcheck="false"
                  placeholder="123 456 · S… · Q… · H… · PK…" aria-describedby="qmf-join-help qmf-join-error">
              </div>
              <p id="qmf-join-help" class="qmf-join__help">PIN → Live · S → Slide · Q → Play · H → Homework · PK → Pikahans</p>
              <p id="qmf-join-error" class="qmf-join__error" role="alert" aria-live="polite"></p>
              <button type="submit" class="qmf-join__submit" disabled>
                <span>Join Game</span>
                <svg width="22" height="22" viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10h11M11 6l4 4-4 4" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </button>
            </form>

            <div class="qmf-join__secondary" aria-label="Other ways to join">
              <button type="button" class="qmf-join__secondary-btn" data-qmf-scan>
                <span class="qmf-join__secondary-ico" aria-hidden="true">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M4 8V5a1 1 0 0 1 1-1h3M20 8V5a1 1 0 0 0-1-1h-3M4 16v3a1 1 0 0 0 1 1h3M20 16v3a1 1 0 0 1-1 1h-3M8 8h3v3H8zm5 0h3v3h-3zm-5 5h3v3H8zm5 2h1v1h-1zm2-2h1v1h-1zm0 2h1v1h-1zm2-2h1v3h-1z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </span>
                <span>Scan QR Code</span>
              </button>
              <button type="button" class="qmf-join__secondary-btn" data-qmf-paste>
                <span class="qmf-join__secondary-ico" aria-hidden="true">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </span>
                <span>Paste Invitation Link</span>
              </button>
              <input class="qmf-join__qr-input" type="file" accept="image/*" capture="environment" tabindex="-1" aria-hidden="true">
            </div>

            <section class="qmf-join__recent" hidden aria-labelledby="qmf-join-recent-title">
              <h3 id="qmf-join-recent-title">Recent Games</h3>
              <div class="qmf-join__recent-list"></div>
            </section>
          </div>
        </section>
      `;
      document.body.appendChild(root);
      this.root = root;
      this.sheet = root.querySelector('.qmf-join__sheet');
      this.input = root.querySelector('.qmf-join__pin');
      this.submitButton = root.querySelector('.qmf-join__submit');
      this.error = root.querySelector('.qmf-join__error');

      root.querySelectorAll('[data-qmf-join-close]').forEach((button) => {
        button.addEventListener('click', () => this.close('dismiss'));
      });
      root.querySelector('.qmf-join__form').addEventListener('submit', (event) => {
        event.preventDefault();
        this.submit();
      });
      this.input.addEventListener('input', () => this.onInput());
      this.input.addEventListener('paste', (event) => this.onPaste(event));
      this.input.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter') return;
        event.preventDefault();
        this.submit();
      });
      root.querySelector('[data-qmf-paste]').addEventListener('click', () => this.pasteInvite());
      root.querySelector('[data-qmf-scan]').addEventListener('click', () => this.startQrScan());
      root.querySelector('.qmf-join__qr-input').addEventListener('change', (event) => this.scanQrFile(event));
    }

    renderRecent() {
      const section = this.root.querySelector('.qmf-join__recent');
      const list = this.root.querySelector('.qmf-join__recent-list');
      const games = getRecentGames();
      list.replaceChildren();
      section.hidden = games.length === 0;
      games.forEach(({ code, type }) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'qmf-join__recent-game';
        button.innerHTML = `<span class="qmf-join__secondary-ico" aria-hidden="true">▶</span><strong>${formatDisplay(code, type)}</strong>`;
        button.addEventListener('click', () => {
          this.input.value = formatDisplay(code, type);
          this.onInput();
          this.input.focus();
        });
        list.appendChild(button);
      });
    }

    open(options = {}) {
      this.build();
      const wasOpen = this.opened || !this.root.hidden;
      this.options = options || {};
      if (!wasOpen) {
        this.lastFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      }
      this.renderRecent();
      this.setValue(options.value || '');
      this.clearError();
      this.root.hidden = false;
      requestAnimationFrame(() => {
        this.root.classList.add('is-open');
        this.opened = true;
      });
      document.body.classList.add('qmf-join-open');
      if (!wasOpen) this.setBackgroundInert(true);
      document.removeEventListener('keydown', this.boundKeydown, true);
      document.addEventListener('keydown', this.boundKeydown, true);
      window.setTimeout(() => {
        this.input?.focus({ preventScroll: true });
        this.input?.setSelectionRange(this.input.value.length, this.input.value.length);
      }, 40);
      dispatch('open', { source: options.source || 'api' });
      return this;
    }

    close(reason = 'close') {
      if (!this.root || this.root.hidden) return;
      this.opened = false;
      this.root.classList.remove('is-open');
      document.removeEventListener('keydown', this.boundKeydown, true);
      document.body.classList.remove('qmf-join-open');
      this.setBackgroundInert(false);
      window.setTimeout(() => {
        if (!this.opened) this.root.hidden = true;
      }, 330);
      this.lastFocus?.focus?.({ preventScroll: true });
      dispatch('close', { reason });
    }

    setValue(value) {
      const parsed = normalizeInput(value);
      this.input.value = formatDisplay(parsed.code, parsed.type);
      this.updateState(parsed);
    }

    onInput() {
      const raw = this.input.value;
      if (/^[\d\s]*$/.test(raw)) {
        this.input.value = formatPin(raw);
      } else {
        this.input.value = String(raw).toUpperCase().replace(/[^A-Z0-9\s_-]/g, '');
      }
      this.updateState(normalizeInput(this.input.value));
      this.clearError();
    }

    onPaste(event) {
      const pasted = event.clipboardData?.getData('text') || '';
      const parsed = normalizeInput(pasted);
      if (!parsed.valid && parsed.type !== 'pin' && parsed.type !== 'invalid') return;
      event.preventDefault();
      this.input.value = formatDisplay(parsed.code || cleanCode(pasted), parsed.type);
      this.updateState(normalizeInput(this.input.value));
      if (!parsed.valid) this.showError('Enter a valid PIN or code (S / Q / H / PK).');
    }

    updateState(parsed) {
      const valid = !!parsed?.valid;
      this.submitButton.disabled = !valid;
      this.submitButton.classList.toggle('is-ready', valid);
      this.input.setAttribute('aria-invalid', valid || !this.input.value ? 'false' : 'true');
      this.root.classList.toggle('has-valid-pin', valid);
    }

    submit() {
      const parsed = normalizeInput(this.input.value);
      if (!parsed.valid || !parsed.url) {
        this.showError('Enter a valid PIN or code (S / Q / H / PK).');
        this.input.focus();
        this.input.classList.remove('is-shaking');
        void this.input.offsetWidth;
        this.input.classList.add('is-shaking');
        return;
      }
      rememberGame(parsed);
      dispatch('submit', {
        pin: parsed.pin,
        code: parsed.code,
        type: parsed.type,
        url: parsed.url,
        source: this.options.source || 'api',
      });
      if (typeof this.options.onJoin === 'function') {
        this.options.onJoin({
          pin: parsed.pin,
          code: parsed.code,
          type: parsed.type,
          url: parsed.url,
        });
        return;
      }
      this.root.classList.add('is-launching');
      window.setTimeout(() => window.location.assign(parsed.url), 160);
    }

    async pasteInvite() {
      try {
        const text = await navigator.clipboard.readText();
        const parsed = normalizeInput(text);
        if (!parsed.valid) throw new Error('invalid');
        this.input.value = formatDisplay(parsed.code, parsed.type);
        this.updateState(parsed);
        this.clearError();
        this.input.focus();
      } catch {
        this.showError('Copy a valid play.quizzman.com invitation link, then try again.');
        this.input.focus();
      }
    }

    startQrScan() {
      const detail = {
        openFilePicker: () => this.root.querySelector('.qmf-join__qr-input')?.click(),
      };
      dispatch('scan', detail);
      detail.openFilePicker();
    }

    async scanQrFile(event) {
      const file = event.target.files?.[0];
      event.target.value = '';
      if (!file) return;
      if (!('BarcodeDetector' in window)) {
        this.showError('QR scanning is not supported here. Paste the invitation link instead.');
        return;
      }
      try {
        const bitmap = await createImageBitmap(file);
        const detector = new BarcodeDetector({ formats: ['qr_code'] });
        const codes = await detector.detect(bitmap);
        bitmap.close?.();
        const parsed = normalizeInput(codes[0]?.rawValue || '');
        if (!parsed.valid) throw new Error('invalid');
        this.input.value = formatDisplay(parsed.code, parsed.type);
        this.updateState(parsed);
        this.clearError();
        this.input.focus();
      } catch {
        this.showError('No valid Quizzman invitation was found in that QR code.');
      }
    }

    showError(message) {
      this.error.textContent = message;
      this.root.classList.add('has-error');
      dispatch('error', { message });
    }

    clearError() {
      if (!this.error) return;
      this.error.textContent = '';
      this.root?.classList.remove('has-error');
    }

    onKeydown(event) {
      if (!this.opened) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        this.close('escape');
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = [...this.sheet.querySelectorAll(
        'button:not([disabled]), input:not([disabled]):not([tabindex="-1"]), [href], [tabindex]:not([tabindex="-1"])',
      )].filter((el) => !el.hidden && el.getClientRects().length);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    setBackgroundInert(inert) {
      if (inert) {
        this.inerted = [...document.body.children]
          .filter((node) => node !== this.root && node instanceof HTMLElement)
          .map((node) => ({
            node,
            inert: node.inert,
            ariaHidden: node.getAttribute('aria-hidden'),
          }));
        this.inerted.forEach(({ node }) => {
          node.inert = true;
          node.setAttribute('aria-hidden', 'true');
        });
        return;
      }
      this.inerted.forEach(({ node, inert: wasInert, ariaHidden }) => {
        node.inert = wasInert;
        if (ariaHidden == null) node.removeAttribute('aria-hidden');
        else node.setAttribute('aria-hidden', ariaHidden);
      });
      this.inerted = [];
    }

    onDocumentClick(event) {
      const trigger = event.target.closest?.('[data-qmf-join]');
      if (!trigger) return;
      event.preventDefault();
      this.open({
        value: trigger.dataset.qmfJoinValue || '',
        source: trigger.dataset.qmfJoinSource || 'declarative',
      });
    }
  }

  let singleton;
  function getOverlay() {
    if (!singleton) singleton = new JoinOverlay();
    return singleton;
  }

  const api = {
    version: VERSION,
    open: (options) => getOverlay().open(options),
    close: (reason) => getOverlay().close(reason),
    normalizeInput,
    resolveRoute: normalizeInput,
    formatPin,
    toJoinUrl,
    get instance() { return getOverlay(); },
  };

  window.QMFJoinOverlay = api;
  window.openQMFJoin = api.open;
  if (window.QMF) window.QMF.joinOverlay = api;
  getOverlay();
})();
