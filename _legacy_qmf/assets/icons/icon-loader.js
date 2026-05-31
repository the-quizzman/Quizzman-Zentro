/**
 * QMF Icon Loader
 * Dynamic SVG icon loading from Lucide icons
 * @version 1.1.0
 */

// Try optimized SVG folder first, fallback to lucide-source
const ICON_PATHS = [
    '/qmf/assets/icons/svg',
    '/assets/icons/svg',
    '/qmf/assets/icons/lucide-source/icons',
    '/assets/icons/lucide-source/icons'
];

const iconCache = new Map();
const loadingPromises = new Map();
let basePath = null;

/**
 * Get icon SVG content
 * @param {string} name - Icon name (e.g., 'bell', 'message-circle', 'user')
 * @param {Object} options - Icon options
 * @param {number} options.size - Icon size in pixels (default: 24)
 * @param {string} options.color - Icon color (default: 'currentColor')
 * @param {string} options.strokeWidth - Stroke width (default: 2)
 * @param {string} options.class - Additional CSS classes
 * @returns {Promise<string>} SVG element as string
 */
export async function getIcon(name, options = {}) {
    const {
        size = 24,
        color = 'currentColor',
        strokeWidth = 2,
        class: className = ''
    } = options;
    
    const cacheKey = name;
    
    // Return from cache if available
    if (iconCache.has(cacheKey)) {
        return formatIcon(iconCache.get(cacheKey), { size, color, strokeWidth, className });
    }
    
    // If already loading, wait for it
    if (loadingPromises.has(cacheKey)) {
        await loadingPromises.get(cacheKey);
        return formatIcon(iconCache.get(cacheKey), { size, color, strokeWidth, className });
    }
    
    // Load icon
    const loadPromise = loadIcon(name);
    loadingPromises.set(cacheKey, loadPromise);
    
    try {
        const svgContent = await loadPromise;
        iconCache.set(cacheKey, svgContent);
        return formatIcon(svgContent, { size, color, strokeWidth, className });
    } finally {
        loadingPromises.delete(cacheKey);
    }
}

/**
 * Load icon from file (auto-discovers path)
 */
async function loadIcon(name) {
    // Use cached base path if available
    if (basePath) {
        return fetchIcon(`${basePath}/${name}.svg`, name);
    }
    
    // Try each path until one works
    for (const path of ICON_PATHS) {
        const url = `${path}/${name}.svg`;
        try {
            const response = await fetch(url);
            if (response.ok) {
                basePath = path; // Cache working path
                return await response.text();
            }
        } catch {
            continue;
        }
    }
    
    console.warn(`[QMF Icon] Icon not found: ${name}`);
    return getFallbackIcon();
}

async function fetchIcon(url, name) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            console.warn(`[QMF Icon] Icon not found: ${name}`);
            return getFallbackIcon();
        }
        return await response.text();
    } catch (error) {
        console.error(`[QMF Icon] Failed to load icon: ${name}`, error);
        return getFallbackIcon();
    }
}

/**
 * Format SVG with options
 */
function formatIcon(svgContent, { size, color, strokeWidth, className }) {
    // Parse SVG and modify attributes
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgContent, 'image/svg+xml');
    const svg = doc.querySelector('svg');
    
    if (!svg) return svgContent;
    
    svg.setAttribute('width', size);
    svg.setAttribute('height', size);
    svg.setAttribute('stroke', color);
    svg.setAttribute('stroke-width', strokeWidth);
    svg.setAttribute('fill', 'none');
    
    if (className) {
        svg.setAttribute('class', `qmf-icon ${className}`);
    } else {
        svg.setAttribute('class', 'qmf-icon');
    }
    
    return svg.outerHTML;
}

/**
 * Fallback icon for missing icons
 */
function getFallbackIcon() {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;
}

/**
 * Preload commonly used icons
 */
export async function preloadIcons(iconNames = []) {
    const defaultIcons = [
        'bell', 'message-circle', 'user', 'menu', 'x', 'search',
        'home', 'settings', 'log-out', 'chevron-down', 'chevron-right',
        'check', 'alert-circle', 'info', 'plus', 'minus'
    ];
    
    const allIcons = [...new Set([...defaultIcons, ...iconNames])];
    
    await Promise.all(allIcons.map(name => getIcon(name)));
}

/**
 * Create icon element directly
 */
export function createIconElement(svgContent) {
    const template = document.createElement('template');
    template.innerHTML = svgContent.trim();
    return template.content.firstChild;
}

/**
 * Icon component for rendering
 */
export class QMFIcon extends HTMLElement {
    static get observedAttributes() {
        return ['name', 'size', 'color', 'stroke-width'];
    }
    
    async connectedCallback() {
        await this.render();
    }
    
    async attributeChangedCallback() {
        await this.render();
    }
    
    async render() {
        const name = this.getAttribute('name');
        if (!name) return;
        
        const svg = await getIcon(name, {
            size: parseInt(this.getAttribute('size')) || 24,
            color: this.getAttribute('color') || 'currentColor',
            strokeWidth: parseInt(this.getAttribute('stroke-width')) || 2
        });
        
        this.innerHTML = svg;
    }
}

// Register custom element
if (typeof customElements !== 'undefined' && !customElements.get('qmf-icon')) {
    customElements.define('qmf-icon', QMFIcon);
}

export default {
    getIcon,
    preloadIcons,
    createIconElement,
    QMFIcon
};
