/**
 * QMF Footer Plugin
 * Shared footer component
 * @version 1.0.0
 */

import { eventBus } from '../kernel/event-bus.js';
import { context } from '../kernel/context.js';

/**
 * @typedef {Object} FooterConfig
 * @property {string} copyright - Copyright text
 * @property {Array} links - Footer links
 * @property {Array} socialLinks - Social media links
 * @property {boolean} showVersion - Show app version
 * @property {boolean} sticky - Sticky to bottom
 */

class FooterPlugin {
    constructor() {
        this.element = null;
        this.config = {};
        
        this._defaults = {
            copyright: `© ${new Date().getFullYear()} Quizzman. All rights reserved.`,
            links: [
                { label: 'Privacy', href: '/privacy' },
                { label: 'Terms', href: '/terms' },
                { label: 'Help', href: '/help' }
            ],
            socialLinks: [],
            showVersion: true,
            version: '1.0.0',
            sticky: false,
            minimal: false,
            theme: {
                background: 'var(--qmf-color-bg-secondary)',
                border: true
            }
        };
    }
    
    /**
     * Initialize footer
     */
    init(config = {}) {
        this.config = { ...this._defaults, ...config };
        this._createFooter();
        this._bindEvents();
        
        eventBus.emit('footer:initialized', { config: this.config });
        
        return this;
    }
    
    /**
     * Create footer DOM
     */
    _createFooter() {
        this.element = document.createElement('footer');
        this.element.id = 'qmf-footer';
        this.element.className = 'qmf-footer';
        
        if (this.config.sticky) {
            this.element.classList.add('qmf-footer--sticky');
        }
        
        if (this.config.minimal) {
            this.element.classList.add('qmf-footer--minimal');
        }
        
        this.element.innerHTML = this._renderContent();
        this._injectStyles();
    }
    
    /**
     * Render footer content
     */
    _renderContent() {
        if (this.config.minimal) {
            return this._renderMinimal();
        }
        
        return `
            <div class="qmf-footer__container">
                <div class="qmf-footer__left">
                    <span class="qmf-footer__copyright">${this.config.copyright}</span>
                </div>
                
                <nav class="qmf-footer__nav">
                    ${this.config.links.map(link => `
                        <a href="${link.href}" 
                           class="qmf-footer__link"
                           ${link.external ? 'target="_blank" rel="noopener"' : ''}>
                            ${link.label}
                        </a>
                    `).join('')}
                </nav>
                
                <div class="qmf-footer__right">
                    ${this._renderSocialLinks()}
                    ${this.config.showVersion ? `
                        <span class="qmf-footer__version">v${this.config.version}</span>
                    ` : ''}
                </div>
            </div>
        `;
    }
    
    /**
     * Render minimal footer
     */
    _renderMinimal() {
        return `
            <div class="qmf-footer__container qmf-footer__container--minimal">
                <span class="qmf-footer__copyright">${this.config.copyright}</span>
                ${this.config.showVersion ? `
                    <span class="qmf-footer__version">v${this.config.version}</span>
                ` : ''}
            </div>
        `;
    }
    
    /**
     * Render social links
     */
    _renderSocialLinks() {
        if (!this.config.socialLinks.length) return '';
        
        return `
            <div class="qmf-footer__social">
                ${this.config.socialLinks.map(link => `
                    <a href="${link.href}" 
                       class="qmf-footer__social-link"
                       target="_blank" 
                       rel="noopener"
                       aria-label="${link.label}">
                        ${this._getSocialIcon(link.icon)}
                    </a>
                `).join('')}
            </div>
        `;
    }
    
    /**
     * Get social icon SVG
     */
    _getSocialIcon(name) {
        const icons = {
            github: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>',
            twitter: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>',
            facebook: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>',
            linkedin: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>',
            discord: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z"/></svg>'
        };
        
        return icons[name] || '';
    }
    
    /**
     * Bind events
     */
    _bindEvents() {
        this.element.querySelectorAll('.qmf-footer__link').forEach(link => {
            link.addEventListener('click', (e) => {
                eventBus.emit('footer:link-click', {
                    href: link.href,
                    label: link.textContent,
                    event: e
                });
            });
        });
    }
    
