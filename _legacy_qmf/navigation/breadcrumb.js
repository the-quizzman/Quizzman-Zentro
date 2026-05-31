/**
 * QMF Breadcrumb - Breadcrumb navigation
 * @version 1.0.0
 * @module navigation/breadcrumb
 */

import eventBus from '../kernel/event-bus.js';
import router from './router.js';

class BreadcrumbManager {
    constructor() {
        this.items = [];
        this.config = {
            homeLabel: 'Home',
            homePath: '/',
            homeIcon: '🏠',
            separator: '/',
            maxItems: 5,
            showHome: true,
            autoGenerate: true
        };
    }

    /**
     * Configure breadcrumb
     */
    configure(options = {}) {
        this.config = { ...this.config, ...options };

        // Listen to route changes
        if (this.config.autoGenerate) {
            eventBus.on('router:after', ({ to }) => {
                this.generateFromRoute(to);
            });
        }

        return this;
    }

    /**
     * Set breadcrumb items manually
     */
    set(items) {
        this.items = items.map((item, index) => ({
            id: item.id || `breadcrumb-${index}`,
            label: item.label,
            path: item.path || null,
            icon: item.icon || null,
            active: index === items.length - 1,
            meta: item.meta || {}
        }));

        eventBus.emit('breadcrumb:updated', { items: this.items });

        return this;
    }

    /**
     * Generate breadcrumbs từ route
     */
    generateFromRoute(route) {
        const items = [];

        // Add home
        if (this.config.showHome) {
            items.push({
                id: 'home',
                label: this.config.homeLabel,
                path: this.config.homePath,
                icon: this.config.homeIcon,
                active: false
            });
        }

        // Parse path segments
        const segments = route.path.split('/').filter(Boolean);
        let currentPath = '';

        for (let i = 0; i < segments.length; i++) {
            const segment = segments[i];
            currentPath += `/${segment}`;

            // Check if this is a param
            const isParam = segment.startsWith(':') || /^\d+$/.test(segment);

            // Get label
            let label = segment;

            // Check route meta for breadcrumb label
            const matchedRoute = router.getRoute(currentPath);
            if (matchedRoute?.meta?.breadcrumb) {
                label = matchedRoute.meta.breadcrumb;
            } else if (isParam && route.params) {
                // Try to get param value
                const paramName = Object.keys(route.params).find(key => 
                    route.params[key] === segment
                );
                label = paramName ? `${route.params[paramName]}` : segment;
            } else {
                // Humanize segment
                label = this._humanize(segment);
            }

            items.push({
                id: `segment-${i}`,
                label,
                path: i === segments.length - 1 ? null : currentPath,
                icon: matchedRoute?.meta?.icon || null,
                active: i === segments.length - 1
            });
        }

        // Limit items if needed
        if (this.config.maxItems && items.length > this.config.maxItems) {
            const start = items.slice(0, 1);
            const end = items.slice(-(this.config.maxItems - 2));
            this.items = [...start, { id: 'ellipsis', label: '...', path: null }, ...end];
        } else {
            this.items = items;
        }

        eventBus.emit('breadcrumb:updated', { items: this.items });

        return this;
    }

    /**
     * Push item vào cuối
     */
    push(item) {
        // Deactivate previous last item
        if (this.items.length > 0) {
            this.items[this.items.length - 1].active = false;
            this.items[this.items.length - 1].path = this.items[this.items.length - 1].path || 
                router.getCurrentRoute()?.path;
        }

        this.items.push({
            id: item.id || `breadcrumb-${this.items.length}`,
            label: item.label,
            path: null,
            icon: item.icon || null,
            active: true,
            meta: item.meta || {}
        });

        eventBus.emit('breadcrumb:updated', { items: this.items });

        return this;
    }

    /**
     * Pop last item
     */
    pop() {
        if (this.items.length <= 1) return null;

        const removed = this.items.pop();

        // Activate new last item
        if (this.items.length > 0) {
            this.items[this.items.length - 1].active = true;
        }

        eventBus.emit('breadcrumb:updated', { items: this.items });

        return removed;
    }

