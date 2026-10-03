/**
 * @qmf/footer - Global Footer Module
 * Sections: Copyright · Navigation Links · Social Links · DMCA Badge
 */

import { z, validateConfig, type QMFPlugin, getGlobalEventBus } from '@qmf/core';
import { createElement, mountComponent, createLogger } from '@qmf/utils';

// ─── Config Schema ──────────────────────────────────────────

export const FooterConfigSchema = z.object({
  // Copyright
  copyrightHolder: z.string().default('CTCP PTN & GDQT QUIZZMAN'),
  copyrightStartYear: z.number().default(2022),

  // Links
  links: z.array(z.object({
    label: z.string(),
    href: z.string(),
    external: z.boolean().optional(),
  })).default([
    { label: 'Giới thiệu', href: 'https://quizzman.com/about' },
    { label: 'Liên hệ', href: 'https://quizzman.com/contact' },
    { label: 'Điều khoản', href: 'https://quizzman.com/terms' },
    { label: 'Bảo mật', href: 'https://quizzman.com/privacy' },
  ]),

  // Social links
  socials: z.array(z.object({
    icon: z.string(),
    label: z.string(),
    href: z.string(),
  })).default([
    { icon: 'fab fa-facebook', label: 'Facebook', href: 'https://www.facebook.com/quizzman.official' },
    { icon: 'fab fa-youtube', label: 'YouTube', href: 'https://www.youtube.com/@quizzman.official' },
    { icon: 'fab fa-tiktok', label: 'TikTok', href: 'https://www.tiktok.com/@quizzman.com' },
    { icon: 'fab fa-github', label: 'GitHub', href: 'https://github.com/the-quizzman' },
  ]),

  // DMCA
  showDmca: z.boolean().default(true),
  dmcaUrl: z.string().default('https://www.dmca.com/Protection/Status.aspx?ID=quizzman'),

  // Company info
  companyInfo: z.string().optional(),
  address: z.string().optional(),

  // Minimal mode (just copyright)
  minimal: z.boolean().default(false),

  debug: z.boolean().default(false),
});

export type FooterConfig = z.infer<typeof FooterConfigSchema>;

// ─── Footer Class ───────────────────────────────────────────

export class QMFFooter {
  private config: FooterConfig;
  private container: HTMLElement | null = null;
  private footerEl: HTMLElement | null = null;
  private logger;
  private cleanup: (() => void) | null = null;

  constructor(config: Partial<FooterConfig> = {}) {
    this.config = validateConfig(FooterConfigSchema, config, 'Footer');
    this.logger = createLogger('Footer', this.config.debug ? 'debug' : 'warn');
  }

  mount(container: string | HTMLElement): void {
    this.cleanup = mountComponent(container, (el) => {
      this.container = el;
      this.render();
      this.logger.debug('Footer mounted');
      return () => this.destroy();
    });
  }

  destroy(): void {
    if (this.cleanup) this.cleanup();
    if (this.footerEl) {
      this.footerEl.remove();
      this.footerEl = null;
    }
    this.container = null;
  }

  // ─── Private Render ─────────────────────────────────────

  private render(): void {
    if (!this.container) return;

    this.footerEl = createElement('footer', { className: 'qmf-footer' });
    const inner = createElement('div', { className: 'qmf-footer__inner' });

    if (this.config.minimal) {
      inner.appendChild(this.renderCopyright());
    } else {
      // Top row: Links + Social
      const topRow = createElement('div', { className: 'qmf-footer__top' });
      topRow.appendChild(this.renderLinks());
      topRow.appendChild(this.renderSocials());
      inner.appendChild(topRow);

      // Company info
      if (this.config.companyInfo || this.config.address) {
        inner.appendChild(this.renderCompanyInfo());
      }

      // Bottom row: Copyright + DMCA
      const bottomRow = createElement('div', { className: 'qmf-footer__bottom' });
      bottomRow.appendChild(this.renderCopyright());
      if (this.config.showDmca) bottomRow.appendChild(this.renderDmca());
      inner.appendChild(bottomRow);
    }

    this.footerEl.appendChild(inner);
    this.container.appendChild(this.footerEl);
  }

  private renderLinks(): HTMLElement {
    const nav = createElement('nav', { className: 'qmf-footer__nav', 'aria-label': 'Footer navigation' });
    for (const link of this.config.links) {
      const a = createElement('a', {
        className: 'qmf-footer__link',
        href: link.href,
        ...(link.external ? { target: '_blank', rel: 'noopener noreferrer' } : {}),
      }, [link.label]);
      nav.appendChild(a);
    }
    return nav;
  }

  private renderSocials(): HTMLElement {
    const socials = createElement('div', { className: 'qmf-footer__socials' });
    for (const s of this.config.socials) {
      const a = createElement('a', {
        className: 'qmf-footer__social-link',
        href: s.href,
        target: '_blank',
        rel: 'noopener noreferrer',
        'aria-label': s.label,
        title: s.label,
      });
      a.innerHTML = `<i class="${s.icon}"></i>`;
      socials.appendChild(a);
    }
    return socials;
  }

  private renderCompanyInfo(): HTMLElement {
    const info = createElement('div', { className: 'qmf-footer__company' });
    if (this.config.companyInfo) {
      info.appendChild(createElement('p', { className: 'qmf-footer__company-name' }, [this.config.companyInfo]));
    }
    if (this.config.address) {
      info.appendChild(createElement('p', { className: 'qmf-footer__address' }, [this.config.address]));
    }
    return info;
  }

  private renderCopyright(): HTMLElement {
    const year = new Date().getFullYear();
    const yearRange = this.config.copyrightStartYear < year
      ? `${this.config.copyrightStartYear}–${year}`
      : `${year}`;

    return createElement('p', { className: 'qmf-footer__copyright' }, [
      `© ${yearRange} ${this.config.copyrightHolder}. All rights reserved.`,
    ]);
  }

  private renderDmca(): HTMLElement {
    const dmca = createElement('a', {
      className: 'qmf-footer__dmca',
      href: this.config.dmcaUrl,
      target: '_blank',
      rel: 'noopener noreferrer',
      title: 'DMCA.com Protection Status',
    });
    dmca.innerHTML = '<img src="https://images.dmca.com/Badges/dmca_protected_sml_120o.png" alt="DMCA Protected" height="18" />';
    return dmca;
  }
}

// ─── Convenience ──────────────────────────────────────────

export function createFooter(container: string | HTMLElement, config?: Partial<FooterConfig>): QMFFooter {
  const footer = new QMFFooter(config);
  footer.mount(container);
  return footer;
}

export function createFooterPlugin(config?: Partial<FooterConfig>): QMFPlugin {
  let instance: QMFFooter | null = null;
  return {
    name: 'footer',
    version: '3.0.0',
    hooks: {
      onMount: () => {
        instance = new QMFFooter(config);
        instance.mount('#qmf-footer');
      },
      onDestroy: () => instance?.destroy(),
    },
    setup: (ctx) => {
      ctx.expose('instance', instance);
    },
  };
}
