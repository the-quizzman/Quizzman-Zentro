/**
 * QMF Shell - App Shell component manager
 * @version 1.0.0
 * @module layout/shell
 */

import eventBus from '../kernel/event-bus.js';
import lifecycle from '../kernel/lifecycle.js';
import context from '../kernel/context.js';
import viewport from '../platform/viewport.js';

class AppShell {
    constructor() {
        this.container = null;
        this.regions = new Map();
        this.config = null;
        this.isRendered = false;
        this.theme = 'light';
    }

    /**
     * Khởi tạo Shell với config
     */
    async init(config = {}) {
        this.config = {
            containerId: 'qmf-shell',
            enableHeader: true,
            enableSidebar: true,
            enableFooter: true,
            sidebarPosition: 'left', // 'left' | 'right'
            sidebarCollapsible: true,
            sidebarDefaultCollapsed: false,
            headerFixed: true,
            footerFixed: false,
            theme: 'light',
            layout: 'default', // 'default' | 'full-width' | 'sidebar-only'
            ...config
        };

        this.theme = this.config.theme;

        // Register với lifecycle
        lifecycle.register('shell', this);

        return this;
    }

    /**
     * Render shell vào DOM
     */
    async render(targetElement = document.body) {
        if (this.isRendered) {
            console.warn('[Shell] Already rendered');
            return;
        }

        // Create container
        this.container = document.createElement('div');
        this.container.id = this.config.containerId;
        this.container.className = this._getShellClasses();

        // Create regions
        this.container.innerHTML = this._getShellTemplate();

        // Append to DOM
        targetElement.appendChild(this.container);

        // Cache region elements
        this._cacheRegions();

        // Setup event listeners
        this._setupEventListeners();

        // Apply initial state
        this._applyState();

        this.isRendered = true;

        // Mount lifecycle
        await lifecycle.mount('shell', this.container);

        eventBus.emit('shell:rendered', { container: this.container });

        return this.container;
    }

    /**
     * Get shell template HTML
     */
    _getShellTemplate() {
        const { enableHeader, enableSidebar, enableFooter, sidebarPosition } = this.config;

        return `
            <!-- Skip to content for accessibility -->
            <a href="#qmf-main" class="qmf-skip-link">Skip to main content</a>

            ${enableHeader ? `
            <header id="qmf-header" class="qmf-region qmf-header" role="banner">
                <div class="qmf-header-inner">
                    <div class="qmf-header-left" data-slot="header-left"></div>
                    <div class="qmf-header-center" data-slot="header-center"></div>
                    <div class="qmf-header-right" data-slot="header-right"></div>
                </div>
            </header>
            ` : ''}

            <div class="qmf-body">
                ${enableSidebar && sidebarPosition === 'left' ? this._getSidebarTemplate() : ''}

                <main id="qmf-main" class="qmf-region qmf-main" role="main">
                    <div class="qmf-main-inner" data-slot="main"></div>
                </main>

                ${enableSidebar && sidebarPosition === 'right' ? this._getSidebarTemplate() : ''}
            </div>

            ${enableFooter ? `
            <footer id="qmf-footer" class="qmf-region qmf-footer" role="contentinfo">
                <div class="qmf-footer-inner" data-slot="footer"></div>
            </footer>
            ` : ''}

            <!-- Overlay container for modals, toasts, etc -->
            <div id="qmf-overlay" class="qmf-overlay-container" aria-live="polite"></div>
        `;
    }

    /**
     * Get sidebar template
     */
    _getSidebarTemplate() {
        const { sidebarCollapsible } = this.config;

        return `
            <aside id="qmf-sidebar" class="qmf-region qmf-sidebar" role="navigation">
                ${sidebarCollapsible ? `
                <button class="qmf-sidebar-toggle" aria-label="Toggle sidebar" aria-expanded="true">
                    <span class="qmf-sidebar-toggle-icon"></span>
                </button>
                ` : ''}
                <nav class="qmf-sidebar-inner" data-slot="sidebar">
                    <div class="qmf-sidebar-header" data-slot="sidebar-header"></div>
                    <div class="qmf-sidebar-nav" data-slot="sidebar-nav"></div>
                    <div class="qmf-sidebar-footer" data-slot="sidebar-footer"></div>
                </nav>
            </aside>
        `;
    }

    /**
     * Cache region elements
     */
    _cacheRegions() {
        this.regions.set('header', this.container.querySelector('#qmf-header'));
        this.regions.set('sidebar', this.container.querySelector('#qmf-sidebar'));
        this.regions.set('main', this.container.querySelector('#qmf-main'));
        this.regions.set('footer', this.container.querySelector('#qmf-footer'));
        this.regions.set('overlay', this.container.querySelector('#qmf-overlay'));

        // Cache all slots
        const slots = this.container.querySelectorAll('[data-slot]');
        slots.forEach(slot => {
            this.regions.set(`slot:${slot.dataset.slot}`, slot);
        });
    }

    /**
     * Get region element
     */
    getRegion(name) {
        return this.regions.get(name);
    }

    /**
     * Get slot element
     */
    getSlot(name) {
        return this.regions.get(`slot:${name}`);
    }

    /**
     * Setup event listeners
     */
    _setupEventListeners() {
        // Sidebar toggle
        const toggleBtn = this.container.querySelector('.qmf-sidebar-toggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => this.toggleSidebar());
        }

        // Viewport changes
        viewport.onBreakpointChange((newBp, oldBp) => {
            this._handleBreakpointChange(newBp, oldBp);
        });

        // Theme changes
        eventBus.on('theme:change', (theme) => {
            this.setTheme(theme);
        });
    }

