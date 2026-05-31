/**
 * QMF Realtime Service
 * Centralized WebSocket/SSE management for chat, notifications, presence
 * @version 1.0.0
 */

import { eventBus } from '../../kernel/event-bus.js';

/**
 * Connection state
 */
const ConnectionState = {
    DISCONNECTED: 'disconnected',
    CONNECTING: 'connecting',
    CONNECTED: 'connected',
    RECONNECTING: 'reconnecting',
    ERROR: 'error'
};

/**
 * Realtime Service Manager
 */
class RealtimeService {
    constructor() {
        this.connections = new Map(); // namespace -> connection
        this.state = ConnectionState.DISCONNECTED;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 10;
        this.reconnectDelay = 1000;
        this.maxReconnectDelay = 30000;
        this.heartbeatInterval = null;
        this.socketIO = null;
    }
    
    /**
     * Initialize realtime service
     * @param {Object} config
     * @param {string} config.chatUrl - Chat service WebSocket URL
     * @param {string} config.notiUrl - Notification service WebSocket URL
     * @param {Function} config.getToken - Function to get auth token
     */
    async init(config) {
        this.config = {
            chatUrl: config.chatUrl || 'https://chat.quizzman.com',
            notiUrl: config.notiUrl || 'https://noti.quizzman.com',
            getToken: config.getToken || (() => localStorage.getItem('authToken'))
        };
        
        // Load Socket.IO if needed
        await this.loadSocketIO();
        
        eventBus.emit('realtime:initialized');
    }
    
    /**
     * Load Socket.IO client library
     */
    async loadSocketIO() {
        if (typeof io !== 'undefined') {
            this.socketIO = io;
            return;
        }
        
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.socket.io/4.7.5/socket.io.min.js';
            script.onload = () => {
                this.socketIO = window.io;
                resolve();
            };
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }
    
    /**
     * Connect to a namespace
     * @param {string} namespace - 'chat' | 'noti' | 'presence'
     */
    async connect(namespace = 'chat') {
        const token = this.config.getToken();
        if (!token) {
            console.warn('[Realtime] No auth token available');
            eventBus.emit('realtime:auth-required');
            return null;
        }
        
        // Already connected
        if (this.connections.has(namespace)) {
            const existing = this.connections.get(namespace);
            if (existing.connected) return existing;
        }
        
        const urls = {
            chat: this.config.chatUrl,
            noti: this.config.notiUrl,
            presence: this.config.chatUrl // Presence runs on chat server
        };
        
        const url = urls[namespace];
        if (!url) {
            console.error(`[Realtime] Unknown namespace: ${namespace}`);
            return null;
        }
        
        this.state = ConnectionState.CONNECTING;
        eventBus.emit('realtime:connecting', { namespace });
        
        try {
            const socket = this.socketIO(url, {
                auth: { token },
                transports: ['websocket', 'polling'],
                reconnection: true,
                reconnectionDelay: this.reconnectDelay,
                reconnectionDelayMax: this.maxReconnectDelay,
                reconnectionAttempts: this.maxReconnectAttempts,
                timeout: 10000,
                forceNew: true
            });
            
            this.setupSocketHandlers(socket, namespace);
            this.connections.set(namespace, socket);
            
            return socket;
        } catch (error) {
            console.error(`[Realtime] Connection error:`, error);
            this.state = ConnectionState.ERROR;
            eventBus.emit('realtime:error', { namespace, error });
            return null;
        }
    }
    
    /**
     * Setup socket event handlers
     */
    setupSocketHandlers(socket, namespace) {
        socket.on('connect', () => {
            this.state = ConnectionState.CONNECTED;
            this.reconnectAttempts = 0;
            console.log(`[Realtime] Connected to ${namespace}`);
            eventBus.emit('realtime:connected', { namespace, socketId: socket.id });
            this.startHeartbeat(socket, namespace);
        });
        
        socket.on('disconnect', (reason) => {
            this.state = ConnectionState.DISCONNECTED;
            console.log(`[Realtime] Disconnected from ${namespace}: ${reason}`);
            eventBus.emit('realtime:disconnected', { namespace, reason });
            this.stopHeartbeat();
        });
        
        socket.on('connect_error', (error) => {
            this.state = ConnectionState.ERROR;
            console.error(`[Realtime] Connection error on ${namespace}:`, error.message);
            eventBus.emit('realtime:error', { namespace, error: error.message });
        });
        
        socket.on('reconnecting', (attempt) => {
            this.state = ConnectionState.RECONNECTING;
            this.reconnectAttempts = attempt;
            eventBus.emit('realtime:reconnecting', { namespace, attempt });
        });
        
        socket.on('reconnect_failed', () => {
            this.state = ConnectionState.DISCONNECTED;
            eventBus.emit('realtime:reconnect-failed', { namespace });
        });
        
        // Forward all events to eventBus with namespace prefix
        socket.onAny((event, ...args) => {
            eventBus.emit(`${namespace}:${event}`, ...args);
        });
    }
    
    /**
     * Heartbeat to keep connection alive
     */
    startHeartbeat(socket, namespace) {
        this.stopHeartbeat();
        this.heartbeatInterval = setInterval(() => {
            if (socket.connected) {
                socket.emit('heartbeat', { timestamp: Date.now() });
            }
        }, 30000);
    }
    
    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }
    
    /**
     * Get connection for namespace
     */
    getConnection(namespace) {
        return this.connections.get(namespace);
    }
    
    /**
     * Emit event to namespace
     */
    emit(namespace, event, data) {
        const socket = this.connections.get(namespace);
        if (socket && socket.connected) {
            socket.emit(event, data);
            return true;
        }
        console.warn(`[Realtime] Cannot emit to ${namespace}: not connected`);
        return false;
    }
    
    /**
     * Disconnect from namespace
     */
    disconnect(namespace) {
        const socket = this.connections.get(namespace);
        if (socket) {
            socket.disconnect();
            this.connections.delete(namespace);
            eventBus.emit('realtime:disconnected', { namespace, reason: 'manual' });
        }
    }
    
    /**
     * Disconnect all connections
     */
    disconnectAll() {
        for (const [namespace, socket] of this.connections) {
            socket.disconnect();
        }
        this.connections.clear();
        this.stopHeartbeat();
    }
    
    /**
     * Get current state
     */
    getState() {
        return {
            state: this.state,
            connections: Array.from(this.connections.keys()),
            reconnectAttempts: this.reconnectAttempts
        };
    }
    
    /**
     * Check if connected to namespace
     */
    isConnected(namespace) {
        const socket = this.connections.get(namespace);
        return socket && socket.connected;
    }
}

// Singleton instance
export const realtimeService = new RealtimeService();

export { ConnectionState };
export default realtimeService;
