/**
 * QMF Services Index
 * Export all services
 * @version 1.0.0
 */

export { realtimeService, ConnectionState } from './realtime/index.js';
export { authService, AuthState } from './auth/index.js';
export { chatService } from './chat/index.js';
export { notificationService, NotificationPriority, NotificationCategory } from './notification/index.js';

/**
 * Initialize all services
 * @param {Object} config
 */
export async function initServices(config = {}) {
    const { authService } = await import('./auth/index.js');
    const { realtimeService } = await import('./realtime/index.js');
    const { chatService } = await import('./chat/index.js');
    const { notificationService } = await import('./notification/index.js');
    
    // Initialize auth first
    authService.init({
        idSysUrl: config.idSysUrl || 'https://id.quizzman.com',
        loginUrl: config.loginUrl || 'https://id.quizzman.com/login',
        ...config.auth
    });
    
    // Initialize realtime
    await realtimeService.init({
        chatUrl: config.chatUrl || 'https://chat.quizzman.com',
        notiUrl: config.notiUrl || 'https://noti.quizzman.com',
        getToken: () => authService.getToken(),
        ...config.realtime
    });
    
    // Initialize chat & notifications only if authenticated
    if (authService.isAuthenticated()) {
        await Promise.all([
            chatService.init({
                chatUrl: config.chatUrl || 'https://chat.quizzman.com',
                ...config.chat
            }),
            notificationService.init({
                notiUrl: config.notiUrl || 'https://noti.quizzman.com',
                ...config.notification
            })
        ]);
    }
    
    return {
        auth: authService,
        realtime: realtimeService,
        chat: chatService,
        notification: notificationService
    };
}

export default {
    initServices
};
