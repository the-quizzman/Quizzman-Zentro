/**
 * QMF Mount - Component mounting system
 * @version 1.0.0
 * @module layout/mount
 */

import eventBus from '../kernel/event-bus.js';
import lifecycle from '../kernel/lifecycle.js';
import moduleLoader from '../kernel/module-loader.js';
import regions from './regions.js';

// Mount point registry
const MOUNT_POINTS = new Map();

class MountManager {
    constructor() {
        this.mountedComponents = new Map();
        this.pendingMounts = new Map();
    }

    /**
     * Đăng ký mount point
     */
    registerPoint(name, element, options = {}) {
        if (!element) {
            throw new Error(`Mount point element is required: ${name}`);
        }

        const mountPoint = {
            name,
            element,
            component: null,
            options: {
                lazy: false,
                preload: false,
                keepAlive: false,
                ...options
            }
        };

        MOUNT_POINTS.set(name, mountPoint);

        eventBus.emit('mount:pointRegistered', { name, element });

        return mountPoint;
    }

    /**
     * Unregister mount point
     */
    unregisterPoint(name) {
        const point = MOUNT_POINTS.get(name);
        if (!point) return;

        // Unmount component if exists
        if (point.component) {
            this.unmount(name);
        }

        MOUNT_POINTS.delete(name);
        eventBus.emit('mount:pointUnregistered', { name });
    }

    /**
     * Mount component vào mount point
     */
    async mount(pointName, component, props = {}) {
        const point = MOUNT_POINTS.get(pointName);
        if (!point) {
            throw new Error(`Mount point not found: ${pointName}`);
        }

        // Check if already mounting
        if (this.pendingMounts.has(pointName)) {
            console.warn(`[Mount] Already mounting to ${pointName}, waiting...`);
            return this.pendingMounts.get(pointName);
        }

        const mountPromise = this._doMount(point, component, props);
        this.pendingMounts.set(pointName, mountPromise);

        try {
            const result = await mountPromise;
            return result;
        } finally {
            this.pendingMounts.delete(pointName);
        }
    }

    /**
     * Internal mount logic
     */
    async _doMount(point, component, props) {
        const { name, element, options } = point;

        // Unmount existing if not keepAlive
        if (point.component && !options.keepAlive) {
            await this.unmount(name);
        }

        eventBus.emit('mount:before', { point: name, component, props });

        try {
            // Load component if string path
            let ComponentClass = component;
            if (typeof component === 'string') {
                const module = await moduleLoader.load(component);
                ComponentClass = module.default || module;
            }

            // Create instance
            let instance;
            if (typeof ComponentClass === 'function') {
                // Class or function component
                if (ComponentClass.prototype && ComponentClass.prototype.constructor) {
                    instance = new ComponentClass(props);
                } else {
                    instance = { render: () => ComponentClass(props) };
                }
            } else if (typeof ComponentClass === 'object') {
                // Already an instance
                instance = ComponentClass;
            } else {
                throw new Error(`Invalid component type for mount point ${name}`);
            }

            // Register with lifecycle
            const componentId = `mount:${name}`;
            lifecycle.register(componentId, instance);

            // Render component
            const rendered = await this._renderComponent(instance, element, props);

            // Mount lifecycle
            await lifecycle.mount(componentId, element);

            // Store reference
            point.component = instance;
            this.mountedComponents.set(name, {
                instance,
                element,
                rendered,
                props,
                mountedAt: Date.now()
            });

            eventBus.emit('mount:complete', { 
                point: name, 
                component: instance,
                element 
            });

            return instance;

        } catch (error) {
            console.error(`[Mount] Failed to mount component at ${name}:`, error);
            eventBus.emit('mount:error', { point: name, error });
            throw error;
        }
    }

