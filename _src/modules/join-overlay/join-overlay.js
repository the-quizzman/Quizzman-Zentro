/**
 * QMF Join Overlay — reusable Live Quiz entry experience.
 *
 * Public API:
 *   QMFJoinOverlay.open({ value?, source?, onJoin? })
 *   QMFJoinOverlay.close(reason?)
 *   QMFJoinOverlay.normalizeInput(value)
 *   QMFJoinOverlay.toJoinUrl(pin)
 *
 * Declarative trigger:
 *   <button data-qmf-join data-qmf-join-value="123456">Join Quiz</button>
 */
(function() {
  'use strict';

  const VERSION = '1.0.4';
  const PIN_LENGTH = 6;
  const PLAY_ORIGIN = 'https://play.quizzman.com';
  const ALLOWED_INVITE_HOSTS = new Set([
    'play.quizzman.com',
    'www.play.quizzman.com',
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

  function digits(value) {
    return String(value || '').replace(/\D/g, '').slice(0, PIN_LENGTH);
  }

  function formatPin(value) {
    const pin = digits(value);
    return pin.length > 3 ? `${pin.slice(0, 3)} ${pin.slice(3)}` : pin;
  }

  function pinFromAllowedUrl(raw) {
    let url;
    try {
      url = new URL(String(raw || '').trim());
    } catch {
      return '';
    }
    if (url.protocol !== 'https:' || !ALLOWED_INVITE_HOSTS.has(url.hostname.toLowerCase())) {
      return '';
    }
    const liveMatch = url.pathname.match(/\/live\/(\d{6})(?:\/|$)/i);
    if (liveMatch) return liveMatch[1];
    for (const key of ['pin', 'code', 'gamePin']) {
      const candidate = digits(url.searchParams.get(key));
      if (candidate.length === PIN_LENGTH) return candidate;
    }
    return '';
  }

  function normalizeInput(value) {
    const raw = String(value || '').trim();
    if (!raw) return { valid: false, pin: '', type: 'empty' };
    if (/^https?:\/\//i.test(raw)) {
      const pin = pinFromAllowedUrl(raw);
      return {
        valid: pin.length === PIN_LENGTH,
        pin,
        type: pin ? 'link' : 'invalid-link',
      };
    }
    const pin = digits(raw);
    return {
      valid: pin.length === PIN_LENGTH,
      pin,
      type: 'pin',
    };
  }

  function toJoinUrl(pin) {
    const normalized = digits(pin);
    if (normalized.length !== PIN_LENGTH) return '';
    return `${PLAY_ORIGIN}/live/${normalized}`;
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
        .filter((item) => item && /^\d{6}$/.test(String(item.pin || '')))
        .slice(0, 3);
    } catch {
      return [];
    }
  }

  function rememberGame(pin) {
    try {
      const current = getRecentGames().filter((item) => item.pin !== pin);
      current.unshift({ pin, joinedAt: Date.now() });
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
                  <h2 id="qmf-join-title" class="qmf-join__title">Join Live Quiz</h2>
                  <p id="qmf-join-subtitle" class="qmf-join__subtitle">Enter a Game PIN or join using an invitation link.</p>
                </div>
              </div>
              <button type="button" class="qmf-join__close" data-qmf-join-close aria-label="Close Join Quiz">
                <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><path d="m5 5 10 10M15 5 5 15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>
              </button>
            </header>

            <form class="qmf-join__form" novalidate>
              <label class="qmf-join__label" for="qmf-join-pin">Game PIN</label>
              <div class="qmf-join__pin-wrap">
                <span class="qmf-join__pin-glow" aria-hidden="true"></span>
                <input id="qmf-join-pin" class="qmf-join__pin" type="text"
                  inputmode="numeric" pattern="[0-9 ]*" maxlength="7"
                  autocomplete="one-time-code" enterkeyhint="go"
                  placeholder="123 456" aria-describedby="qmf-join-help qmf-join-error">
              </div>
              <p id="qmf-join-help" class="qmf-join__help">6-digit PIN</p>
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
      games.forEach(({ pin }) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'qmf-join__recent-game';
        button.innerHTML = `<span class="qmf-join__secondary-ico" aria-hidden="true">▶</span><strong>${formatPin(pin)}</strong>`;
        button.addEventListener('click', () => {
          this.input.value = formatPin(pin);
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
      this.input.value = formatPin(parsed.pin);
      this.updateState(parsed);
    }

    onInput() {
      const pin = digits(this.input.value);
      this.input.value = formatPin(pin);
      this.updateState(normalizeInput(pin));
      this.clearError();
    }

    onPaste(event) {
      const pasted = event.clipboardData?.getData('text') || '';
      const parsed = normalizeInput(pasted);
      if (!parsed.valid && parsed.type !== 'pin') return;
      event.preventDefault();
      this.input.value = formatPin(parsed.pin);
      this.updateState(parsed);
      if (!parsed.valid) this.showError('Enter a valid 6-digit Game PIN.');
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
      if (!parsed.valid) {
        this.showError('Enter a valid 6-digit Game PIN.');
        this.input.focus();
        this.input.classList.remove('is-shaking');
        void this.input.offsetWidth;
        this.input.classList.add('is-shaking');
        return;
      }
      const url = toJoinUrl(parsed.pin);
      rememberGame(parsed.pin);
      dispatch('submit', {
        pin: parsed.pin,
        url,
        source: this.options.source || 'api',
      });
      if (typeof this.options.onJoin === 'function') {
        this.options.onJoin({ pin: parsed.pin, url });
        return;
      }
      this.root.classList.add('is-launching');
      window.setTimeout(() => window.location.assign(url), 160);
    }

    async pasteInvite() {
      try {
        const text = await navigator.clipboard.readText();
        const parsed = normalizeInput(text);
        if (!parsed.valid) throw new Error('invalid');
        this.input.value = formatPin(parsed.pin);
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
        this.input.value = formatPin(parsed.pin);
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
    formatPin,
    toJoinUrl,
    get instance() { return getOverlay(); },
  };

  window.QMFJoinOverlay = api;
  window.openQMFJoin = api.open;
  if (window.QMF) window.QMF.joinOverlay = api;
  getOverlay();
})();