    /**
     * Clear breadcrumbs
     */
    clear() {
        this.items = [];
        eventBus.emit('breadcrumb:updated', { items: this.items });
        return this;
    }

    /**
     * Get current items
     */
    getItems() {
        return [...this.items];
    }

    /**
     * Get current (active) item
     */
    getCurrent() {
        return this.items.find(item => item.active) || null;
    }

    /**
     * Navigate to breadcrumb item
     */
    navigateTo(itemId) {
        const item = this.items.find(i => i.id === itemId);
        if (!item || !item.path) return;

        router.navigate(item.path);
    }

    /**
     * Render breadcrumb HTML
     */
    render(options = {}) {
        const {
            containerClass = 'qmf-breadcrumb',
            itemClass = 'qmf-breadcrumb-item',
            linkClass = 'qmf-breadcrumb-link',
            activeClass = 'qmf-breadcrumb-item--active',
            separatorClass = 'qmf-breadcrumb-separator',
            iconClass = 'qmf-breadcrumb-icon'
        } = options;

        const separator = `<span class="${separatorClass}" aria-hidden="true">${this.config.separator}</span>`;

        const itemsHtml = this.items.map((item, index) => {
            const classes = [itemClass];
            if (item.active) classes.push(activeClass);

            const iconHtml = item.icon ? `<span class="${iconClass}">${item.icon}</span>` : '';
            
            let content;
            if (item.path && !item.active) {
                content = `<a href="${item.path}" class="${linkClass}">${iconHtml}${item.label}</a>`;
            } else {
                content = `<span class="${linkClass}" aria-current="page">${iconHtml}${item.label}</span>`;
            }

            const separatorHtml = index < this.items.length - 1 ? separator : '';

            return `
                <li class="${classes.join(' ')}" data-breadcrumb-item="${item.id}">
                    ${content}
                    ${separatorHtml}
                </li>
            `;
        }).join('');

        return `
            <nav class="${containerClass}" aria-label="Breadcrumb">
                <ol class="qmf-breadcrumb-list">
                    ${itemsHtml}
                </ol>
            </nav>
        `;
    }

    /**
     * Bind click events
     */
    bindEvents(container) {
        container.addEventListener('click', (e) => {
            const link = e.target.closest('.qmf-breadcrumb-link');
            if (!link) return;

            const item = link.closest('[data-breadcrumb-item]');
            if (!item) return;

            const itemId = item.dataset.breadcrumbItem;
            const breadcrumbItem = this.items.find(i => i.id === itemId);

            if (breadcrumbItem?.path) {
                e.preventDefault();
                this.navigateTo(itemId);
            }
        });
    }

    /**
     * Schema.org structured data
     */
    getStructuredData() {
        return {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: this.items
                .filter(item => !item.id.includes('ellipsis'))
                .map((item, index) => ({
                    '@type': 'ListItem',
                    position: index + 1,
                    name: item.label,
                    item: item.path ? `${window.location.origin}${item.path}` : undefined
                }))
        };
    }

    /**
     * Inject structured data vào page
     */
    injectStructuredData() {
        // Remove existing
        const existing = document.querySelector('script[data-breadcrumb-schema]');
        if (existing) existing.remove();

        // Create new
        const script = document.createElement('script');
        script.type = 'application/ld+json';
        script.dataset.breadcrumbSchema = 'true';
        script.textContent = JSON.stringify(this.getStructuredData());
        document.head.appendChild(script);
    }

    /**
     * Humanize string
     */
    _humanize(str) {
        return str
            .replace(/[-_]/g, ' ')
            .replace(/([a-z])([A-Z])/g, '$1 $2')
            .replace(/\b\w/g, c => c.toUpperCase());
    }
}

// Singleton export
const breadcrumb = new BreadcrumbManager();
export default breadcrumb;
export { BreadcrumbManager };
