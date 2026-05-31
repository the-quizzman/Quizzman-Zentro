/**
 * QuizzMan Dynamic Features JS
 * Host: ui.quizzman.com/qmf/ui/dynamic/
 * 
 * API Schema:
 * - GET /api/dynamic/config - Get current dynamic features config
 * - GET /api/dynamic/island - Get active notifications
 * - GET /api/dynamic/banner - Get banner items
 */

class QMFDynamicFeatures {
    constructor(options = {}) {
        this.apiBase = options.apiBase || '/api/dynamic';
        this.configs = {};
        this.currentNotificationIndex = 0;
        this.notificationTimer = null;
        this.autoHideTimer = null;
        this.islandExpanded = false;
        this.pollInterval = options.pollInterval || 60000; // 1 minute
        this.pollingTimer = null;
        
        // Bind methods
        this.init = this.init.bind(this);
        this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
    }

    async init() {
        try {
            await this.loadConfigs();
            this.renderDynamicIsland();
            this.renderDynamicBanner();
            this.initEventListeners();
            this.startNotificationCycle();
            this.startPolling();
            
            // Handle visibility changes
            document.addEventListener('visibilitychange', this.handleVisibilityChange);
            
            console.log('[QMF-Dynamic] Initialized successfully');
        } catch (error) {
            console.error('[QMF-Dynamic] Initialization error:', error);
        }
    }

