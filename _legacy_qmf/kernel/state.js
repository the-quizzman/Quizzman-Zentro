/**
 * QMF State Manager
 * Centralized state management with persistence
 * @version 2.0.0
 */

import { eventBus } from './event-bus.js';

class StateManager {
    constructor() {
        this.state = {};
        this.persistKeys = [];
        this.storageKey = 'qmf_state';
    }
    
    /**
     * Initialize state manager
     */
    init(options = {}) {
        this.persistKeys = options.persist || [];
        
        // Restore persisted state
        this.restore();
        
        eventBus.emit('state:initialized');
    }
    
    /**
     * Get state value
     */
    get(path) {
        if (!path) return this.state;
        
        return path.split('.').reduce((obj, key) => obj?.[key], this.state);
    }
    
    /**
     * Set state value
     */
    set(path, value) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        
        let target = this.state;
        for (const key of keys) {
            if (!target[key]) target[key] = {};
            target = target[key];
        }
        
        const oldValue = target[lastKey];
        target[lastKey] = value;
        
        // Persist if needed
        const rootKey = keys[0] || lastKey;
        if (this.persistKeys.includes(rootKey)) {
            this.persist();
        }
        
        // Emit change event
        eventBus.emit(`state:${path}`, { value, oldValue });
        eventBus.emit('state:changed', { path, value, oldValue });
    }
    
    /**
     * Update state partially
     */
    update(path, updates) {
        const current = this.get(path) || {};
        this.set(path, { ...current, ...updates });
    }
    
    /**
     * Delete state value
     */
    delete(path) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        
        let target = this.state;
        for (const key of keys) {
            if (!target[key]) return;
            target = target[key];
        }
        
        delete target[lastKey];
        
        // Persist if needed
        const rootKey = keys[0] || lastKey;
        if (this.persistKeys.includes(rootKey)) {
            this.persist();
        }
        
        eventBus.emit('state:changed', { path, deleted: true });
    }
    
    /**
     * Persist state to localStorage
     */
    persist() {
        try {
            const toPersist = {};
            for (const key of this.persistKeys) {
                if (this.state[key] !== undefined) {
                    toPersist[key] = this.state[key];
                }
            }
            localStorage.setItem(this.storageKey, JSON.stringify(toPersist));
        } catch (error) {
            console.warn('[StateManager] Failed to persist:', error);
        }
    }
    
    /**
     * Restore state from localStorage
     */
    restore() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                const parsed = JSON.parse(stored);
                for (const key of this.persistKeys) {
                    if (parsed[key] !== undefined) {
                        this.state[key] = parsed[key];
                    }
                }
            }
        } catch (error) {
            console.warn('[StateManager] Failed to restore:', error);
        }
    }
    
    /**
     * Clear all state
     */
    clear() {
        this.state = {};
        localStorage.removeItem(this.storageKey);
        eventBus.emit('state:cleared');
    }
}

export const stateManager = new StateManager();
export default stateManager;
