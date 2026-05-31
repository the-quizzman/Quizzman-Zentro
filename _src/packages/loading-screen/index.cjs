'use strict';

var core = require('@qmf/core');
var utils = require('@qmf/utils');

// src/index.ts
var LoadingScreenConfigSchema = core.z.object({
  // Branding
  logoUrl: core.z.string().optional(),
  brandName: core.z.string().default("Quizzman"),
  tagLine: core.z.string().default("N\u1EC1n t\u1EA3ng h\u1ECDc & d\u1EA1y th\xF4ng minh"),
  // Theme
  theme: core.z.enum(["auto", "dark", "light"]).default("auto"),
  // Particles
  showParticles: core.z.boolean().default(true),
  particleCount: core.z.number().default(30),
  // Progress
  showProgress: core.z.boolean().default(true),
  stages: core.z.array(core.z.string()).default([
    "Kh\u1EDFi t\u1EA1o h\u1EC7 th\u1ED1ng...",
    "T\u1EA3i c\u1EA5u h\xECnh...",
    "K\u1EBFt n\u1ED1i d\u1ECBch v\u1EE5...",
    "Chu\u1EA9n b\u1ECB giao di\u1EC7n...",
    "S\u1EB5n s\xE0ng!"
  ]),
  // Timing
  minDisplayTime: core.z.number().default(1500),
  fadeOutDuration: core.z.number().default(500),
  // Skeleton placeholder
  showSkeleton: core.z.boolean().default(false),
  debug: core.z.boolean().default(false)
});
var QMFLoadingScreen = class {
  constructor(config = {}) {
    this.emitter = utils.createEventEmitter();
    this.screenEl = null;
    this.progressBarEl = null;
    this.stageTextEl = null;
    this.particlesEl = null;
    this.progress = 0;
    this.currentStage = 0;
    this.startTime = 0;
    this.isVisible = false;
    this.animFrameId = null;
    this.config = core.validateConfig(LoadingScreenConfigSchema, config, "LoadingScreen");
    this.logger = utils.createLogger("LoadingScreen", this.config.debug ? "debug" : "warn");
  }
  // ─── Public API ─────────────────────────────────────────
  /** Show the loading screen */
  show() {
    if (this.isVisible) return;
    this.startTime = Date.now();
    this.isVisible = true;
    this.progress = 0;
    this.currentStage = 0;
    this.render();
    this.startParticleAnimation();
    this.logger.debug("Loading screen shown");
    this.emitter.emit("show");
  }
  /** Update progress (0–100) */
  setProgress(value) {
    this.progress = Math.min(100, Math.max(0, value));
    const stageIndex = Math.min(
      Math.floor(this.progress / (100 / this.config.stages.length)),
      this.config.stages.length - 1
    );
    if (stageIndex !== this.currentStage) {
      this.currentStage = stageIndex;
      if (this.stageTextEl) {
        this.stageTextEl.textContent = this.config.stages[stageIndex] || "";
      }
    }
    if (this.progressBarEl) {
      this.progressBarEl.style.width = `${this.progress}%`;
    }
    this.emitter.emit("progress", this.progress);
  }
  /** Increment progress by a certain amount */
  incrementProgress(amount) {
    this.setProgress(this.progress + amount);
  }
  /** Set progress to a specific stage by index */
  setStage(index) {
    const stageCount = this.config.stages.length;
    const progressPerStage = 100 / stageCount;
    this.setProgress(progressPerStage * (index + 1));
  }
  /** Hide the loading screen with fade-out */
  async hide() {
    if (!this.isVisible) return;
    const elapsed = Date.now() - this.startTime;
    const remaining = this.config.minDisplayTime - elapsed;
    if (remaining > 0) {
      await new Promise((resolve) => setTimeout(resolve, remaining));
    }
    this.setProgress(100);
    if (this.screenEl) {
      this.screenEl.classList.add("qmf-loading--hiding");
      await new Promise((resolve) => setTimeout(resolve, this.config.fadeOutDuration));
    }
    this.destroy();
    this.logger.debug("Loading screen hidden");
    this.emitter.emit("hide");
  }
  /** Immediately remove without animation */
  destroy() {
    this.isVisible = false;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    this.screenEl?.remove();
    this.screenEl = null;
    this.emitter.clear();
  }
  /** Subscribe to events */
  on(event, cb) {
    return this.emitter.on(event, cb);
  }
  // ─── Private Render ─────────────────────────────────────
  resolveTheme() {
    if (this.config.theme !== "auto") return this.config.theme;
    if (typeof window === "undefined") return "light";
    const docTheme = document.documentElement.getAttribute("data-theme");
    if (docTheme === "dark") return "dark";
    if (docTheme === "light") return "light";
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  render() {
    const theme = this.resolveTheme();
    this.screenEl = utils.createElement("div", {
      className: `qmf-loading qmf-loading--${theme}`,
      "aria-label": "Loading...",
      role: "progressbar",
      "aria-valuenow": "0",
      "aria-valuemin": "0",
      "aria-valuemax": "100"
    });
    if (this.config.showParticles) {
      this.particlesEl = utils.createElement("div", { className: "qmf-loading__particles" });
      this.createParticles();
      this.screenEl.appendChild(this.particlesEl);
    }
    const center = utils.createElement("div", { className: "qmf-loading__center" });
    const logoWrap = utils.createElement("div", { className: "qmf-loading__logo-wrap" });
    if (this.config.logoUrl) {
      const logo = utils.createElement("img", {
        className: "qmf-loading__logo",
        src: this.config.logoUrl,
        alt: this.config.brandName
      });
      logoWrap.appendChild(logo);
    } else {
      const qLogo = utils.createElement("div", { className: "qmf-loading__q-logo" }, ["Q"]);
      logoWrap.appendChild(qLogo);
    }
    center.appendChild(logoWrap);
    const brandName = utils.createElement("div", { className: "qmf-loading__brand" }, [this.config.brandName]);
    center.appendChild(brandName);
    if (this.config.tagLine) {
      const tagline = utils.createElement("div", { className: "qmf-loading__tagline" }, [this.config.tagLine]);
      center.appendChild(tagline);
    }
    if (this.config.showProgress) {
      const progressWrap = utils.createElement("div", { className: "qmf-loading__progress" });
      this.progressBarEl = utils.createElement("div", { className: "qmf-loading__progress-bar" });
      progressWrap.appendChild(this.progressBarEl);
      center.appendChild(progressWrap);
      this.stageTextEl = utils.createElement("div", { className: "qmf-loading__stage" }, [this.config.stages[0] || ""]);
      center.appendChild(this.stageTextEl);
    }
    this.screenEl.appendChild(center);
    const appendToBody = () => {
      if (this.screenEl) {
        document.body.appendChild(this.screenEl);
      }
    };
    if (document.body) {
      appendToBody();
    } else {
      document.addEventListener("DOMContentLoaded", appendToBody, { once: true });
    }
  }
  createParticles() {
    if (!this.particlesEl) return;
    for (let i = 0; i < this.config.particleCount; i++) {
      const particle = utils.createElement("div", { className: "qmf-loading__particle" });
      const size = Math.random() * 4 + 2;
      const x = Math.random() * 100;
      const y = Math.random() * 100;
      const duration = Math.random() * 8 + 4;
      const delay = Math.random() * 4;
      particle.style.cssText = `
        width: ${size}px;
        height: ${size}px;
        left: ${x}%;
        top: ${y}%;
        animation-duration: ${duration}s;
        animation-delay: ${delay}s;
      `;
      this.particlesEl.appendChild(particle);
    }
  }
  startParticleAnimation() {
  }
};
function showLoadingScreen(config) {
  const screen = new QMFLoadingScreen(config);
  screen.show();
  return screen;
}
function createLoadingScreenPlugin(config) {
  let instance = null;
  return {
    name: "loading-screen",
    version: "3.0.0",
    hooks: {
      onBeforeInit: () => {
        instance = new QMFLoadingScreen(config);
        instance.show();
      },
      onInit: () => {
        instance?.setStage(1);
      },
      onMount: () => {
        instance?.setStage(2);
      },
      onConnect: () => {
        instance?.setStage(3);
      },
      onReady: () => {
        instance?.hide();
      },
      onDestroy: () => {
        instance?.destroy();
      }
    },
    setup: (ctx) => {
      ctx.expose("instance", instance);
      ctx.expose("setProgress", (v) => instance?.setProgress(v));
      ctx.expose("setStage", (i) => instance?.setStage(i));
      ctx.expose("hide", () => instance?.hide());
    }
  };
}

exports.LoadingScreenConfigSchema = LoadingScreenConfigSchema;
exports.QMFLoadingScreen = QMFLoadingScreen;
exports.createLoadingScreenPlugin = createLoadingScreenPlugin;
exports.showLoadingScreen = showLoadingScreen;
//# sourceMappingURL=index.cjs.map
//# sourceMappingURL=index.cjs.map