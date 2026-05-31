/**
 * QMF Event Bus - Pub/Sub messaging system
 * @version 1.0.0
 * @module kernel/event-bus
 */

class EventBus {
    constructor() {
        this.listeners = new Map();
        this.onceListeners = new Map();
        this.wildcardListeners = [];
        this.history = [];
        this.maxHistorySize = 100;
        this.debug = false;
    }

    /**
     * Đăng ký listener cho event
     * @param {string} event - Tên event (hỗ trợ wildcard: 'user:*')
     * @param {Function} callback - Callback function
     * @param {Object} options - Tùy chọn: { priority, context }
     */
    on(event, callback, options = {}) {
        if (typeof callback !== 'function') {
            throw new Error('Callback must be a function');
        }

        const listener = {
            callback,
            priority: options.priority || 0,
            context: options.context || null
        };

        // Wildcard support
        if (event.includes('*')) {
            const pattern = new RegExp('^' + event.replace('*', '.*') + '$');
            this.wildcardListeners.push({ pattern, listener, originalEvent: event });
            return () => this._removeWildcard(event, callback);
        }

        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }

        const listeners = this.listeners.get(event);
        listeners.push(listener);

        // Sort by priority (higher first)
        listeners.sort((a, b) => b.priority - a.priority);

        this._log(`Subscribed to: ${event}`);

        // Return unsubscribe function
        return () => this.off(event, callback);
    }

    /**
     * Đăng ký listener chỉ chạy một lần
     */
    once(event, callback, options = {}) {
        const wrapper = (...args) => {
            this.off(event, wrapper);
            return callback.apply(options.context || null, args);
        };

        return this.on(event, wrapper, options);
    }

    /**
     * Hủy đăng ký listener
     */
    off(event, callback) {
        if (!this.listeners.has(event)) return;

        const listeners = this.listeners.get(event);
        const index = listeners.findIndex(l => l.callback === callback);

        if (index > -1) {
            listeners.splice(index, 1);
            this._log(`Unsubscribed from: ${event}`);
        }

        if (listeners.length === 0) {
            this.listeners.delete(event);
        }
    }

    /**
     * Emit event với data
     * @param {string} event - Tên event
     * @param {any} data - Dữ liệu truyền đi
     * @param {Object} meta - Metadata bổ sung
     */
    emit(event, data = null, meta = {}) {
        const eventData = {
            event,
            data,
            meta: {
                timestamp: Date.now(),
                source: meta.source || 'unknown',
                ...meta
            }
        };

        this._addToHistory(eventData);
        this._log(`Emitting: ${event}`, data);

        let handlerCount = 0;

        // Regular listeners
        if (this.listeners.has(event)) {
            const listeners = this.listeners.get(event);
            for (const listener of listeners) {
                try {
                    listener.callback.call(listener.context, data, eventData);
                    handlerCount++;
                } catch (error) {
                    console.error(`[EventBus] Error in listener for ${event}:`, error);
                }
            }
        }

        // Wildcard listeners
        for (const { pattern, listener } of this.wildcardListeners) {
            if (pattern.test(event)) {
                try {
                    listener.callback.call(listener.context, data, eventData);
                    handlerCount++;
                } catch (error) {
                    console.error(`[EventBus] Error in wildcard listener for ${event}:`, error);
                }
            }
        }

        return handlerCount;
    }

    /**
     * Emit async - chờ tất cả handlers hoàn thành
     */
    async emitAsync(event, data = null, meta = {}) {
        const eventData = {
            event,
            data,
            meta: {
                timestamp: Date.now(),
                source: meta.source || 'unknown',
                ...meta
            }
        };

        this._addToHistory(eventData);
        const promises = [];

        if (this.listeners.has(event)) {
            const listeners = this.listeners.get(event);
            for (const listener of listeners) {
                promises.push(
                    Promise.resolve().then(() => 
                        listener.callback.call(listener.context, data, eventData)
                    )
                );
            }
        }

        for (const { pattern, listener } of this.wildcardListeners) {
            if (pattern.test(event)) {
                promises.push(
                    Promise.resolve().then(() => 
                        listener.callback.call(listener.context, data, eventData)
                    )
                );
            }
        }

        await Promise.all(promises);
        return promises.length;
    }

    /**
     * Kiểm tra có listener cho event không
     */
    hasListeners(event) {
        if (this.listeners.has(event) && this.listeners.get(event).length > 0) {
            return true;
        }

        for (const { pattern } of this.wildcardListeners) {
            if (pattern.test(event)) return true;
        }

        return false;
    }

    /**
     * Lấy danh sách events đang được subscribe
     */
    getEvents() {
        return Array.from(this.listeners.keys());
    }

    /**
     * Lấy lịch sử events
     */
    getHistory(filter = null) {
        if (!filter) return [...this.history];

        return this.history.filter(item => {
            if (typeof filter === 'string') {
                return item.event.includes(filter);
            }
            if (filter instanceof RegExp) {
                return filter.test(item.event);
            }
            return true;
        });
    }

    /**
     * Xóa tất cả listeners
     */
    clear() {
        this.listeners.clear();
        this.onceListeners.clear();
        this.wildcardListeners = [];
        this.history = [];
    }

    /**
     * Xóa listeners cho một event
     */
    clearEvent(event) {
        this.listeners.delete(event);
    }

    /**
     * Tạo namespaced event bus
     */
    namespace(ns) {
        const bus = this;
        return {
            on: (event, cb, opts) => bus.on(`${ns}:${event}`, cb, opts),
            off: (event, cb) => bus.off(`${ns}:${event}`, cb),
            once: (event, cb, opts) => bus.once(`${ns}:${event}`, cb, opts),
            emit: (event, data, meta) => bus.emit(`${ns}:${event}`, data, { ...meta, namespace: ns }),
            emitAsync: (event, data, meta) => bus.emitAsync(`${ns}:${event}`, data, { ...meta, namespace: ns })
        };
    }

    _addToHistory(eventData) {
        this.history.push(eventData);
        if (this.history.length > this.maxHistorySize) {
            this.history.shift();
        }
    }

    _removeWildcard(event, callback) {
        const index = this.wildcardListeners.findIndex(
            w => w.originalEvent === event && w.listener.callback === callback
        );
        if (index > -1) {
            this.wildcardListeners.splice(index, 1);
        }
    }

    _log(message, data = null) {
        if (this.debug) {
            console.log(`[EventBus] ${message}`, data);
        }
    }
}

// Singleton export
const eventBus = new EventBus();
export default eventBus;
export { EventBus, eventBus };
