/**
 * QMF Loading Screen - Beautiful page loading overlay
 * Design based on Quizzman Dictionary loading-demo.html
 * @version 1.0.0
 * @module ui/loading-screen
 * 
 * Usage:
 * 1. Import and use directly:
 *    import { QMFLoadingScreen } from 'https://ui.quizzman.com/qmf/ui/loading-screen/index.js';
 *    const loader = new QMFLoadingScreen({ siteName: 'My Site', subtitle: 'Tagline' });
 *    loader.show();
 *    loader.setProgress(50, 'Loading data...');
 *    loader.complete(); // Shows success animation then hides
 * 
 * 2. Quick method:
 *    QMFLoadingScreen.auto({ siteName: 'My Site' }); // Auto runs full sequence
 */

// Default configuration
const DEFAULT_CONFIG = {
    siteName: 'Quizzman',
    subtitle: 'AI-Powered Learning',
    siteUrl: 'https://quizzman.com',
    showUrl: true,
    autoProgress: true,
    progressSteps: [
        { percent: 20, text: 'Đang tải giao diện', delay: 200 },
        { percent: 45, text: 'Đang kết nối API', delay: 600 },
        { percent: 70, text: 'Đang tải dữ liệu', delay: 1000 },
        { percent: 90, text: 'Hoàn thiện', delay: 1400 }
    ],
    successDelay: 800, // Delay before hiding after success
    onComplete: null,
    theme: 'dark' // 'dark' | 'light'
};

class QMFLoadingScreen {
    constructor(options = {}) {
        this.config = { ...DEFAULT_CONFIG, ...options };
        this.element = null;
        this.isShowing = false;
        this._progressTimeouts = [];
    }

