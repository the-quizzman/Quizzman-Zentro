/**
 * QMF Plugins - Entry Point
 * UI plugins initialization
 * @version 2.0.0
 */

import { eventBus } from '../kernel/event-bus.js';

// Lazy imports for code splitting
let headerPlugin = null;
let chatPlugin = null;
let notiPlugin = null;

/**
 * Initialize UI plugins based on config
 */
export async function initUI(config = {}) {
    const container = config.container || document.body;
    
    // Header
    if (config.header !== false) {
        const { QMFHeader } = await import('./header/header.js');
        headerPlugin = new QMFHeader();
        await headerPlugin.init({ container });
    }
    
    // Chat panel
    if (config.chat) {
        const { default: ChatPanel } = await import('./chat/chat-panel.js');
        chatPlugin = new ChatPanel();
        await chatPlugin.init({ container });
    }
    
    // Notification panel
    if (config.notifications) {
        const { default: NotificationPanel } = await import('./notification/notification-panel.js');
        notiPlugin = new NotificationPanel();
        await notiPlugin.init({ container });
    }
    
    eventBus.emit('ui:initialized');
    
    return {
        header: headerPlugin,
        chat: chatPlugin,
        notification: notiPlugin
    };
}

/**
 * Get plugin instance
 */
export function getUIPlugin(name) {
    switch (name) {
        case 'header': return headerPlugin;
        case 'chat': 
        case 'chat-panel': return chatPlugin;
        case 'notification': 
        case 'notification-panel': return notiPlugin;
        default: 
            return customPlugins.get(name) || null;
    }
}

// Custom plugins registry
const customPlugins = new Map();

/**
 * Register a custom UI plugin
 */
export function registerUIPlugin(name, plugin) {
    if (customPlugins.has(name)) {
        console.warn(`[QMF] Plugin '${name}' already registered`);
        return;
    }
    customPlugins.set(name, plugin);
    eventBus.emit('ui:plugin-registered', { name });
}

/**
 * Destroy all UI plugins
 */
export function destroyUI() {
    [headerPlugin, chatPlugin, notiPlugin].forEach(plugin => {
        if (plugin && typeof plugin.destroy === 'function') {
            plugin.destroy();
        }
    });
    
    headerPlugin = null;
    chatPlugin = null;
    notiPlugin = null;
}

export default { initUI, getUIPlugin, registerUIPlugin, destroyUI };
