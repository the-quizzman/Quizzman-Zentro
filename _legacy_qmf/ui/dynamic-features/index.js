/**
 * QMF Dynamic Features Module
 * Version: 1.0.0
 * A configurable framework for dynamic banners, islands, and notifications
 * 
 * Usage:
 * import { QMFDynamicFeatures } from 'https://ui.quizzman.com/qmf/ui/dynamic-features/index.js';
 * 
 * const features = new QMFDynamicFeatures({
 *   banner: { enabled: true, items: [...] },
 *   island: { enabled: true, notifications: [...] },
 *   categories: { enabled: true, items: [...] }
 * });
 */

export class QMFDynamicFeatures {
  constructor(config = {}) {
    this.config = this.mergeConfig(config);
    this.state = {
      currentNotificationIndex: 0,
      currentBannerIndex: 0,
      islandExpanded: false,
      notificationTimer: null,
      autoHideTimer: null,
      bannerTimer: null
    };
    
    this.init();
  }

  mergeConfig(config) {
    const defaults = {
      banner: {
        enabled: true,
        containerId: 'qmf-featured-banner',
        items: [],
        animationDuration: 8000,
        autoPlay: true,
        showNavigation: true
      },
      island: {
        enabled: true,
        containerId: 'qmf-dynamic-island',
        notifications: [],
        displayDuration: 5000,
        autoHide: true,
        position: 'top-center'
      },
      categories: {
        enabled: true,
        containerId: 'qmf-categories',
        items: [],
        style: 'pills',
        iconType: 'fontawesome'
      },
      icons: {
        'book': 'fas fa-book',
        'education': 'fas fa-graduation-cap',
        'code': 'fas fa-code',
        'tech': 'fas fa-microchip',
        'language': 'fas fa-language',
        'chinese': 'fas fa-yin-yang',
        'tools': 'fas fa-tools',
        'game': 'fas fa-gamepad',
        'star': 'fas fa-star',
        'bell': 'fas fa-bell',
        'info': 'fas fa-info-circle',
        'idiom': 'fas fa-quote-left',
        'hsk': 'fas fa-certificate',
        'hanzi': 'fas fa-font',
        'basic': 'fas fa-spell-check'
      },
      onBannerClick: null,
      onNotificationClick: null,
      onCategoryClick: null,
      onConfigLoad: null
    };
    
    return this.deepMerge(defaults, config);
  }