    /**
     * Generate the loading screen HTML
     */
    _generateHTML() {
        const { siteName, subtitle, siteUrl, showUrl } = this.config;
        
        return `
            <div id="qmf-loading-screen" class="qmf-loading-screen">
                <!-- Decorative Elements -->
                <div class="qmf-loading-decoration">
                    <div class="qmf-loading-glow"></div>
                    <div class="qmf-loading-particle"></div>
                    <div class="qmf-loading-particle"></div>
                    <div class="qmf-loading-particle"></div>
                    <div class="qmf-loading-particle"></div>
                    <div class="qmf-loading-particle"></div>
                    <div class="qmf-loading-particle"></div>
                </div>

                <!-- Logo -->
                <div class="qmf-loading-logo">
                    <h1>${siteName}</h1>
                    <div class="qmf-loading-subtitle">${subtitle}</div>
                </div>

                <!-- Loading Blocks Animation -->
                <div class="qmf-loading-blocks" id="qmf-loading-blocks">
                    <div class="qmf-loading-block"></div>
                    <div class="qmf-loading-block"></div>
                    <div class="qmf-loading-block"></div>
                    <div class="qmf-loading-block"></div>
                    <div class="qmf-loading-block"></div>
                    <div class="qmf-loading-block"></div>
                    <div class="qmf-loading-block"></div>
                    <div class="qmf-loading-block"></div>
                    <div class="qmf-loading-block"></div>
                </div>

                <!-- Success Checkmark -->
                <svg class="qmf-loading-checkmark" id="qmf-loading-checkmark" viewBox="0 0 52 52">
                    <circle class="qmf-checkmark-circle" cx="26" cy="26" r="24"/>
                    <path class="qmf-checkmark-check" d="M14 27l8 8 16-16"/>
                </svg>

                <!-- Loading Text -->
                <div class="qmf-loading-text" id="qmf-loading-text">
                    Đang khởi tạo<span class="qmf-loading-dots"></span>
                </div>

                <!-- Progress Bar -->
                <div class="qmf-loading-progress">
                    <div class="qmf-loading-progress-bar" id="qmf-loading-progress-bar"></div>
                </div>

                <!-- URL Footer -->
                ${showUrl ? `
                <div class="qmf-loading-url">
                    <a href="${siteUrl}" target="_blank">${siteUrl.replace(/^https?:\/\//, '')}</a>
                </div>
                ` : ''}
            </div>
        `;
    }

    /**
     * Inject CSS styles if not already present
     */
    _injectStyles() {
        if (document.getElementById('qmf-loading-screen-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'qmf-loading-screen-styles';
        styles.textContent = `
            /* QMF Loading Screen Styles */
            .qmf-loading-screen {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: linear-gradient(135deg, #0f0f23 0%, #1a1a3e 50%, #0d0d1f 100%);
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                z-index: 999999;
                opacity: 1;
                visibility: visible;
                transition: opacity 0.5s ease, visibility 0.5s ease;
            }

            .qmf-loading-screen.hidden {
                opacity: 0;
                visibility: hidden;
                pointer-events: none;
            }

            .qmf-loading-screen.fade-out {
                animation: qmfLoaderFadeOut 0.6s ease forwards;
            }

            @keyframes qmfLoaderFadeOut {
                0% { opacity: 1; }
                100% { opacity: 0; visibility: hidden; }
            }

            /* Logo Section */
            .qmf-loading-logo {
                margin-bottom: 2rem;
                text-align: center;
            }

            .qmf-loading-logo h1 {
                font-family: 'Inter', system-ui, -apple-system, sans-serif;
                font-size: 2rem;
                font-weight: 700;
                background: linear-gradient(135deg, #818cf8 0%, #a78bfa 50%, #c4b5fd 100%);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
                margin: 0;
                letter-spacing: -0.02em;
            }

            .qmf-loading-subtitle {
                font-family: 'Inter', system-ui, -apple-system, sans-serif;
                font-size: 0.875rem;
                color: #64748b;
                margin-top: 0.5rem;
                letter-spacing: 0.1em;
            }

            /* Blocks Grid Animation */
            .qmf-loading-blocks {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 8px;
                margin-bottom: 2rem;
            }

            .qmf-loading-block {
                width: 20px;
                height: 20px;
                border-radius: 4px;
                background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
                opacity: 0.3;
                animation: qmfBlockPulse 1.4s ease-in-out infinite;
            }

            .qmf-loading-block:nth-child(1) { animation-delay: 0s; }
            .qmf-loading-block:nth-child(2) { animation-delay: 0.1s; }
            .qmf-loading-block:nth-child(3) { animation-delay: 0.2s; }
            .qmf-loading-block:nth-child(4) { animation-delay: 0.3s; }
            .qmf-loading-block:nth-child(5) { animation-delay: 0.4s; }
            .qmf-loading-block:nth-child(6) { animation-delay: 0.5s; }
            .qmf-loading-block:nth-child(7) { animation-delay: 0.6s; }
            .qmf-loading-block:nth-child(8) { animation-delay: 0.7s; }
            .qmf-loading-block:nth-child(9) { animation-delay: 0.8s; }

            @keyframes qmfBlockPulse {
                0%, 100% { 
                    opacity: 0.3; 
                    transform: scale(0.8);
                    background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
                }
                50% { 
                    opacity: 1; 
                    transform: scale(1);
                    background: linear-gradient(135deg, #818cf8 0%, #a78bfa 100%);
                    box-shadow: 0 0 20px rgba(139, 92, 246, 0.5);
                }
            }

            /* Success Checkmark */
            .qmf-loading-checkmark {
                display: none;
                width: 80px;
                height: 80px;
                margin-bottom: 1.5rem;
            }

            .qmf-loading-checkmark.show {
                display: block;
                animation: qmfCheckmarkBounce 0.6s ease;
            }

            @keyframes qmfCheckmarkBounce {
                0% { transform: scale(0); opacity: 0; }
                50% { transform: scale(1.2); }
                100% { transform: scale(1); opacity: 1; }
            }

            .qmf-checkmark-circle {
                stroke: #22c55e;
                stroke-width: 2;
                stroke-dasharray: 166;
                stroke-dashoffset: 166;
                fill: none;
                animation: qmfCheckCircle 0.6s ease forwards;
            }

            .qmf-checkmark-check {
                stroke: #22c55e;
                stroke-width: 3;
                stroke-linecap: round;
                stroke-linejoin: round;
                stroke-dasharray: 48;
                stroke-dashoffset: 48;
                fill: none;
                animation: qmfCheckStroke 0.4s ease 0.4s forwards;
            }

            @keyframes qmfCheckCircle {
                100% { stroke-dashoffset: 0; }
            }

            @keyframes qmfCheckStroke {
                100% { stroke-dashoffset: 0; }
            }

            /* Loading Text */
            .qmf-loading-text {
                font-family: 'Inter', system-ui, -apple-system, sans-serif;
                font-size: 0.875rem;
                color: #94a3b8;
                margin-bottom: 1rem;
                min-height: 1.5em;
            }

            .qmf-loading-dots {
                display: inline-block;
                width: 20px;
                text-align: left;
            }

            .qmf-loading-dots::after {
                content: '';
                animation: qmfLoadingDots 1.5s infinite;
            }

            @keyframes qmfLoadingDots {
                0%, 20% { content: '.'; }
                40% { content: '..'; }
                60%, 100% { content: '...'; }
            }

            /* Progress Bar */
            .qmf-loading-progress {
                width: 200px;
                height: 3px;
                background: rgba(100, 116, 139, 0.3);
                border-radius: 2px;
                overflow: hidden;
                margin-bottom: 2rem;
            }

            .qmf-loading-progress-bar {
                height: 100%;
                width: 0%;
                background: linear-gradient(90deg, #6366f1, #8b5cf6, #a78bfa);
                border-radius: 2px;
                transition: width 0.3s ease;
                position: relative;
            }

            .qmf-loading-progress-bar::after {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
                animation: qmfShimmer 1.5s infinite;
            }

            @keyframes qmfShimmer {
                0% { transform: translateX(-100%); }
                100% { transform: translateX(100%); }
            }

            /* URL Footer */
            .qmf-loading-url {
                position: absolute;
                bottom: 2rem;
                font-family: 'JetBrains Mono', 'Fira Code', monospace;
                font-size: 0.75rem;
                color: #475569;
                letter-spacing: 0.05em;
            }

            .qmf-loading-url a {
                color: #6366f1;
                text-decoration: none;
                transition: color 0.2s ease;
            }

            .qmf-loading-url a:hover {
                color: #818cf8;
            }

            /* Decoration Elements */
            .qmf-loading-decoration {
                position: absolute;
                width: 100%;
                height: 100%;
                overflow: hidden;
                pointer-events: none;
            }

            .qmf-loading-particle {
                position: absolute;
                width: 4px;
                height: 4px;
                background: rgba(139, 92, 246, 0.4);
                border-radius: 50%;
                animation: qmfFloat 8s infinite;
            }

            .qmf-loading-particle:nth-child(2) { left: 10%; top: 20%; animation-delay: 0s; }
            .qmf-loading-particle:nth-child(3) { left: 20%; top: 80%; animation-delay: 1s; }
            .qmf-loading-particle:nth-child(4) { left: 80%; top: 30%; animation-delay: 2s; }
            .qmf-loading-particle:nth-child(5) { left: 90%; top: 70%; animation-delay: 3s; }
            .qmf-loading-particle:nth-child(6) { left: 50%; top: 10%; animation-delay: 4s; }
            .qmf-loading-particle:nth-child(7) { left: 30%; top: 60%; animation-delay: 5s; }

            @keyframes qmfFloat {
                0%, 100% { 
                    transform: translateY(0) scale(1); 
                    opacity: 0.4;
                }
                50% { 
                    transform: translateY(-20px) scale(1.5); 
                    opacity: 0.8;
                }
            }

            /* Glow ring effect */
            .qmf-loading-glow {
                position: absolute;
                width: 300px;
                height: 300px;
                border-radius: 50%;
                background: radial-gradient(circle, rgba(99, 102, 241, 0.1) 0%, transparent 70%);
                animation: qmfGlowPulse 4s ease-in-out infinite;
                left: 50%;
                top: 50%;
                transform: translate(-50%, -50%);
            }

            @keyframes qmfGlowPulse {
                0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.5; }
                50% { transform: translate(-50%, -50%) scale(1.2); opacity: 0.8; }
            }

            /* Mobile Responsive */
            @media (max-width: 480px) {
                .qmf-loading-logo h1 {
                    font-size: 1.5rem;
                }
                
                .qmf-loading-block {
                    width: 16px;
                    height: 16px;
                }
                
                .qmf-loading-blocks {
                    gap: 6px;
                }
            }

            /* Light Theme */
            .qmf-loading-screen.light {
                background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #f1f5f9 100%);
            }

            .qmf-loading-screen.light .qmf-loading-logo h1 {
                background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #8b5cf6 100%);
                -webkit-background-clip: text;
                background-clip: text;
            }

            .qmf-loading-screen.light .qmf-loading-subtitle {
                color: #64748b;
            }

            .qmf-loading-screen.light .qmf-loading-text {
                color: #475569;
            }

            .qmf-loading-screen.light .qmf-loading-progress {
                background: rgba(100, 116, 139, 0.2);
            }

            .qmf-loading-screen.light .qmf-loading-glow {
                background: radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 70%);
            }

            .qmf-loading-screen.light .qmf-loading-particle {
                background: rgba(99, 102, 241, 0.5);
            }
        `;
        document.head.appendChild(styles);
    }

    /**
     * Show the loading screen
     */
    show() {
        if (this.isShowing) return this;

        this._injectStyles();

        // Create element if not exists
        if (!this.element) {
            const container = document.createElement('div');
            container.innerHTML = this._generateHTML();
            this.element = container.firstElementChild;
        }

        // Apply theme
        if (this.config.theme === 'light') {
            this.element.classList.add('light');
        }

        // Add to body
        document.body.appendChild(this.element);
        this.isShowing = true;

        // Auto progress if enabled
        if (this.config.autoProgress) {
            this._runAutoProgress();
        }

        return this;
    }

    /**
     * Set progress manually
     * @param {number} percent - Progress percentage (0-100)
     * @param {string} text - Status text to display
     */
    setProgress(percent, text = null) {
        const progressBar = this.element?.querySelector('#qmf-loading-progress-bar');
        const textEl = this.element?.querySelector('#qmf-loading-text');
        
        if (progressBar) {
            progressBar.style.width = `${percent}%`;
        }
        if (text && textEl) {
            textEl.innerHTML = text + '<span class="qmf-loading-dots"></span>';
        }

        return this;
    }

    /**
     * Run automatic progress animation
     */
    _runAutoProgress() {
        const { progressSteps, successDelay } = this.config;

        progressSteps.forEach(step => {
            const timeout = setTimeout(() => {
                this.setProgress(step.percent, step.text);
            }, step.delay);
            this._progressTimeouts.push(timeout);
        });

        // Complete after all steps
        const lastStep = progressSteps[progressSteps.length - 1];
        const completeTimeout = setTimeout(() => {
            this.complete();
        }, lastStep.delay + 400);
        this._progressTimeouts.push(completeTimeout);
    }

    /**
     * Show success animation and hide
     */
    complete() {
        const blocks = this.element?.querySelector('#qmf-loading-blocks');
        const checkmark = this.element?.querySelector('#qmf-loading-checkmark');
        const textEl = this.element?.querySelector('#qmf-loading-text');

        if (blocks) blocks.style.display = 'none';
        if (checkmark) {
            checkmark.classList.add('show');
            // Reset animation
            const circle = checkmark.querySelector('.qmf-checkmark-circle');
            const check = checkmark.querySelector('.qmf-checkmark-check');
            [circle, check].forEach(el => {
                if (el) {
                    el.style.animation = 'none';
                    el.offsetHeight; // Trigger reflow
                    el.style.animation = '';
                }
            });
        }
        if (textEl) textEl.innerHTML = 'Sẵn sàng!';
        this.setProgress(100);

        // Hide after delay
        setTimeout(() => {
            this.hide();
            if (typeof this.config.onComplete === 'function') {
                this.config.onComplete();
            }
        }, this.config.successDelay);

        return this;
    }

    /**
     * Hide the loading screen
     */
    hide() {
        if (!this.element || !this.isShowing) return this;

        // Clear any pending timeouts
        this._progressTimeouts.forEach(t => clearTimeout(t));
        this._progressTimeouts = [];

        // Animate out
        this.element.classList.add('fade-out');
        
        setTimeout(() => {
            this.element.classList.add('hidden');
            // Remove from DOM
            if (this.element.parentNode) {
                this.element.parentNode.removeChild(this.element);
            }
            this.isShowing = false;
        }, 600);

        return this;
    }

    /**
     * Force hide immediately without animation
     */
    forceHide() {
        if (!this.element) return this;

        this._progressTimeouts.forEach(t => clearTimeout(t));
        this._progressTimeouts = [];

        if (this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
        this.isShowing = false;

        return this;
    }

    /**
     * Update configuration
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        return this;
    }

    /**
     * Static method for quick auto-loading
     */
    static auto(options = {}) {
        const loader = new QMFLoadingScreen({
            ...options,
            autoProgress: true
        });
        return loader.show();
    }

    /**
     * Static method for manual control
     */
    static create(options = {}) {
        return new QMFLoadingScreen({
            ...options,
            autoProgress: false
        });
    }
}

// Export for different module systems
export { QMFLoadingScreen };
export default QMFLoadingScreen;

// Also expose to window for script tag usage
if (typeof window !== 'undefined') {
    window.QMFLoadingScreen = QMFLoadingScreen;
}
