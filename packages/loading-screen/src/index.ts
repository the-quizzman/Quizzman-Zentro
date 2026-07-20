/**
 * @qmf/loading-screen - Fullscreen Loading Splash Screen
 * 
 * Features:
 * - Dark/Light theme auto-detection 
 * - Animated logo with particle effects
 * - Progress bar with stages
 * - Smooth fade-out transition
 * - Skeleton placeholders
 */

import { z, validateConfig, type QMFPlugin, getGlobalEventBus } from '@qmf/core';
import { createElement, createLogger, createEventEmitter } from '@qmf/utils';

// ─── Config Schema ──────────────────────────────────────────

export const LoadingScreenPaletteSchema = z.object({
  primary: z.string().optional(),
  secondary: z.string().optional(),
  accent: z.string().optional(),
  background: z.string().optional(),
  backgroundDark: z.string().optional(),
  brand: z.string().optional(),
  text: z.string().optional(),
  muted: z.string().optional(),
  glow: z.string().optional(),
}).optional();

export const LoadingScreenConfigSchema = z.object({
  // Branding
  logoUrl: z.string().optional(),
  logoDarkUrl: z.string().optional(),
  brandName: z.string().default('Quizzman'),
  tagLine: z.string().default('Nền tảng học & dạy thông minh'),

  // Theme
  theme: z.enum(['auto', 'dark', 'light']).default('auto'),

  // Per-app palette → CSS variables on root
  palette: LoadingScreenPaletteSchema,

  // Particles
  showParticles: z.boolean().default(true),
  particleCount: z.number().default(30),

  // Progress
  showProgress: z.boolean().default(true),
  stages: z.array(z.string()).default([
    'Khởi tạo hệ thống...',
    'Tải cấu hình...',
    'Kết nối dịch vụ...',
    'Chuẩn bị giao diện...',
    'Sẵn sàng!',
  ]),

  // Timing
  minDisplayTime: z.number().default(1500),
  fadeOutDuration: z.number().default(500),

  // Skeleton placeholder
  showSkeleton: z.boolean().default(false),

  debug: z.boolean().default(false),
});

export type LoadingScreenConfig = z.infer<typeof LoadingScreenConfigSchema>;

// ─── Loading Screen Class ──────────────────────────────────

export class QMFLoadingScreen {
  private config: LoadingScreenConfig;
  private logger;
  private emitter = createEventEmitter();

  private screenEl: HTMLElement | null = null;
  private progressBarEl: HTMLElement | null = null;
  private stageTextEl: HTMLElement | null = null;
  private particlesEl: HTMLElement | null = null;

  private progress = 0;
  private currentStage = 0;
  private startTime = 0;
  private isVisible = false;
  private animFrameId: number | null = null;

  constructor(config: Partial<LoadingScreenConfig> = {}) {
    this.config = validateConfig(LoadingScreenConfigSchema, config, 'LoadingScreen');
    this.logger = createLogger('LoadingScreen', this.config.debug ? 'debug' : 'warn');
  }

  // ─── Public API ─────────────────────────────────────────

  /** Show the loading screen */
  show(): void {
    if (this.isVisible) return;

    this.startTime = Date.now();
    this.isVisible = true;
    this.progress = 0;
    this.currentStage = 0;

    this.render();
    this.startParticleAnimation();

    this.logger.debug('Loading screen shown');
    this.emitter.emit('show');
  }

  /** Update progress (0–100) */
  setProgress(value: number): void {
    this.progress = Math.min(100, Math.max(0, value));

    // Determine stage by progress
    const stageIndex = Math.min(
      Math.floor(this.progress / (100 / this.config.stages.length)),
      this.config.stages.length - 1,
    );

    if (stageIndex !== this.currentStage) {
      this.currentStage = stageIndex;
      if (this.stageTextEl) {
        this.stageTextEl.textContent = this.config.stages[stageIndex] || '';
      }
    }

    if (this.progressBarEl) {
      this.progressBarEl.style.width = `${this.progress}%`;
    }

    this.emitter.emit('progress', this.progress);
  }

  /** Increment progress by a certain amount */
  incrementProgress(amount: number): void {
    this.setProgress(this.progress + amount);
  }

  /** Set progress to a specific stage by index */
  setStage(index: number): void {
    const stageCount = this.config.stages.length;
    const progressPerStage = 100 / stageCount;
    this.setProgress(progressPerStage * (index + 1));
  }

  /** Hide the loading screen with fade-out */
  async hide(): Promise<void> {
    if (!this.isVisible) return;

    // Ensure min display time
    const elapsed = Date.now() - this.startTime;
    const remaining = this.config.minDisplayTime - elapsed;
    if (remaining > 0) {
      await new Promise(resolve => setTimeout(resolve, remaining));
    }

    // Set progress to 100% before fading
    this.setProgress(100);

    // Fade out
    if (this.screenEl) {
      this.screenEl.classList.add('qmf-loading--hiding');
      await new Promise(resolve => setTimeout(resolve, this.config.fadeOutDuration));
    }

    this.logger.debug('Loading screen hidden');
    this.emitter.emit('hide');
    this.destroy();
  }

  /** Immediately remove without animation */
  destroy(): void {
    this.isVisible = false;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    this.screenEl?.remove();
    this.screenEl = null;
    this.emitter.clear();
  }

  /** Subscribe to events */
  on(event: string, cb: (data: unknown) => void): () => void {
    return this.emitter.on(event, cb);
  }

  // ─── Private Render ─────────────────────────────────────

