/**
 * QMF Performance - Performance monitoring & optimization
 * @version 1.0.0
 * @module platform/performance
 */

import eventBus from '../kernel/event-bus.js';

class PerformanceMonitor {
    constructor() {
        this.marks = new Map();
        this.measures = new Map();
        this.metrics = {};
        this._observers = [];
        this._longTaskThreshold = 50; // ms
    }

    /**
     * Khởi động monitoring
     */
    init(options = {}) {
        this._longTaskThreshold = options.longTaskThreshold || 50;

        // Web Vitals
        this._observeWebVitals();

        // Long Tasks
        this._observeLongTasks();

        // Resource Timing
        this._observeResourceTiming();

        return this;
    }

    /**
     * Mark thời điểm
     */
    mark(name) {
        const timestamp = performance.now();
        this.marks.set(name, timestamp);

        if (performance.mark) {
            performance.mark(`qmf:${name}`);
        }

        return timestamp;
    }

    /**
     * Measure khoảng thời gian giữa 2 marks
     */
    measure(name, startMark, endMark = null) {
        const startTime = this.marks.get(startMark);
        const endTime = endMark ? this.marks.get(endMark) : performance.now();

        if (!startTime) {
            console.warn(`[Performance] Mark not found: ${startMark}`);
            return null;
        }

        const duration = endTime - startTime;
        this.measures.set(name, duration);

        if (performance.measure) {
            try {
                performance.measure(`qmf:${name}`, `qmf:${startMark}`, endMark ? `qmf:${endMark}` : undefined);
            } catch (e) {}
        }

        eventBus.emit('performance:measure', { name, duration, startMark, endMark });

        return duration;
    }

    /**
     * Time function execution
     */
    async time(name, fn) {
        const startMark = `${name}:start`;
        const endMark = `${name}:end`;

        this.mark(startMark);

        try {
            const result = await fn();
            this.mark(endMark);
            const duration = this.measure(name, startMark, endMark);

            return { result, duration };
        } catch (error) {
            this.mark(endMark);
            this.measure(name, startMark, endMark);
            throw error;
        }
    }

    /**
     * Lấy Core Web Vitals
     */
    getWebVitals() {
        return {
            lcp: this.metrics.lcp || null,      // Largest Contentful Paint
            fid: this.metrics.fid || null,      // First Input Delay
            cls: this.metrics.cls || null,      // Cumulative Layout Shift
            fcp: this.metrics.fcp || null,      // First Contentful Paint
            ttfb: this.metrics.ttfb || null,    // Time to First Byte
            inp: this.metrics.inp || null       // Interaction to Next Paint
        };
    }

    /**
     * Lấy Navigation Timing
     */
    getNavigationTiming() {
        const nav = performance.getEntriesByType('navigation')[0];
        if (!nav) return null;

        return {
            dns: nav.domainLookupEnd - nav.domainLookupStart,
            tcp: nav.connectEnd - nav.connectStart,
            ssl: nav.secureConnectionStart > 0 
                ? nav.connectEnd - nav.secureConnectionStart 
                : 0,
            ttfb: nav.responseStart - nav.requestStart,
            download: nav.responseEnd - nav.responseStart,
            domParse: nav.domContentLoadedEventEnd - nav.responseEnd,
            domReady: nav.domContentLoadedEventEnd - nav.navigationStart,
            load: nav.loadEventEnd - nav.navigationStart,
            interactive: nav.domInteractive - nav.navigationStart
        };
    }

    /**
     * Lấy Resource Timing cho tất cả resources
     */
    getResourceTiming(filter = null) {
        const resources = performance.getEntriesByType('resource');

        return resources
            .filter(r => !filter || r.name.includes(filter))
            .map(r => ({
                name: r.name,
                type: r.initiatorType,
                duration: r.duration,
                size: r.transferSize || 0,
                cached: r.transferSize === 0 && r.decodedBodySize > 0,
                startTime: r.startTime
            }));
    }

    /**
     * Lấy Memory Usage (Chrome only)
     */
    getMemoryUsage() {
        if (!performance.memory) return null;

        return {
            usedJSHeapSize: performance.memory.usedJSHeapSize,
            totalJSHeapSize: performance.memory.totalJSHeapSize,
            jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
            usedPercentage: (performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit) * 100
        };
    }