  deepMerge(target, source) {
    const result = { ...target };
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(target[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    return result;
  }

  async init() {
    try {
      if (this.config.configUrl) {
        await this.loadRemoteConfig();
      }
      
      if (this.config.banner.enabled) this.initBanner();
      if (this.config.island.enabled) this.initIsland();
      if (this.config.categories.enabled) this.initCategories();
      
      if (typeof this.config.onConfigLoad === 'function') {
        this.config.onConfigLoad(this.config);
      }
      
      console.log('[QMF DynamicFeatures] Initialized');
    } catch (error) {
      console.error('[QMF DynamicFeatures] Init error:', error);
    }
  }

  async loadRemoteConfig() {
    try {
      const response = await fetch(this.config.configUrl);
      if (response.ok) {
        const data = await response.json();
        this.config = this.mergeConfig(data);
      }
    } catch (error) {
      console.warn('[QMF DynamicFeatures] Failed to load remote config:', error);
    }
  }

  // Banner Methods
  initBanner() {
    let container = document.getElementById(this.config.banner.containerId);
    if (!container) return;
    this.renderBanner(container);
  }

  renderBanner(container) {
    const items = this.config.banner.items;
    if (!items || items.length === 0) return;
    
    container.innerHTML = `
      <div class="qmf-banner__track">
        ${items.map((item, i) => this.renderBannerItem(item, i)).join('')}
      </div>
      ${this.config.banner.showNavigation ? `
        <button class="qmf-banner__nav qmf-banner__nav--prev"><i class="fas fa-chevron-left"></i></button>
        <button class="qmf-banner__nav qmf-banner__nav--next"><i class="fas fa-chevron-right"></i></button>
        <div class="qmf-banner__dots">
          ${items.map((_, i) => `<button class="qmf-banner__dot ${i === 0 ? 'active' : ''}" data-index="${i}"></button>`).join('')}
        </div>
      ` : ''}
    `;
    
    this.attachBannerEvents(container);
    if (this.config.banner.autoPlay && items.length > 1) {
      this.startBannerAutoPlay();
    }
  }

  renderBannerItem(item, index) {
    return `
      <a href="${item.url || '#'}" class="qmf-banner__item ${index === 0 ? 'active' : ''}" 
         data-index="${index}" style="--item-color: ${item.color || '#667eea'}">
        <div class="qmf-banner__item-bg" style="background-image: url('${item.image || ''}')"></div>
        <div class="qmf-banner__item-content">
          <div class="qmf-banner__item-icon">${this.getIconHtml(item.icon, item.color)}</div>
          <div class="qmf-banner__item-info">
            <h3 class="qmf-banner__item-title">${item.title}</h3>
            <p class="qmf-banner__item-desc">${item.description || ''}</p>
          </div>
        </div>
      </a>
    `;
  }

  attachBannerEvents(container) {
    const prevBtn = container.querySelector('.qmf-banner__nav--prev');
    const nextBtn = container.querySelector('.qmf-banner__nav--next');
    const dots = container.querySelectorAll('.qmf-banner__dot');
    
    if (prevBtn) prevBtn.addEventListener('click', () => this.navigateBanner('prev'));
    if (nextBtn) nextBtn.addEventListener('click', () => this.navigateBanner('next'));
    dots.forEach(dot => {
      dot.addEventListener('click', () => this.goToBannerSlide(parseInt(dot.dataset.index)));
    });
  }

  navigateBanner(direction) {
    const total = this.config.banner.items.length;
    if (direction === 'next') {
      this.state.currentBannerIndex = (this.state.currentBannerIndex + 1) % total;
    } else {
      this.state.currentBannerIndex = (this.state.currentBannerIndex - 1 + total) % total;
    }
    this.goToBannerSlide(this.state.currentBannerIndex);
  }

  goToBannerSlide(index) {
    this.state.currentBannerIndex = index;
    const container = document.getElementById(this.config.banner.containerId);
    if (!container) return;
    
    container.querySelectorAll('.qmf-banner__item').forEach((item, i) => {
      item.classList.toggle('active', i === index);
    });
    container.querySelectorAll('.qmf-banner__dot').forEach((dot, i) => {
      dot.classList.toggle('active', i === index);
    });
    
    if (this.config.banner.autoPlay) this.startBannerAutoPlay();
  }

  startBannerAutoPlay() {
    if (this.state.bannerTimer) clearInterval(this.state.bannerTimer);
    this.state.bannerTimer = setInterval(() => {
      this.navigateBanner('next');
    }, this.config.banner.animationDuration);
  }

  // Island Methods
  initIsland() {
    let container = document.getElementById(this.config.island.containerId);
    if (!container) {
      container = document.createElement('div');
      container.id = this.config.island.containerId;
      container.className = `qmf-dynamic-island qmf-island--${this.config.island.position}`;
      document.body.appendChild(container);
    }
    this.renderIsland(container);
    if (this.config.island.notifications.length > 0) {
      this.startNotificationCycle();
    }
  }

  renderIsland(container) {
    container.innerHTML = `
      <div class="qmf-island__compact" id="qmf-island-compact">
        <div class="qmf-island__icon" id="qmf-island-icon"><i class="fas fa-bell"></i></div>
        <span class="qmf-island__text" id="qmf-island-text">Thông báo</span>
      </div>
      <div class="qmf-island__expanded" id="qmf-island-expanded">
        <div class="qmf-island__header">
          <h4 class="qmf-island__title" id="qmf-island-title">Thông báo</h4>
          <button class="qmf-island__close" id="qmf-island-close"><i class="fas fa-times"></i></button>
        </div>
        <p class="qmf-island__message" id="qmf-island-message"></p>
      </div>
    `;
    
    container.querySelector('#qmf-island-compact').addEventListener('click', () => this.expandIsland());
    container.querySelector('#qmf-island-close').addEventListener('click', () => this.closeIsland());
  }

  showNotification(notification) {
    const container = document.getElementById(this.config.island.containerId);
    if (!container) return;
    
    const icon = container.querySelector('#qmf-island-icon');
    const text = container.querySelector('#qmf-island-text');
    const title = container.querySelector('#qmf-island-title');
    const message = container.querySelector('#qmf-island-message');
    
    icon.innerHTML = this.getIconHtml(notification.icon || 'bell', notification.color);
    icon.style.background = notification.color || '#667eea';
    text.textContent = notification.title;
    title.innerHTML = `${this.getIconHtml(notification.icon || 'bell', '#fff')} ${notification.title}`;
    message.textContent = notification.message;
    
    container.className = `qmf-dynamic-island qmf-island--${this.config.island.position} qmf-island--${notification.priority || 'medium'} active`;
    
    if (this.state.autoHideTimer) clearTimeout(this.state.autoHideTimer);
    if (this.config.island.autoHide && !this.state.islandExpanded) {
      this.state.autoHideTimer = setTimeout(() => this.hideIsland(), this.config.island.displayDuration);
    }
  }

  startNotificationCycle() {
    const notifications = this.config.island.notifications;
    if (notifications.length === 0) return;
    
    this.showNotification(notifications[this.state.currentNotificationIndex]);
    
    this.state.notificationTimer = setInterval(() => {
      if (!this.state.islandExpanded) {
        this.state.currentNotificationIndex = (this.state.currentNotificationIndex + 1) % notifications.length;
        this.showNotification(notifications[this.state.currentNotificationIndex]);
      }
    }, this.config.island.displayDuration + 2000);
  }

  expandIsland() {
    const container = document.getElementById(this.config.island.containerId);
    if (container) {
      container.classList.add('expanded');
      this.state.islandExpanded = true;
      if (this.state.autoHideTimer) clearTimeout(this.state.autoHideTimer);
    }
  }

  closeIsland() {
    const container = document.getElementById(this.config.island.containerId);
    if (container) {
      container.classList.remove('expanded');
      this.state.islandExpanded = false;
      if (this.config.island.autoHide) {
        this.state.autoHideTimer = setTimeout(() => this.hideIsland(), this.config.island.displayDuration);
      }
    }
  }

  hideIsland() {
    const container = document.getElementById(this.config.island.containerId);
    if (container) {
      container.classList.remove('active', 'expanded');
      this.state.islandExpanded = false;
    }
  }

  // Categories Methods
  initCategories() {
    const container = document.getElementById(this.config.categories.containerId);
    if (!container) return;
    this.renderCategories(container);
  }

  renderCategories(container) {
    const items = this.config.categories.items;
    const style = this.config.categories.style;
    
    container.className = `qmf-categories qmf-categories--${style}`;
    container.innerHTML = `
      <div class="qmf-categories__grid">
        ${items.map(item => this.renderCategoryItem(item, style)).join('')}
      </div>
    `;
  }

  renderCategoryItem(item, style) {
    const iconHtml = this.getIconHtml(item.icon, item.color);
    
    if (style === 'banner') {
      return `
        <a href="${item.url || '#'}" class="qmf-category qmf-category--banner" style="--cat-color: ${item.color || '#667eea'}">
          <div class="qmf-category__bg"></div>
          <div class="qmf-category__icon">${iconHtml}</div>
          <div class="qmf-category__info">
            <h3 class="qmf-category__name">${item.name}</h3>
            <span class="qmf-category__count">${item.count || 0} bài viết</span>
          </div>
        </a>
      `;
    }
    
    if (style === 'cards') {
      return `
        <a href="${item.url || '#'}" class="qmf-category qmf-category--card" style="--cat-color: ${item.color || '#667eea'}">
          <div class="qmf-category__icon">${iconHtml}</div>
          <h3 class="qmf-category__name">${item.name}</h3>
          <span class="qmf-category__count">${item.count || 0}</span>
        </a>
      `;
    }
    
    return `
      <a href="${item.url || '#'}" class="qmf-category qmf-category--pill" style="--cat-color: ${item.color || '#667eea'}">
        <span class="qmf-category__icon">${iconHtml}</span>
        <span class="qmf-category__name">${item.name}</span>
        <span class="qmf-category__count">(${item.count || 0})</span>
      </a>
    `;
  }

  getIconHtml(iconKey, color = '#667eea') {
    if (iconKey && iconKey.startsWith('fa')) {
      return `<i class="${iconKey}" style="color: ${color}"></i>`;
    }
    const iconClass = this.config.icons[iconKey] || this.config.icons.bell;
    return `<i class="${iconClass}" style="color: ${color}"></i>`;
  }

  // Public API
  addNotification(notification) {
    this.config.island.notifications.push(notification);
    this.showNotification(notification);
  }

  updateBanner(items) {
    this.config.banner.items = items;
    this.initBanner();
  }

  updateCategories(items) {
    this.config.categories.items = items;
    this.initCategories();
  }

  destroy() {
    if (this.state.notificationTimer) clearInterval(this.state.notificationTimer);
    if (this.state.bannerTimer) clearInterval(this.state.bannerTimer);
    if (this.state.autoHideTimer) clearTimeout(this.state.autoHideTimer);
  }
}

export default QMFDynamicFeatures;
window.QMFDynamicFeatures = QMFDynamicFeatures;
