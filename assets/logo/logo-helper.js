/**
 * QMF Logo Helper
 * Unified logo management for Quizzman subsystems
 * @version 1.0.0
 */

const CDN_BASE = 'https://ui.quizzman.com/qmf/assets/logo';
const DEFAULT_LOGO = 'quizzman-logo.png';
const DEFAULT_LOGO_DARK = 'quizzman-logo-dark.png';
const DEFAULT_LOGO_LOADING = 'quizzman-logo-loading.png';
const DEFAULT_FAVICON = 'favicon.ico';

let logoConfig = null;

/**
 * Load logo configuration
 */
async function loadConfig() {
    if (logoConfig) return logoConfig;
    
    try {
        const response = await fetch(`${CDN_BASE}/logo-config.json`);
        logoConfig = await response.json();
        return logoConfig;
    } catch (error) {
        console.warn('[QMF Logo] Failed to load config, using defaults');
        return null;
    }
}

/**
 * Get logo URL for a subsystem
 * @param {string} subsystem - Subsystem name (classroom, lms, play, webmail, id, main, admin, api)
 * @param {Object} options
 * @param {number} options.size - Preferred size (32, 64, 128, 256, 512)
 * @returns {string} Logo URL
 */
export async function getLogoUrl(subsystem, options = {}) {
    const { size } = options;
    const config = await loadConfig();
    
    if (!config) {
        return `${CDN_BASE}/${DEFAULT_LOGO}`;
    }
    
    const subConfig = config.subsystems[subsystem];
    
    // Use default if no custom logo
    if (!subConfig || subConfig.useDefault || !subConfig.hasCustomLogo) {
        return `${CDN_BASE}/${config.default.logo}`;
    }
    
    // Return specific size if requested and available
    if (size && subConfig.sizes && subConfig.sizes[size]) {
        return `${CDN_BASE}/${subConfig.sizes[size]}`;
    }
    
    // Return main logo
    return `${CDN_BASE}/${subConfig.logo}`;
}

/**
 * Get favicon URL for a subsystem
 * @param {string} subsystem - Subsystem name
 * @returns {string} Favicon URL
 */
export async function getFaviconUrl(subsystem) {
    const config = await loadConfig();
    
    if (!config) {
        return `${CDN_BASE}/${DEFAULT_FAVICON}`;
    }
    
    const subConfig = config.subsystems[subsystem];
    
    if (!subConfig || subConfig.useDefault || !subConfig.hasCustomLogo) {
        return `${CDN_BASE}/${config.default.favicon}`;
    }
    
    return `${CDN_BASE}/${subConfig.favicon}`;
}

/**
 * Get dark mode logo URL for a subsystem
 * @param {string} subsystem - Subsystem name
 * @returns {string} Dark logo URL
 */
export async function getDarkLogoUrl(subsystem) {
    const config = await loadConfig();
    
    if (!config) {
        return `${CDN_BASE}/${DEFAULT_LOGO_DARK}`;
    }
    
    const subConfig = config.subsystems[subsystem];
    
    if (!subConfig || subConfig.useDefault || !subConfig.hasCustomLogo) {
        return `${CDN_BASE}/${config.default.logoDark || DEFAULT_LOGO_DARK}`;
    }
    
    return `${CDN_BASE}/${subConfig.logoDark || config.default.logoDark || DEFAULT_LOGO_DARK}`;
}

/**
 * Get loading screen logo URL
 * @returns {string} Loading logo URL
 */
export async function getLoadingLogoUrl() {
    const config = await loadConfig();
    
    if (!config) {
        return `${CDN_BASE}/${DEFAULT_LOGO_LOADING}`;
    }
    
    return `${CDN_BASE}/${config.default.logoLoading || DEFAULT_LOGO_LOADING}`;
}

/**
 * Apply favicon to document
 * @param {string} subsystem - Subsystem name
 */
export async function applyFavicon(subsystem) {
    const faviconUrl = await getFaviconUrl(subsystem);
    
    // Remove existing favicon
    const existing = document.querySelector('link[rel="icon"]');
    if (existing) existing.remove();
    
    // Add new favicon
    const link = document.createElement('link');
    link.rel = 'icon';
    link.type = 'image/x-icon';
    link.href = faviconUrl;
    document.head.appendChild(link);
}

/**
 * Create logo image element
 * @param {string} subsystem - Subsystem name
 * @param {Object} options
 * @param {number} options.size - Size (32, 64, 128, 256, 512)
 * @param {string} options.alt - Alt text
 * @param {string} options.className - CSS class
 * @returns {HTMLImageElement}
 */
export async function createLogoElement(subsystem, options = {}) {
    const { size, alt = 'Logo', className = '' } = options;
    const logoUrl = await getLogoUrl(subsystem, { size });
    
    const img = document.createElement('img');
    img.src = logoUrl;
    img.alt = alt;
    if (className) img.className = className;
    if (size) {
        img.width = size;
        img.height = size;
    }
    
    return img;
}

/**
 * Get logo URLs synchronously (for SSR/initial render)
 * Uses default paths without async config loading
 * @param {string} subsystem
 * @returns {Object} { logo, favicon }
 */
export function getLogoUrlsSync(subsystem) {
    const customSubsystems = ['classroom', 'lms', 'play', 'webmail'];
    
    if (customSubsystems.includes(subsystem)) {
        return {
            logo: `${CDN_BASE}/${subsystem}/${subsystem}-logo.png`,
            logoDark: `${CDN_BASE}/${DEFAULT_LOGO_DARK}`,
            logoLoading: `${CDN_BASE}/${DEFAULT_LOGO_LOADING}`,
            favicon: `${CDN_BASE}/${subsystem}/favicon.ico`
        };
    }
    
    // Default Quizzman logo
    return {
        logo: `${CDN_BASE}/${DEFAULT_LOGO}`,
        logoDark: `${CDN_BASE}/${DEFAULT_LOGO_DARK}`,
        logoLoading: `${CDN_BASE}/${DEFAULT_LOGO_LOADING}`,
        favicon: `${CDN_BASE}/${DEFAULT_FAVICON}`
    };
}

export default {
    getLogoUrl,
    getFaviconUrl,
    getDarkLogoUrl,
    getLoadingLogoUrl,
    applyFavicon,
    createLogoElement,
    getLogoUrlsSync,
    CDN_BASE
};