    async loadConfigs() {
        try {
            const response = await fetch(`${this.apiBase}/config`);
            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    this.configs = result.data;
                    return;
                }
            }
        } catch (error) {
            console.warn('[QMF-Dynamic] Failed to load configs, using defaults:', error);
        }
        
        // Default configs
        this.configs = {
            island: {
                enabled: true,
                autoHide: true,
                displayDuration: 5000,
                notifications: []
            },
            banner: {
                enabled: true,
                animationDuration: 20000,
                items: []
            }
        };
    }

    handleVisibilityChange() {
        if (document.hidden) {
            this.stopPolling();
        } else {
            this.startPolling();
            this.loadConfigs().then(() => this.refreshUI());
        }
    }

    startPolling() {
        if (this.pollingTimer) return;
        this.pollingTimer = setInterval(async () => {
            await this.loadConfigs();
            this.refreshUI();
        }, this.pollInterval);
    }

    stopPolling() {
        if (this.pollingTimer) {
            clearInterval(this.pollingTimer);
            this.pollingTimer = null;
        }
    }

    refreshUI() {
        this.renderDynamicBanner();
        // Don't interrupt current notification
    }

    // ============================================
    // Dynamic Island
    // ============================================
    renderDynamicIsland() {
        // Check if already exists
        if (document.getElementById('qmfDynamicIsland')) return;
        
        const html = `
            <div class="qmf-dynamic-island" id="qmfDynamicIsland">
                <div class="qmf-island-compact" id="qmfIslandCompact">
                    <div class="qmf-island-icon" id="qmfIslandIcon">
                        <i class="fas fa-bell"></i>
                    </div>
                    <span class="qmf-island-text" id="qmfIslandText">Notification</span>
                </div>
                <div class="qmf-island-expand" id="qmfIslandExpand">
                    <div class="qmf-island-header">
                        <span class="qmf-island-title" id="qmfIslandTitle"></span>
                        <button class="qmf-island-close" id="qmfIslandClose">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="qmf-island-message" id="qmfIslandMessage"></div>
                    <div class="qmf-island-actions" id="qmfIslandActions"></div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', html);
    }

    initEventListeners() {
        const compact = document.getElementById('qmfIslandCompact');
        const close = document.getElementById('qmfIslandClose');
        
        if (compact) {
            compact.addEventListener('click', () => this.expandIsland());
        }
        
        if (close) {
            close.addEventListener('click', () => this.closeIsland());
        }
    }

    startNotificationCycle() {
        const notifications = this.configs.island?.notifications || [];
        if (notifications.length === 0) return;

        this.showNextNotification();
        
        const cycleDelay = (this.configs.island?.displayDuration || 5000) + 2000;
        this.notificationTimer = setInterval(() => {
            if (!this.islandExpanded) {
                this.showNextNotification();
            }
        }, cycleDelay);
    }

    showNextNotification() {
        const notifications = this.configs.island?.notifications || [];
        if (notifications.length === 0) return;

        const notification = notifications[this.currentNotificationIndex];
        this.displayNotification(notification);
        
        this.currentNotificationIndex = (this.currentNotificationIndex + 1) % notifications.length;
    }

    displayNotification(notification) {
        const island = document.getElementById('qmfDynamicIsland');
        const icon = document.getElementById('qmfIslandIcon');
        const text = document.getElementById('qmfIslandText');
        const title = document.getElementById('qmfIslandTitle');
        const message = document.getElementById('qmfIslandMessage');
        const actions = document.getElementById('qmfIslandActions');

        if (!island) return;

        if (this.autoHideTimer) {
            clearTimeout(this.autoHideTimer);
        }

        // Update content
        if (icon) icon.innerHTML = `<i class="${notification.icon || 'fas fa-bell'}"></i>`;
        if (icon) icon.style.background = notification.color || '#667eea';
        if (text) text.textContent = notification.title;
        if (title) title.innerHTML = `<i class="${notification.icon || 'fas fa-bell'}"></i>${notification.title}`;
        if (message) message.textContent = notification.message;
        
        // Render actions
        if (actions) {
            actions.innerHTML = '';
            if (notification.action_url) {
                actions.innerHTML = `
                    <a href="${notification.action_url}" class="qmf-island-btn qmf-island-btn-primary">
                        ${notification.action_text || 'Xem thêm'}
                    </a>
                `;
            }
        }

        // Apply priority
        island.className = `qmf-dynamic-island priority-${notification.priority || 'info'}`;
        
        this.showIsland();

        // Auto-hide
        const hideDelay = this.configs.island?.displayDuration || 5000;
        this.autoHideTimer = setTimeout(() => {
            if (!this.islandExpanded) {
                this.hideIsland();
            }
        }, hideDelay);
    }

    showIsland() {
        const island = document.getElementById('qmfDynamicIsland');
        if (island) island.classList.add('active');
    }

    hideIsland() {
        const island = document.getElementById('qmfDynamicIsland');
        if (island) {
            island.classList.remove('active', 'expanded');
            this.islandExpanded = false;
        }
    }

    expandIsland() {
        const island = document.getElementById('qmfDynamicIsland');
        const compact = document.getElementById('qmfIslandCompact');
        const expand = document.getElementById('qmfIslandExpand');

        if (island && compact && expand) {
            island.classList.add('expanded');
            compact.classList.add('hidden');
            expand.classList.add('active');
            this.islandExpanded = true;

            if (this.autoHideTimer) {
                clearTimeout(this.autoHideTimer);
            }
        }
    }

    closeIsland() {
        const island = document.getElementById('qmfDynamicIsland');
        const compact = document.getElementById('qmfIslandCompact');
        const expand = document.getElementById('qmfIslandExpand');

        if (island && compact && expand) {
            island.classList.remove('expanded');
            compact.classList.remove('hidden');
            expand.classList.remove('active');
            this.islandExpanded = false;

            const hideDelay = this.configs.island?.displayDuration || 5000;
            if (this.autoHideTimer) clearTimeout(this.autoHideTimer);
            this.autoHideTimer = setTimeout(() => this.hideIsland(), hideDelay);
        }
    }

    // Push notification from outside
    pushNotification(notification) {
        this.displayNotification(notification);
    }

    // ============================================
    // Dynamic Banner
    // ============================================
    renderDynamicBanner() {
        const container = document.getElementById('qmfDynamicBanner');
        if (!container) return;
        
        if (!this.configs.banner?.enabled) {
            container.style.display = 'none';
            return;
        }

        const items = this.configs.banner?.items || [];
        if (items.length === 0) {
            container.style.display = 'none';
            return;
        }

        container.style.display = 'block';
        
        // Duplicate items for seamless loop
        const allItems = [...items, ...items];
        
        const track = container.querySelector('.qmf-banner-track') || document.createElement('div');
        track.className = 'qmf-banner-track';
        track.innerHTML = '';
        
        allItems.forEach(item => {
            const el = document.createElement('a');
            el.className = 'qmf-banner-item';
            el.href = item.url || '#';
            el.innerHTML = `
                <div class="qmf-banner-icon" style="background: ${item.color || '#667eea'}20; color: ${item.color || '#667eea'};">
                    <i class="${item.icon || 'fas fa-star'}"></i>
                </div>
                <div class="qmf-banner-info">
                    <div class="qmf-banner-title">${item.title}</div>
                    <div class="qmf-banner-desc">${item.description || ''}</div>
                </div>
            `;
            track.appendChild(el);
        });

        if (!container.querySelector('.qmf-banner-track')) {
            container.appendChild(track);
        }

        const duration = this.configs.banner?.animationDuration || 20000;
        track.style.animationDuration = duration + 'ms';
    }

    // ============================================
    // Public API
    // ============================================
    destroy() {
        this.stopPolling();
        if (this.notificationTimer) clearInterval(this.notificationTimer);
        if (this.autoHideTimer) clearTimeout(this.autoHideTimer);
        document.removeEventListener('visibilitychange', this.handleVisibilityChange);
        
        const island = document.getElementById('qmfDynamicIsland');
        if (island) island.remove();
    }
}

// Auto-init if data attribute present
document.addEventListener('DOMContentLoaded', () => {
    const autoInit = document.querySelector('[data-qmf-dynamic]');
    if (autoInit) {
        const apiBase = autoInit.dataset.apiBase || '/api/dynamic';
        window.qmfDynamic = new QMFDynamicFeatures({ apiBase });
        window.qmfDynamic.init();
    }
});

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = QMFDynamicFeatures;
}
if (typeof window !== 'undefined') {
    window.QMFDynamicFeatures = QMFDynamicFeatures;
}