    /**
     * Lấy Frame Rate
     */
    measureFrameRate(duration = 1000) {
        return new Promise(resolve => {
            let frameCount = 0;
            let startTime = performance.now();

            const countFrame = () => {
                frameCount++;
                if (performance.now() - startTime < duration) {
                    requestAnimationFrame(countFrame);
                } else {
                    const fps = (frameCount / duration) * 1000;
                    resolve(Math.round(fps));
                }
            };

            requestAnimationFrame(countFrame);
        });
    }

    /**
     * Observe Web Vitals
     */
    _observeWebVitals() {
        // LCP - Largest Contentful Paint
        if ('PerformanceObserver' in window) {
            try {
                const lcpObserver = new PerformanceObserver((list) => {
                    const entries = list.getEntries();
                    const lastEntry = entries[entries.length - 1];
                    this.metrics.lcp = lastEntry.startTime;
                    eventBus.emit('performance:lcp', this.metrics.lcp);
                });
                lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
                this._observers.push(lcpObserver);
            } catch (e) {}

            // FID - First Input Delay
            try {
                const fidObserver = new PerformanceObserver((list) => {
                    const entries = list.getEntries();
                    const firstEntry = entries[0];
                    this.metrics.fid = firstEntry.processingStart - firstEntry.startTime;
                    eventBus.emit('performance:fid', this.metrics.fid);
                });
                fidObserver.observe({ type: 'first-input', buffered: true });
                this._observers.push(fidObserver);
            } catch (e) {}

            // CLS - Cumulative Layout Shift
            try {
                let clsValue = 0;
                const clsObserver = new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                        if (!entry.hadRecentInput) {
                            clsValue += entry.value;
                        }
                    }
                    this.metrics.cls = clsValue;
                    eventBus.emit('performance:cls', this.metrics.cls);
                });
                clsObserver.observe({ type: 'layout-shift', buffered: true });
                this._observers.push(clsObserver);
            } catch (e) {}

            // FCP - First Contentful Paint
            try {
                const fcpObserver = new PerformanceObserver((list) => {
                    const entries = list.getEntries();
                    const fcpEntry = entries.find(e => e.name === 'first-contentful-paint');
                    if (fcpEntry) {
                        this.metrics.fcp = fcpEntry.startTime;
                        eventBus.emit('performance:fcp', this.metrics.fcp);
                    }
                });
                fcpObserver.observe({ type: 'paint', buffered: true });
                this._observers.push(fcpObserver);
            } catch (e) {}
        }

        // TTFB - Time to First Byte
        const nav = performance.getEntriesByType('navigation')[0];
        if (nav) {
            this.metrics.ttfb = nav.responseStart - nav.requestStart;
            eventBus.emit('performance:ttfb', this.metrics.ttfb);
        }
    }

    /**
     * Observe Long Tasks
     */
    _observeLongTasks() {
        if (!('PerformanceObserver' in window)) return;

        try {
            const observer = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    if (entry.duration > this._longTaskThreshold) {
                        eventBus.emit('performance:longTask', {
                            duration: entry.duration,
                            startTime: entry.startTime,
                            name: entry.name
                        });
                    }
                }
            });
            observer.observe({ type: 'longtask', buffered: true });
            this._observers.push(observer);
        } catch (e) {}
    }

    /**
     * Observe Resource Loading
     */
    _observeResourceTiming() {
        if (!('PerformanceObserver' in window)) return;

        try {
            const observer = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    if (entry.duration > 1000) { // Resources taking > 1s
                        eventBus.emit('performance:slowResource', {
                            name: entry.name,
                            duration: entry.duration,
                            type: entry.initiatorType
                        });
                    }
                }
            });
            observer.observe({ type: 'resource', buffered: true });
            this._observers.push(observer);
        } catch (e) {}
    }

    /**
     * Generate performance report
     */
    generateReport() {
        return {
            timestamp: Date.now(),
            webVitals: this.getWebVitals(),
            navigation: this.getNavigationTiming(),
            memory: this.getMemoryUsage(),
            marks: Object.fromEntries(this.marks),
            measures: Object.fromEntries(this.measures),
            resourceCount: performance.getEntriesByType('resource').length,
            slowResources: this.getResourceTiming()
                .filter(r => r.duration > 500)
        };
    }

    /**
     * Clear all marks and measures
     */
    clear() {
        this.marks.clear();
        this.measures.clear();
        performance.clearMarks();
        performance.clearMeasures();
    }

    /**
     * Disconnect all observers
     */
    destroy() {
        for (const observer of this._observers) {
            observer.disconnect();
        }
        this._observers = [];
    }
}

// Singleton export
const performanceMonitor = new PerformanceMonitor();
export default performanceMonitor;
export { PerformanceMonitor };
