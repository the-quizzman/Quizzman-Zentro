'use strict';

// src/lifecycle.ts
var LifecycleManager = class {
  constructor(options) {
    this.phase = "created";
    this.name = options.name;
    this.hooks = options.hooks ?? {};
    this.eventBus = options.eventBus;
    this.debug = options.debug ?? false;
  }
  /** Get current lifecycle phase */
  getPhase() {
    return this.phase;
  }
  /** Check if module is in a given phase */
  isPhase(phase) {
    return this.phase === phase;
  }
  /** Check if module is ready (past "ready" phase) */
  isReady() {
    return this.phase === "ready";
  }
  /** Check if module is destroyed */
  isDestroyed() {
    return this.phase === "destroyed";
  }
  /**
   * Run full lifecycle: init → mount → connect → ready
   */
  async start() {
    await this.init();
    await this.mount();
    await this.connect();
    await this.ready();
  }
  async init() {
    this.assertPhase(["created"], "init");
    await this.transition("initializing", "initialized", [
      this.hooks.onBeforeInit,
      this.hooks.onInit,
      this.hooks.onAfterInit
    ]);
  }
  async mount() {
    this.assertPhase(["initialized"], "mount");
    await this.transition("mounting", "mounted", [
      this.hooks.onBeforeMount,
      this.hooks.onMount,
      this.hooks.onAfterMount
    ]);
  }
  async connect() {
    this.assertPhase(["mounted"], "connect");
    await this.transition("connecting", "connected", [
      this.hooks.onBeforeConnect,
      this.hooks.onConnect,
      this.hooks.onAfterConnect
    ]);
  }
  async ready() {
    this.assertPhase(["connected"], "ready");
    await this.transition("ready", "ready", [this.hooks.onReady]);
  }
  async destroy() {
    if (this.phase === "destroyed") return;
    await this.transition("destroying", "destroyed", [
      this.hooks.onBeforeDestroy,
      this.hooks.onDestroy
    ]);
  }
  /** Update hooks dynamically */
  setHooks(hooks) {
    this.hooks = { ...this.hooks, ...hooks };
  }
  async transition(enterPhase, exitPhase, hooks) {
    this.setPhase(enterPhase);
    try {
      for (const hook of hooks) {
        if (hook) await hook();
      }
      if (enterPhase !== exitPhase) {
        this.setPhase(exitPhase);
      }
    } catch (err) {
      this.setPhase("error");
      if (this.hooks.onError) {
        this.hooks.onError(err instanceof Error ? err : new Error(String(err)), enterPhase);
      } else {
        throw err;
      }
    }
  }
  setPhase(phase) {
    const prev = this.phase;
    this.phase = phase;
    if (this.debug) {
      console.debug(`[QMF:Lifecycle:${this.name}] ${prev} \u2192 ${phase}`);
    }
    this.eventBus?.emit(`lifecycle:${this.name}`, { phase, prev });
    this.eventBus?.emit("lifecycle:change", { module: this.name, phase, prev });
  }
  assertPhase(expected, action) {
    if (!expected.includes(this.phase)) {
      throw new Error(
        `[QMF:Lifecycle:${this.name}] Cannot "${action}" in phase "${this.phase}". Expected: ${expected.join(", ")}`
      );
    }
  }
};
function createLifecycle(options) {
  return new LifecycleManager(options);
}

exports.LifecycleManager = LifecycleManager;
exports.createLifecycle = createLifecycle;
//# sourceMappingURL=lifecycle.cjs.map
//# sourceMappingURL=lifecycle.cjs.map