    /**
     * Unmount component từ mount point
     */
    async unmount(pointName) {
        const point = MOUNT_POINTS.get(pointName);
        const mounted = this.mountedComponents.get(pointName);

        if (!mounted) return;

        const { instance, element } = mounted;
        const componentId = `mount:${pointName}`;

        eventBus.emit('mount:beforeUnmount', { point: pointName });

        try {
            // Lifecycle unmount
            await lifecycle.unmount(componentId);

            // Call component unmount if exists
            if (typeof instance.unmount === 'function') {
                await instance.unmount();
            }

            // Cleanup if exists
            if (typeof instance.destroy === 'function') {
                await instance.destroy();
            }

            // Clear element content
            element.innerHTML = '';

            // Unregister from lifecycle
            lifecycle.unregister(componentId);

            // Clear references
            if (point) {
                point.component = null;
            }
            this.mountedComponents.delete(pointName);

            eventBus.emit('mount:unmounted', { point: pointName });

        } catch (error) {
            console.error(`[Mount] Error unmounting ${pointName}:`, error);
        }
    }

    /**
     * Remount with new props
     */
    async remount(pointName, newProps = {}) {
        const mounted = this.mountedComponents.get(pointName);
        if (!mounted) {
            throw new Error(`No component mounted at ${pointName}`);
        }

        const { instance, props } = mounted;
        const mergedProps = { ...props, ...newProps };

        // Try update if supported
        if (typeof instance.update === 'function') {
            await lifecycle.update(`mount:${pointName}`, mergedProps);
            mounted.props = mergedProps;
            return instance;
        }

        // Otherwise full remount
        const point = MOUNT_POINTS.get(pointName);
        const ComponentClass = instance.constructor;
        
        await this.unmount(pointName);
        return this.mount(pointName, ComponentClass, mergedProps);
    }

    /**
     * Check if mount point has component
     */
    isMounted(pointName) {
        return this.mountedComponents.has(pointName);
    }

    /**
     * Get mounted component
     */
    getComponent(pointName) {
        const mounted = this.mountedComponents.get(pointName);
        return mounted?.instance || null;
    }

    /**
     * Get all mounted components
     */
    getAllMounted() {
        const result = {};
        for (const [name, data] of this.mountedComponents) {
            result[name] = {
                component: data.instance,
                props: data.props,
                mountedAt: data.mountedAt
            };
        }
        return result;
    }

    /**
     * Lazy mount - mount when element is visible
     */
    lazyMount(pointName, component, props = {}, options = {}) {
        const point = MOUNT_POINTS.get(pointName);
        if (!point) {
            throw new Error(`Mount point not found: ${pointName}`);
        }

        const { rootMargin = '100px', threshold = 0 } = options;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    observer.disconnect();
                    this.mount(pointName, component, props);
                }
            },
            { rootMargin, threshold }
        );

        observer.observe(point.element);

        // Return cancel function
        return () => observer.disconnect();
    }

    /**
     * Render component to element
     */
    async _renderComponent(instance, element, props) {
        if (typeof instance.render !== 'function') {
            console.warn('[Mount] Component has no render method');
            return null;
        }

        const result = await instance.render(element, props);

        // Handle different render return types
        if (typeof result === 'string') {
            element.innerHTML = result;
            return element.firstElementChild;
        }

        if (result instanceof HTMLElement) {
            element.innerHTML = '';
            element.appendChild(result);
            return result;
        }

        // Null means component renders itself
        return element.firstElementChild;
    }

    /**
     * Create portal - mount outside normal hierarchy
     */
    createPortal(component, targetElement, props = {}) {
        const portalId = `portal-${Date.now()}`;
        
        this.registerPoint(portalId, targetElement, { keepAlive: false });
        
        return {
            mount: () => this.mount(portalId, component, props),
            unmount: () => this.unmount(portalId),
            destroy: () => {
                this.unmount(portalId);
                this.unregisterPoint(portalId);
            }
        };
    }

    /**
     * Auto-discover và register mount points từ DOM
     */
    discoverMountPoints(container = document) {
        const elements = container.querySelectorAll('[data-mount]');
        
        elements.forEach(element => {
            const name = element.dataset.mount;
            const lazy = element.dataset.lazy === 'true';
            const preload = element.dataset.preload === 'true';

            this.registerPoint(name, element, { lazy, preload });
        });

        return elements.length;
    }
}

// Singleton export
const mount = new MountManager();
export default mount;
export { MountManager };
