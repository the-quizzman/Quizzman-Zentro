/**
 * QMF Lifecycle - Quản lý vòng đời ứng dụng và components
 * @version 1.0.0
 * @module kernel/lifecycle
 */

// Lifecycle phases
const PHASES = {
    CREATED: 'created',
    MOUNTING: 'mounting',
    MOUNTED: 'mounted',
    UPDATING: 'updating',
    UPDATED: 'updated',
    UNMOUNTING: 'unmounting',
    UNMOUNTED: 'unmounted',
    ERROR: 'error'
};

class LifecycleManager {
    constructor() {
        this.components = new Map();
        this.hooks = new Map();
        this.globalHooks = {
            beforeMount: [],
            afterMount: [],
            beforeUnmount: [],
            afterUnmount: [],
            onError: []
        };
    }

    /**
     * Đăng ký component với lifecycle tracking
     */
    register(componentId, component) {
        if (this.components.has(componentId)) {
            console.warn(`[Lifecycle] Component ${componentId} already registered`);
            return;
        }

        const lifecycleState = {
            id: componentId,
            component,
            phase: PHASES.CREATED,
            mountTime: null,
            updateCount: 0,
            lastUpdate: null,
            errors: []
        };

        this.components.set(componentId, lifecycleState);
        this._emitHook(componentId, 'created', lifecycleState);

        return lifecycleState;
    }

    /**
     * Unregister component
     */
    unregister(componentId) {
        if (!this.components.has(componentId)) return;

        const state = this.components.get(componentId);
        this._emitHook(componentId, 'destroyed', state);
        this.components.delete(componentId);
        this.hooks.delete(componentId);
    }

    /**
     * Thực hiện mount component
     */
    async mount(componentId, targetElement) {
        const state = this.components.get(componentId);
        if (!state) {
            throw new Error(`Component ${componentId} not registered`);
        }

        try {
            // Before mount hooks
            state.phase = PHASES.MOUNTING;
            await this._runGlobalHooks('beforeMount', state);
            await this._emitHook(componentId, 'beforeMount', state);

            // Perform mount
            if (typeof state.component.mount === 'function') {
                await state.component.mount(targetElement);
            }

            // After mount
            state.phase = PHASES.MOUNTED;
            state.mountTime = Date.now();
            await this._runGlobalHooks('afterMount', state);
            await this._emitHook(componentId, 'mounted', state);

            return state;
        } catch (error) {
            state.phase = PHASES.ERROR;
            state.errors.push({ error, time: Date.now() });
            await this._handleError(componentId, error);
            throw error;
        }
    }

    /**
     * Thực hiện unmount component
     */
    async unmount(componentId) {
        const state = this.components.get(componentId);
        if (!state || state.phase === PHASES.UNMOUNTED) return;

        try {
            state.phase = PHASES.UNMOUNTING;
            await this._runGlobalHooks('beforeUnmount', state);
            await this._emitHook(componentId, 'beforeUnmount', state);

            // Perform unmount
            if (typeof state.component.unmount === 'function') {
                await state.component.unmount();
            }

            state.phase = PHASES.UNMOUNTED;
            await this._runGlobalHooks('afterUnmount', state);
            await this._emitHook(componentId, 'unmounted', state);

            return state;
        } catch (error) {
            state.phase = PHASES.ERROR;
            await this._handleError(componentId, error);
            throw error;
        }
    }

    /**
     * Trigger update cho component
     */
    async update(componentId, props = {}) {
        const state = this.components.get(componentId);
        if (!state || state.phase !== PHASES.MOUNTED) return;

        try {
            state.phase = PHASES.UPDATING;
            await this._emitHook(componentId, 'beforeUpdate', { state, props });

            if (typeof state.component.update === 'function') {
                await state.component.update(props);
            }

            state.phase = PHASES.UPDATED;
            state.updateCount++;
            state.lastUpdate = Date.now();
            await this._emitHook(componentId, 'updated', state);

            // Return to mounted phase
            state.phase = PHASES.MOUNTED;

            return state;
        } catch (error) {
            state.phase = PHASES.ERROR;
            await this._handleError(componentId, error);
            throw error;
        }
    }

    /**
     * Đăng ký hook cho component
     */
    on(componentId, hookName, callback) {
        if (!this.hooks.has(componentId)) {
            this.hooks.set(componentId, new Map());
        }

        const componentHooks = this.hooks.get(componentId);
        if (!componentHooks.has(hookName)) {
            componentHooks.set(hookName, []);
        }

        componentHooks.get(hookName).push(callback);

        // Return unsubscribe function
        return () => {
            const hooks = componentHooks.get(hookName);
            const index = hooks.indexOf(callback);
            if (index > -1) hooks.splice(index, 1);
        };
    }

    /**
     * Đăng ký global hook
     */
    onGlobal(hookName, callback) {
        if (this.globalHooks[hookName]) {
            this.globalHooks[hookName].push(callback);
        }

        return () => {
            const hooks = this.globalHooks[hookName];
            const index = hooks.indexOf(callback);
            if (index > -1) hooks.splice(index, 1);
        };
    }

    /**
     * Lấy trạng thái component
     */
    getState(componentId) {
        return this.components.get(componentId);
    }

    /**
     * Lấy tất cả components đang mounted
     */
    getMounted() {
        const mounted = [];
        for (const [id, state] of this.components) {
            if (state.phase === PHASES.MOUNTED) {
                mounted.push({ id, state });
            }
        }
        return mounted;
    }

    async _emitHook(componentId, hookName, data) {
        const componentHooks = this.hooks.get(componentId);
        if (!componentHooks) return;

        const hooks = componentHooks.get(hookName);
        if (!hooks) return;

        for (const hook of hooks) {
            await hook(data);
        }
    }

    async _runGlobalHooks(hookName, data) {
        const hooks = this.globalHooks[hookName];
        if (!hooks) return;

        for (const hook of hooks) {
            await hook(data);
        }
    }

    async _handleError(componentId, error) {
        const state = this.components.get(componentId);
        await this._runGlobalHooks('onError', { componentId, error, state });
        await this._emitHook(componentId, 'error', { error, state });
    }
}

// Export phases constants
export { PHASES };

// Singleton export
const lifecycleManager = new LifecycleManager();
export default lifecycleManager;
export { LifecycleManager };
