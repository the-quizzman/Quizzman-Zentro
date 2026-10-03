/**
 * QMF Dynamic Features - Shared UI Components
 * Dynamic Island & Featured Tools Banner
 * Version: 1.0.0
 * 
 * Usage:
 *   // Initialize with config
 *   const df = new QMFDynamicFeatures({
 *     apiEndpoint: 'https://quizzman.com/api/configs',
 *     bannerEnabled: true,
 *     islandEnabled: true,
 *     autoHideDelay: 5000,
 *     bannerTitle: 'Công cụ nổi bật',
 *     bannerTitleIcon: 'fas fa-fire'
 *   });
 */

(function(global) {
    'use strict';

    // Default configuration
    const DEFAULT_CONFIG = {
        // API Settings
        apiEndpoint: '/api/configs',
        
        // Banner Settings
        bannerEnabled: true,
        bannerContainerId: 'qmfFeaturedBanner',
        bannerTitle: 'Công cụ nổi bật',
        bannerTitleIcon: 'fas fa-fire',
        bannerAnimationDuration: 20000,
        
        // Default tools if API unavailable
        defaultTools: [
            {
                title: 'Tử vi Lịch pháp',
                description: 'Xem tử vi, lịch âm dương chi tiết',
                icon: 'fas fa-yin-yang',
                url: 'https://quizzman.com/tool/calendar',
                color: '#667eea'
            },
            {
                title: 'Quiz Game',
                description: 'Trò chơi học tập tương tác',
                icon: 'fas fa-gamepad',
                url: 'https://play.quizzman.com',
                color: '#ff6b6b'
            },
            {
                title: 'Từ điển Hán Nôm',
                description: 'Tra cứu từ điển Hán Việt, Nôm',
                icon: 'fas fa-book',
                url: 'https://dict.quizzman.com',
                color: '#4ecdc4'
            }
        ],
        
        // Dynamic Island Settings
        islandEnabled: true,
        islandContainerId: 'qmfDynamicIsland',
        autoHideDelay: 5000,
        notificationCycleDelay: 12000,
        
        // Default notifications if API unavailable
        defaultNotifications: [
            {
                id: 1,
                type: 'feature',
                title: 'Chào mừng đến Quizzman',
                message: 'Khám phá các tính năng học tập tương tác!',
                icon: 'fas fa-star',
                color: '#00d4ff',
                priority: 'high'
            }
        ],
        
        // Callbacks
        onBannerReady: null,
        onIslandReady: null,
        onToolClick: null,
        onNotificationClick: null,
        onNotificationClose: null
    };

    class QMFDynamicFeatures {
        constructor(userConfig = {}) {
            this.config = { ...DEFAULT_CONFIG, ...userConfig };
            this.tools = [];
            this.notifications = [];
            this.currentNotificationIndex = 0;
            this.notificationTimer = null;
            this.autoHideTimer = null;
            this.islandExpanded = false;
            this.initialized = false;

            // Auto-initialize on DOM ready
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.init());
            } else {
                this.init();
            }
        }

        async init() {
            if (this.initialized) return;
            
            try {
                await this.loadRemoteConfig();
                
                if (this.config.bannerEnabled) {
                    this.initBanner();
                }
                
                if (this.config.islandEnabled) {
                    this.initDynamicIsland();
                    this.startNotificationCycle();
                }
                
                this.initialized = true;
                if (global.__QMF_DEBUG__) console.log('[QMF Dynamic Features] Initialized successfully');
            } catch (error) {
                console.error('[QMF Dynamic Features] Initialization error:', error);
                // Use defaults
                this.tools = this.config.defaultTools;
                this.notifications = this.config.defaultNotifications;
                
                if (this.config.bannerEnabled) {
                    this.initBanner();
                }
                
                if (this.config.islandEnabled) {
                    this.initDynamicIsland();
                    this.startNotificationCycle();
                }
            }
        }

        async loadRemoteConfig() {
            try {
                const response = await fetch(this.config.apiEndpoint);
                if (!response.ok) throw new Error('API request failed');
                
                const result = await response.json();
                if (result.success && result.data) {
                    const configs = result.data.reduce((acc, config) => {
                        acc[config.key] = config.value;
                        return acc;
                    }, {});

                    // Parse config values
                    this.tools = configs.featured_tools || this.config.defaultTools;
                    this.notifications = configs.active_notifications || this.config.defaultNotifications;
                    
                    if (configs.banner_animation_duration) {
                        this.config.bannerAnimationDuration = configs.banner_animation_duration;
                    }
                    if (configs.notification_display_duration) {
                        this.config.autoHideDelay = configs.notification_display_duration;
                    }
                }
            } catch (error) {
                console.warn('[QMF Dynamic Features] Using default config:', error.message);
                this.tools = this.config.defaultTools;
                this.notifications = this.config.defaultNotifications;
            }
        }

        // ==========================================
        // BANNER METHODS
        // ==========================================
        
        initBanner() {
            // Check if container already exists
            let container = document.getElementById(this.config.bannerContainerId);
            
            if (!container) {
                // Create banner HTML
                container = this.createBannerElement();
                
                // Find insertion point (after header or at top of body)
                const header = document.querySelector('header, .qmf-header, .header');
                if (header && header.nextSibling) {
                    header.parentNode.insertBefore(container, header.nextSibling);
                } else {
                    document.body.insertBefore(container, document.body.firstChild);
                }
            }

            // Populate tools
            this.renderTools();
            
            // Show banner
            container.style.display = 'block';
            
            if (typeof this.config.onBannerReady === 'function') {
                this.config.onBannerReady(container);
            }
        }

        createBannerElement() {
            const banner = document.createElement('div');
            banner.id = this.config.bannerContainerId;
            banner.className = 'qmf-featured-banner';
            banner.innerHTML = `
                <div class="qmf-banner-container">
                    <div class="qmf-banner-content">
                        <div class="qmf-banner-title">
                            <i class="${this.config.bannerTitleIcon}"></i>
                            ${this.config.bannerTitle}
                        </div>
                        <div class="qmf-tools-carousel">
                            <div class="qmf-tools-track" id="qmfToolsTrack"></div>
                        </div>
                    </div>
                </div>
            `;
            return banner;
        }

        renderTools() {
            const track = document.getElementById('qmfToolsTrack');
            if (!track) return;

            // Duplicate tools for seamless loop
            const allTools = [...this.tools, ...this.tools];
            
            track.innerHTML = allTools.map(tool => `
                <a href="${tool.url}" class="qmf-tool-item" data-tool-title="${tool.title}">
                    <div class="qmf-tool-icon" style="background: ${tool.color}20; color: ${tool.color};">
                        <i class="${tool.icon}"></i>
                    </div>
                    <div class="qmf-tool-info">
                        <div class="qmf-tool-name">${tool.title}</div>
                        <div class="qmf-tool-desc">${tool.description}</div>
                    </div>
                </a>
            `).join('');

            // Set animation duration
            track.style.animationDuration = `${this.config.bannerAnimationDuration}ms`;

            // Add click handlers
            track.querySelectorAll('.qmf-tool-item').forEach(item => {
                item.addEventListener('click', (e) => {
                    if (typeof this.config.onToolClick === 'function') {
                        this.config.onToolClick(item.dataset.toolTitle, e);
                    }
                });
            });
        }

        // ==========================================
        // DYNAMIC ISLAND METHODS
        // ==========================================

        initDynamicIsland() {
            // Check if container already exists
            let container = document.getElementById(this.config.islandContainerId);
            
            if (!container) {
                container = this.createIslandElement();
                document.body.appendChild(container);
            }

            // Set up event handlers
            const compact = container.querySelector('.qmf-island-compact');
            const close = container.querySelector('.qmf-island-close');

            if (compact) {
                compact.addEventListener('click', () => this.expandIsland());
            }

            if (close) {
                close.addEventListener('click', () => this.closeIsland());
            }

            if (typeof this.config.onIslandReady === 'function') {
                this.config.onIslandReady(container);
            }
        }

        createIslandElement() {
            const island = document.createElement('div');
            island.id = this.config.islandContainerId;
            island.className = 'qmf-dynamic-island';
            island.innerHTML = `
                <div class="qmf-island-compact" id="qmfIslandCompact">
                    <div class="qmf-island-icon" id="qmfIslandIcon">
                        <i class="fas fa-bell"></i>
                    </div>
                    <div class="qmf-island-text" id="qmfIslandText">
                        Nhấn để xem thông báo mới
                    </div>
                </div>
                <div class="qmf-island-expand" id="qmfIslandExpand">
                    <div class="qmf-island-header">
                        <div class="qmf-island-title" id="qmfIslandTitle">
                            <i class="fas fa-star"></i>
                            Thông báo
                        </div>
                        <button class="qmf-island-close" id="qmfIslandClose">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="qmf-island-message" id="qmfIslandMessage">
                        Thông báo sẽ hiển thị ở đây
                    </div>
                </div>
            `;
            return island;
        }

        startNotificationCycle() {
            if (this.notifications.length === 0) return;

            this.showNextNotification();

            // Set up cycle timer
            this.notificationTimer = setInterval(() => {
                if (!this.islandExpanded) {
                    this.showNextNotification();
                }
            }, this.config.notificationCycleDelay);
        }

        showNextNotification() {
            if (this.notifications.length === 0) return;

            const notification = this.notifications[this.currentNotificationIndex];
            this.displayNotification(notification);

            this.currentNotificationIndex = 
                (this.currentNotificationIndex + 1) % this.notifications.length;
        }

        displayNotification(notification) {
            const island = document.getElementById(this.config.islandContainerId);
            const icon = document.getElementById('qmfIslandIcon');
            const text = document.getElementById('qmfIslandText');
            const title = document.getElementById('qmfIslandTitle');
            const message = document.getElementById('qmfIslandMessage');

            if (!island || !icon || !text || !title || !message) return;

            // Clear existing auto-hide timer
            if (this.autoHideTimer) {
                clearTimeout(this.autoHideTimer);
            }

            // Update compact view
            icon.innerHTML = `<i class="${notification.icon}"></i>`;
            icon.style.background = notification.color;
            text.textContent = notification.title;

            // Update expanded view
            title.innerHTML = `<i class="${notification.icon}"></i>${notification.title}`;
            message.textContent = notification.message;

            // Apply priority styling
            island.className = `qmf-dynamic-island priority-${notification.priority || 'medium'}`;

            // Show island
            this.showIsland();

            // Auto-hide after delay
            this.autoHideTimer = setTimeout(() => {
                if (!this.islandExpanded) {
                    this.hideIsland();
                }
            }, this.config.autoHideDelay);
        }

        showIsland() {
            const island = document.getElementById(this.config.islandContainerId);
            if (island) {
                island.classList.add('active');
            }
        }

        hideIsland() {
            const island = document.getElementById(this.config.islandContainerId);
            if (island) {
                island.classList.remove('active', 'expanded');
                this.islandExpanded = false;
            }
        }

        expandIsland() {
            const island = document.getElementById(this.config.islandContainerId);
            const compact = island?.querySelector('.qmf-island-compact');
            const expand = island?.querySelector('.qmf-island-expand');

            if (island && compact && expand) {
                island.classList.add('expanded');
                compact.classList.add('hidden');
                expand.classList.add('active');
                this.islandExpanded = true;

                // Clear auto-hide timer when expanded
                if (this.autoHideTimer) {
                    clearTimeout(this.autoHideTimer);
                }

                if (typeof this.config.onNotificationClick === 'function') {
                    this.config.onNotificationClick(this.notifications[this.currentNotificationIndex]);
                }
            }
        }

        closeIsland() {
            const island = document.getElementById(this.config.islandContainerId);
            const compact = island?.querySelector('.qmf-island-compact');
            const expand = island?.querySelector('.qmf-island-expand');

            if (island && compact && expand) {
                island.classList.remove('expanded');
                compact.classList.remove('hidden');
                expand.classList.remove('active');
                this.islandExpanded = false;

                // Set auto-hide timer
                if (this.autoHideTimer) {
                    clearTimeout(this.autoHideTimer);
                }
                this.autoHideTimer = setTimeout(() => {
                    this.hideIsland();
                }, this.config.autoHideDelay);

                if (typeof this.config.onNotificationClose === 'function') {
                    this.config.onNotificationClose();
                }
            }
        }

        // ==========================================
        // PUBLIC API METHODS
        // ==========================================

        /**
         * Add a new notification dynamically
         */
        addNotification(notification) {
            const newNotification = {
                id: Date.now(),
                type: notification.type || 'general',
                title: notification.title,
                message: notification.message,
                icon: notification.icon || 'fas fa-bell',
                color: notification.color || '#00d4ff',
                priority: notification.priority || 'medium'
            };

            this.notifications.unshift(newNotification);
            
            // Display immediately
            this.displayNotification(newNotification);
            
            return newNotification;
        }

        /**
         * Add a new tool to the banner
         */
        addTool(tool) {
            const newTool = {
                title: tool.title,
                description: tool.description,
                icon: tool.icon || 'fas fa-star',
                url: tool.url || '#',
                color: tool.color || '#667eea'
            };

            this.tools.push(newTool);
            this.renderTools();
            
            return newTool;
        }

        /**
         * Show a custom notification immediately
         */
        showNotification(title, message, options = {}) {
            return this.addNotification({
                title,
                message,
                ...options
            });
        }

        /**
         * Hide all components
         */
        hide() {
            const banner = document.getElementById(this.config.bannerContainerId);
            const island = document.getElementById(this.config.islandContainerId);
            
            if (banner) banner.style.display = 'none';
            if (island) this.hideIsland();
        }

        /**
         * Show all components
         */
        show() {
            const banner = document.getElementById(this.config.bannerContainerId);
            
            if (banner) banner.style.display = 'block';
            if (this.notifications.length > 0) {
                this.showNextNotification();
            }
        }

        /**
         * Update configuration
         */
        setConfig(newConfig) {
            this.config = { ...this.config, ...newConfig };
        }

        /**
         * Destroy instance
         */
        destroy() {
            // Clear timers
            if (this.notificationTimer) {
                clearInterval(this.notificationTimer);
            }
            if (this.autoHideTimer) {
                clearTimeout(this.autoHideTimer);
            }

            // Remove DOM elements
            const banner = document.getElementById(this.config.bannerContainerId);
            const island = document.getElementById(this.config.islandContainerId);
            
            if (banner) banner.remove();
            if (island) island.remove();

            this.initialized = false;
        }
    }

    // Export to global scope
    global.QMFDynamicFeatures = QMFDynamicFeatures;

    // Auto-init helper
    global.initQMFDynamicFeatures = function(config) {
        return new QMFDynamicFeatures(config);
    };

})(typeof window !== 'undefined' ? window : this);