    /**
     * Apply initial state
     */
    _applyState() {
        // Collapsed state from config or saved
        const savedCollapsed = context.get('shell:sidebarCollapsed');
        if (savedCollapsed !== null || this.config.sidebarDefaultCollapsed) {
            const isCollapsed = savedCollapsed ?? this.config.sidebarDefaultCollapsed;
            if (isCollapsed) {
                this.collapseSidebar(false); // false = no animation
            }
        }

        // Check mobile
        if (viewport.isBreakpointDown('md')) {
            this.collapseSidebar(false);
        }
    }

    /**
     * Handle breakpoint changes
     */
    _handleBreakpointChange(newBp, oldBp) {
        const isMobile = ['xs', 'sm'].includes(newBp);
        const wasMobile = ['xs', 'sm'].includes(oldBp);

        if (isMobile && !wasMobile) {
            // Entering mobile
            this.collapseSidebar();
            this.container.classList.add('qmf-mobile');
        } else if (!isMobile && wasMobile) {
            // Leaving mobile
            this.container.classList.remove('qmf-mobile');
            // Restore saved state
            const savedCollapsed = context.get('shell:sidebarCollapsed');
            if (!savedCollapsed) {
                this.expandSidebar();
            }
        }

        eventBus.emit('shell:breakpoint', { breakpoint: newBp, isMobile });
    }

    /**
     * Get shell CSS classes
     */
    _getShellClasses() {
        const classes = ['qmf-shell'];

        classes.push(`qmf-layout-${this.config.layout}`);
        classes.push(`qmf-theme-${this.theme}`);

        if (this.config.headerFixed) classes.push('qmf-header-fixed');
        if (this.config.footerFixed) classes.push('qmf-footer-fixed');
        if (this.config.enableSidebar) {
            classes.push(`qmf-sidebar-${this.config.sidebarPosition}`);
        }

        return classes.join(' ');
    }

    /**
     * Toggle sidebar
     */
    toggleSidebar() {
        const sidebar = this.regions.get('sidebar');
        if (!sidebar) return;

        const isCollapsed = sidebar.classList.contains('qmf-sidebar-collapsed');
        if (isCollapsed) {
            this.expandSidebar();
        } else {
            this.collapseSidebar();
        }
    }

    /**
     * Collapse sidebar
     */
    collapseSidebar(animate = true) {
        const sidebar = this.regions.get('sidebar');
        if (!sidebar) return;

        if (!animate) {
            sidebar.classList.add('qmf-no-transition');
        }

        sidebar.classList.add('qmf-sidebar-collapsed');
        this.container.classList.add('qmf-sidebar-collapsed');

        const toggleBtn = sidebar.querySelector('.qmf-sidebar-toggle');
        if (toggleBtn) {
            toggleBtn.setAttribute('aria-expanded', 'false');
        }

        if (!animate) {
            requestAnimationFrame(() => {
                sidebar.classList.remove('qmf-no-transition');
            });
        }

        context.set('shell:sidebarCollapsed', true, { persist: true });
        eventBus.emit('shell:sidebar:collapse');
    }

    /**
     * Expand sidebar
     */
    expandSidebar() {
        const sidebar = this.regions.get('sidebar');
        if (!sidebar) return;

        sidebar.classList.remove('qmf-sidebar-collapsed');
        this.container.classList.remove('qmf-sidebar-collapsed');

        const toggleBtn = sidebar.querySelector('.qmf-sidebar-toggle');
        if (toggleBtn) {
            toggleBtn.setAttribute('aria-expanded', 'true');
        }

        context.set('shell:sidebarCollapsed', false, { persist: true });
        eventBus.emit('shell:sidebar:expand');
    }

    /**
     * Set theme
     */
    setTheme(theme) {
        const oldTheme = this.theme;
        this.theme = theme;

        this.container.classList.remove(`qmf-theme-${oldTheme}`);
        this.container.classList.add(`qmf-theme-${theme}`);

        document.documentElement.setAttribute('data-theme', theme);
        context.set('shell:theme', theme, { persist: true });

        eventBus.emit('shell:theme:change', { theme, oldTheme });
    }

    /**
     * Set layout mode
     */
    setLayout(layout) {
        const oldLayout = this.config.layout;
        this.config.layout = layout;

        this.container.classList.remove(`qmf-layout-${oldLayout}`);
        this.container.classList.add(`qmf-layout-${layout}`);

        eventBus.emit('shell:layout:change', { layout, oldLayout });
    }

    /**
     * Show loading overlay
     */
    showLoading(message = '') {
        const overlay = this.regions.get('overlay');
        if (!overlay) return;

        overlay.innerHTML = `
            <div class="qmf-loading-overlay">
                <div class="qmf-loading-spinner"></div>
                ${message ? `<p class="qmf-loading-message">${message}</p>` : ''}
            </div>
        `;
        overlay.classList.add('qmf-overlay-active');
    }

    /**
     * Hide loading overlay
     */
    hideLoading() {
        const overlay = this.regions.get('overlay');
        if (!overlay) return;

        overlay.classList.remove('qmf-overlay-active');
        overlay.innerHTML = '';
    }

    /**
     * Destroy shell
     */
    async destroy() {
        if (!this.isRendered) return;

        await lifecycle.unmount('shell');

        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }

        this.container = null;
        this.regions.clear();
        this.isRendered = false;

        eventBus.emit('shell:destroyed');
    }
}

// Singleton export
const shell = new AppShell();
export default shell;
export { AppShell };