    /**
     * Update configuration
     */
    configure(config) {
        this.config = { ...this.config, ...config };
        this.element.innerHTML = this._renderContent();
        this._bindEvents();
    }
    
    /**
     * Set links
     */
    setLinks(links) {
        this.config.links = links;
        this.configure(this.config);
    }
    
    /**
     * Set version
     */
    setVersion(version) {
        this.config.version = version;
        const versionEl = this.element.querySelector('.qmf-footer__version');
        if (versionEl) {
            versionEl.textContent = `v${version}`;
        }
    }
    
    /**
     * Mount footer
     */
    mount(target) {
        const container = typeof target === 'string' 
            ? document.querySelector(target) 
            : target;
            
        if (container && this.element) {
            container.appendChild(this.element);
            eventBus.emit('footer:mounted');
        }
        
        return this;
    }
    
    /**
     * Unmount footer
     */
    unmount() {
        if (this.element?.parentNode) {
            this.element.parentNode.removeChild(this.element);
            eventBus.emit('footer:unmounted');
        }
    }
    
    /**
     * Inject styles
     */
    _injectStyles() {
        if (document.getElementById('qmf-footer-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'qmf-footer-styles';
        style.textContent = `
            .qmf-footer {
                width: 100%;
                min-height: var(--qmf-footer-height);
                background: var(--qmf-color-bg-secondary);
                border-top: 1px solid var(--qmf-color-border);
            }
            
            .qmf-footer--sticky {
                position: sticky;
                bottom: 0;
                z-index: var(--qmf-z-sticky);
            }
            
            .qmf-footer__container {
                display: flex;
                align-items: center;
                justify-content: space-between;
                max-width: 1400px;
                margin: 0 auto;
                padding: var(--qmf-space-3) var(--qmf-space-4);
                gap: var(--qmf-space-4);
            }
            
            .qmf-footer__container--minimal {
                justify-content: center;
                gap: var(--qmf-space-2);
            }
            
            .qmf-footer__left,
            .qmf-footer__right {
                display: flex;
                align-items: center;
                gap: var(--qmf-space-4);
            }
            
            .qmf-footer__copyright {
                font-size: var(--qmf-font-size-sm);
                color: var(--qmf-color-text-secondary);
            }
            
            .qmf-footer__nav {
                display: flex;
                align-items: center;
                gap: var(--qmf-space-4);
            }
            
            .qmf-footer__link {
                font-size: var(--qmf-font-size-sm);
                color: var(--qmf-color-text-secondary);
                text-decoration: none;
                transition: color var(--qmf-duration-fast) var(--qmf-easing-default);
            }
            
            .qmf-footer__link:hover {
                color: var(--qmf-color-text);
            }
            
            .qmf-footer__social {
                display: flex;
                align-items: center;
                gap: var(--qmf-space-2);
            }
            
            .qmf-footer__social-link {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 32px;
                height: 32px;
                color: var(--qmf-color-text-tertiary);
                border-radius: var(--qmf-radius);
                transition: var(--qmf-transition-fast);
            }
            
            .qmf-footer__social-link:hover {
                color: var(--qmf-color-text);
                background: var(--qmf-color-bg-tertiary);
            }
            
            .qmf-footer__social-link svg {
                width: 18px;
                height: 18px;
            }
            
            .qmf-footer__version {
                font-size: var(--qmf-font-size-xs);
                color: var(--qmf-color-text-tertiary);
                font-family: var(--qmf-font-family-mono);
            }
            
            /* Minimal variant */
            .qmf-footer--minimal {
                min-height: auto;
            }
            
            .qmf-footer--minimal .qmf-footer__container {
                padding: var(--qmf-space-2) var(--qmf-space-4);
            }
            
            @media (max-width: 768px) {
                .qmf-footer__container {
                    flex-direction: column;
                    text-align: center;
                    padding: var(--qmf-space-4);
                }
                
                .qmf-footer__left,
                .qmf-footer__right {
                    flex-direction: column;
                }
                
                .qmf-footer__nav {
                    flex-wrap: wrap;
                    justify-content: center;
                }
            }
        `;
        
        document.head.appendChild(style);
    }
}

export const footerPlugin = new FooterPlugin();
export default footerPlugin;
