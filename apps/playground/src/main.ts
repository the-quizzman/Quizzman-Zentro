/**
 * QMF Playground — Interactive Demo
 */

import { QMF, getGlobalEventBus } from '@qmf/core';
import { colors, spacing } from '@qmf/tokens';
import { createLogger } from '@qmf/utils';
import { createButton, Modal, toast, createBadge, updateBadge } from '@qmf/ui';
import { createHeaderPlugin } from '@qmf/header';
import { createFooterPlugin } from '@qmf/footer';
import { showLoadingScreen, createLoadingScreenPlugin } from '@qmf/loading-screen';

// Import styles
import '@qmf/tokens/tokens.css';
import '@qmf/tokens/dark.css';
import '@qmf/ui/style.css';
import '@qmf/header/style.css';
import '@qmf/footer/style.css';
import '@qmf/loading-screen/style.css';
import './main.css';

const logger = createLogger('Playground', 'debug');

// ─── Bootstrap QMF ─────────────────────────────────────────

async function bootstrap() {
  const qmf = QMF.getInstance();

  qmf.use(createHeaderPlugin({
    brandName: 'QMF Playground',
    showChat: true,
    showNotification: true,
    showHamburger: true,
    mainLogoUrl: '/assets/logo/quizzman-logo.png',
  }));

  qmf.use(createFooterPlugin({
    copyrightHolder: 'QMF Framework',
    companyInfo: 'Quizzman Modular Framework — Playground',
  }));

  await qmf.init({
    appId: 'playground',
    env: 'development',
    debug: true,
  });

  logger.info('QMF initialized');
}

// ─── Demo: Buttons ──────────────────────────────────────────

function setupButtonDemo() {
  const container = document.getElementById('demo-buttons');
  if (!container) return;

  const variants = ['primary', 'secondary', 'success', 'danger', 'warning', 'ghost'] as const;
  for (const variant of variants) {
    const btn = createButton({
      label: variant,
      variant,
      size: 'md',
      onClick: () => logger.info(`Clicked: ${variant}`),
    });
    container.appendChild(btn);
  }

  // Loading button
  const loadingBtn = createButton({
    label: 'Loading...',
    variant: 'primary',
    loading: true,
  });
  container.appendChild(loadingBtn);
}

// ─── Demo: Toast ────────────────────────────────────────────

function setupToastDemo() {
  const container = document.getElementById('demo-toasts');
  if (!container) return;

  const variants = [
    { label: 'Success', variant: 'success' as const, message: 'Thao tác thành công!' },
    { label: 'Error', variant: 'error' as const, message: 'Đã xảy ra lỗi!' },
    { label: 'Warning', variant: 'warning' as const, message: 'Cảnh báo: dữ liệu chưa lưu' },
    { label: 'Info', variant: 'info' as const, message: 'Thông tin: phiên bản mới sẵn sàng' },
  ];

  for (const { label, variant, message } of variants) {
    const btn = createButton({
      label: `Toast ${label}`,
      variant: variant === 'error' ? 'danger' : variant === 'info' ? 'primary' : variant,
      size: 'sm',
      onClick: () => toast({ message, type: variant, position: 'top-right', duration: 3000 }),
    });
    container.appendChild(btn);
  }
}

// ─── Demo: Modal ────────────────────────────────────────────

function setupModalDemo() {
  const container = document.getElementById('demo-modal');
  if (!container) return;

  const btn = createButton({
    label: 'Open Modal',
    variant: 'primary',
    onClick: () => {
      const modal = new Modal({
        title: 'QMF Modal Demo',
        size: 'md',
        content: `
          <p>This is a QMF modal with focus trap and keyboard support.</p>
          <p>Press <kbd>Escape</kbd> to close, or click the overlay.</p>
        `,
        footer: true,
        onClose: () => logger.info('Modal closed'),
      });
      modal.open();
    },
  });
  container.appendChild(btn);
}

// ─── Demo: Badges ───────────────────────────────────────────

function setupBadgeDemo() {
  const container = document.getElementById('demo-badges');
  if (!container) return;

  const variants = ['primary', 'danger', 'success', 'warning'] as const;
  for (const variant of variants) {
    const badge = createBadge({ count: Math.floor(Math.random() * 99) + 1, variant });
    badge.style.margin = '0 8px';
    container.appendChild(badge);
  }

  // Dot badge
  const dot = createBadge({ dot: true, variant: 'danger' });
  dot.style.margin = '0 8px';
  container.appendChild(dot);
}

// ─── Demo: Tokens ───────────────────────────────────────────

function setupTokenDemo() {
  const container = document.getElementById('demo-tokens');
  if (!container) return;

  const swatches = [
    { name: 'Primary', var: '--qmf-color-primary' },
    { name: 'Secondary', var: '--qmf-color-secondary' },
    { name: 'Success', var: '--qmf-color-success' },
    { name: 'Warning', var: '--qmf-color-warning' },
    { name: 'Danger', var: '--qmf-color-danger' },
    { name: 'Info', var: '--qmf-color-info' },
    { name: 'Surface', var: '--qmf-color-surface' },
    { name: 'Border', var: '--qmf-color-border' },
  ];

  for (const { name, var: cssVar } of swatches) {
    const swatch = document.createElement('div');
    swatch.className = 'token-swatch';
    swatch.innerHTML = `
      <div class="token-swatch__color" style="background: var(${cssVar})"></div>
      <div class="token-swatch__label">${name}</div>
      <code class="token-swatch__var">${cssVar}</code>
    `;
    container.appendChild(swatch);
  }
}

// ─── Demo: Theme Toggle ────────────────────────────────────

function setupThemeDemo() {
  const container = document.getElementById('demo-theme');
  if (!container) return;

  const btn = createButton({
    label: 'Toggle Dark/Light',
    variant: 'secondary',
    onClick: () => {
      const html = document.documentElement;
      const current = html.getAttribute('data-theme');
      html.setAttribute('data-theme', current === 'dark' ? 'light' : 'dark');
    },
  });
  container.appendChild(btn);
}

// ─── Demo: Loading Screen ──────────────────────────────────

function setupLoadingDemo() {
  const container = document.getElementById('demo-loading');
  if (!container) return;

  const btn = createButton({
    label: 'Show Loading Screen',
    variant: 'primary',
    onClick: async () => {
      const ls = showLoadingScreen({
        brandName: 'Quizzman',
        showParticles: true,
        minDisplayTime: 3000,
      });

      // Simulate progress
      let p = 0;
      const interval = setInterval(() => {
        p += Math.random() * 15 + 5;
        ls.setProgress(p);
        if (p >= 100) {
          clearInterval(interval);
          ls.hide();
        }
      }, 600);
    },
  });
  container.appendChild(btn);
}

// ─── Init ───────────────────────────────────────────────────

async function main() {
  await bootstrap();

  setupButtonDemo();
  setupToastDemo();
  setupModalDemo();
  setupBadgeDemo();
  setupTokenDemo();
  setupThemeDemo();
  setupLoadingDemo();

  logger.info('Playground ready');
}

main().catch(console.error);