  private resolveTheme(): 'dark' | 'light' {
    if (this.config.theme !== 'auto') return this.config.theme;
    if (typeof window === 'undefined') return 'light';
    // Check document attribute first
    const docTheme = document.documentElement.getAttribute('data-theme');
    if (docTheme === 'dark') return 'dark';
    if (docTheme === 'light') return 'light';
    // Fallback to prefers-color-scheme
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  private applyPalette(el: HTMLElement, theme: 'dark' | 'light'): void {
    const p = this.config.palette;
    if (!p) return;
    if (p.primary) el.style.setProperty('--qmf-color-primary', p.primary);
    if (p.secondary) el.style.setProperty('--qmf-color-secondary', p.secondary);
    if (p.accent) el.style.setProperty('--qmf-loading-accent', p.accent);
    const bg = theme === 'dark' ? (p.backgroundDark || p.background) : p.background;
    if (bg) el.style.setProperty('--qmf-loading-bg', bg);
    if (p.brand) el.style.setProperty('--qmf-loading-brand', p.brand);
    if (p.text || p.muted) el.style.setProperty('--qmf-loading-text', p.text || p.muted || '');
    if (p.glow) el.style.setProperty('--qmf-loading-glow', p.glow);
  }

  private render(): void {
    const theme = this.resolveTheme();

    this.screenEl = createElement('div', {
      className: `qmf-loading qmf-loading--${theme}`,
      'aria-label': 'Loading...',
      role: 'progressbar',
      'aria-valuenow': '0',
      'aria-valuemin': '0',
      'aria-valuemax': '100',
    });
    this.applyPalette(this.screenEl, theme);

    // Particles canvas
    if (this.config.showParticles) {
      this.particlesEl = createElement('div', { className: 'qmf-loading__particles' });
      this.createParticles();
      this.screenEl.appendChild(this.particlesEl);
    }

    // Center content
    const center = createElement('div', { className: 'qmf-loading__center' });

    // Logo
    const logoWrap = createElement('div', { className: 'qmf-loading__logo-wrap' });
    const resolvedLogoUrl = theme === 'dark'
      ? (this.config.logoDarkUrl || this.config.logoUrl || 'https://ui.quizzman.com/qmf/assets/logo/quizzman-logo-dark-116.webp')
      : (this.config.logoUrl || 'https://ui.quizzman.com/qmf/assets/logo/quizzman-logo-loading-116.webp');
    const logo = createElement('img', {
      className: 'qmf-loading__logo',
      src: resolvedLogoUrl,
      alt: this.config.brandName,
      width: '80',
      height: '80',
    });
    logoWrap.appendChild(logo);
    center.appendChild(logoWrap);

    // Brand name
    const brandName = createElement('div', { className: 'qmf-loading__brand' }, [this.config.brandName]);
    center.appendChild(brandName);

    // Tagline
    if (this.config.tagLine) {
      const tagline = createElement('div', { className: 'qmf-loading__tagline' }, [this.config.tagLine]);
      center.appendChild(tagline);
    }

    // Progress
    if (this.config.showProgress) {
      const progressWrap = createElement('div', { className: 'qmf-loading__progress' });
      this.progressBarEl = createElement('div', { className: 'qmf-loading__progress-bar' });
      progressWrap.appendChild(this.progressBarEl);
      center.appendChild(progressWrap);

      this.stageTextEl = createElement('div', { className: 'qmf-loading__stage' }, [this.config.stages[0] || '']);
      center.appendChild(this.stageTextEl);
    }

    this.screenEl.appendChild(center);

    // Mount to body — handle case where script runs in <head> before body exists
    const mount = () => document.body.appendChild(this.screenEl!);
    if (document.body) {
      mount();
    } else {
      document.addEventListener('DOMContentLoaded', mount);
    }
  }

  private createParticles(): void {
    if (!this.particlesEl) return;

    for (let i = 0; i < this.config.particleCount; i++) {
      const particle = createElement('div', { className: 'qmf-loading__particle' });
      const size = Math.random() * 4 + 2;
      const x = Math.random() * 100;
      const y = Math.random() * 100;
      const duration = Math.random() * 8 + 4;
      const delay = Math.random() * 4;

      particle.style.cssText = `
        width: ${size}px;
        height: ${size}px;
        left: ${x}%;
        top: ${y}%;
        animation-duration: ${duration}s;
        animation-delay: ${delay}s;
      `;
      this.particlesEl.appendChild(particle);
    }
  }

  private startParticleAnimation(): void {
    // Subtle float animation powered by transform keyframes in CSS
    // No JS frame loop needed; purely CSS animations.
  }
}

// ─── Convenience ──────────────────────────────────────────

/**
 * Shows a loading screen and returns a controller.
 */
export function showLoadingScreen(config?: Partial<LoadingScreenConfig>): QMFLoadingScreen {
  const screen = new QMFLoadingScreen(config);
  screen.show();
  return screen;
}

/** QMF Plugin factory */
export function createLoadingScreenPlugin(config?: Partial<LoadingScreenConfig>): QMFPlugin {
  let instance: QMFLoadingScreen | null = null;
  return {
    name: 'loading-screen',
    version: '3.0.2',
    hooks: {
      onBeforeInit: () => {
        instance = new QMFLoadingScreen(config);
        instance.show();
      },
      onInit: () => {
        instance?.setStage(1);
      },
      onMount: () => {
        instance?.setStage(2);
      },
      onConnect: () => {
        instance?.setStage(3);
      },
      onReady: () => {
        instance?.hide();
      },
      onDestroy: () => {
        instance?.destroy();
      },
    },
    setup: (ctx) => {
      ctx.expose('instance', instance);
      ctx.expose('setProgress', (v: number) => instance?.setProgress(v));
      ctx.expose('setStage', (i: number) => instance?.setStage(i));
      ctx.expose('hide', () => instance?.hide());
    },
  };
}
