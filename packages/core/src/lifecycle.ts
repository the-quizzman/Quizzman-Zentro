/**
 * @qmf/core - Lifecycle Manager
 * Standardized lifecycle for all QMF modules:
 *   init() → mount() → connect() → ready() → destroy()
 */

import { EventBus } from './event-bus';

/** Standard lifecycle phases */
export type LifecyclePhase = 'created' | 'initializing' | 'initialized' | 'mounting' | 'mounted' | 'connecting' | 'connected' | 'ready' | 'destroying' | 'destroyed' | 'error';

/** Lifecycle hook function */
export type LifecycleHook = () => void | Promise<void>;

export interface LifecycleHooks {
  onBeforeInit?: LifecycleHook;
  onInit?: LifecycleHook;
  onAfterInit?: LifecycleHook;
  onBeforeMount?: LifecycleHook;
  onMount?: LifecycleHook;
  onAfterMount?: LifecycleHook;
  onBeforeConnect?: LifecycleHook;
  onConnect?: LifecycleHook;
  onAfterConnect?: LifecycleHook;
  onReady?: LifecycleHook;
  onBeforeDestroy?: LifecycleHook;
  onDestroy?: LifecycleHook;
  onError?: (error: Error, phase: LifecyclePhase) => void;
}

export interface LifecycleManagerOptions {
  /** Module name for debugging */
  name: string;
  /** Lifecycle hooks */
  hooks?: LifecycleHooks;
  /** Event bus to emit lifecycle events */
  eventBus?: EventBus;
  /** Enable debug logging */
  debug?: boolean;
}

export class LifecycleManager {
  private phase: LifecyclePhase = 'created';
  private hooks: LifecycleHooks;
  private name: string;
  private eventBus?: EventBus;
  private debug: boolean;

  constructor(options: LifecycleManagerOptions) {
    this.name = options.name;
    this.hooks = options.hooks ?? {};
    this.eventBus = options.eventBus;
    this.debug = options.debug ?? false;
  }

  /** Get current lifecycle phase */
  getPhase(): LifecyclePhase {
    return this.phase;
  }

  /** Check if module is in a given phase */
  isPhase(phase: LifecyclePhase): boolean {
    return this.phase === phase;
  }

  /** Check if module is ready (past "ready" phase) */
  isReady(): boolean {
    return this.phase === 'ready';
  }

  /** Check if module is destroyed */
  isDestroyed(): boolean {
    return this.phase === 'destroyed';
  }

  /**
   * Run full lifecycle: init → mount → connect → ready
   */
  async start(): Promise<void> {
    await this.init();
    await this.mount();
    await this.connect();
    await this.ready();
  }

  async init(): Promise<void> {
    this.assertPhase(['created'], 'init');
    await this.transition('initializing', 'initialized', [
      this.hooks.onBeforeInit,
      this.hooks.onInit,
      this.hooks.onAfterInit,
    ]);
  }

  async mount(): Promise<void> {
    this.assertPhase(['initialized'], 'mount');
    await this.transition('mounting', 'mounted', [
      this.hooks.onBeforeMount,
      this.hooks.onMount,
      this.hooks.onAfterMount,
    ]);
  }

  async connect(): Promise<void> {
    this.assertPhase(['mounted'], 'connect');
    await this.transition('connecting', 'connected', [
      this.hooks.onBeforeConnect,
      this.hooks.onConnect,
      this.hooks.onAfterConnect,
    ]);
  }

  async ready(): Promise<void> {
    this.assertPhase(['connected'], 'ready');
    await this.transition('ready', 'ready', [this.hooks.onReady]);
  }

  async destroy(): Promise<void> {
    if (this.phase === 'destroyed') return;
    await this.transition('destroying', 'destroyed', [
      this.hooks.onBeforeDestroy,
      this.hooks.onDestroy,
    ]);
  }

  /** Update hooks dynamically */
  setHooks(hooks: Partial<LifecycleHooks>): void {
    this.hooks = { ...this.hooks, ...hooks };
  }

  private async transition(
    enterPhase: LifecyclePhase,
    exitPhase: LifecyclePhase,
    hooks: (LifecycleHook | undefined)[],
  ): Promise<void> {
    this.setPhase(enterPhase);
    try {
      for (const hook of hooks) {
        if (hook) await hook();
      }
      if (enterPhase !== exitPhase) {
        this.setPhase(exitPhase);
      }
    } catch (err) {
      this.setPhase('error');
      if (this.hooks.onError) {
        this.hooks.onError(err instanceof Error ? err : new Error(String(err)), enterPhase);
      } else {
        throw err;
      }
    }
  }

  private setPhase(phase: LifecyclePhase): void {
    const prev = this.phase;
    this.phase = phase;

    if (this.debug) {
      console.debug(`[QMF:Lifecycle:${this.name}] ${prev} → ${phase}`);
    }

    this.eventBus?.emit(`lifecycle:${this.name}`, { phase, prev });
    this.eventBus?.emit('lifecycle:change', { module: this.name, phase, prev });
  }

  private assertPhase(expected: LifecyclePhase[], action: string): void {
    if (!expected.includes(this.phase)) {
      throw new Error(
        `[QMF:Lifecycle:${this.name}] Cannot "${action}" in phase "${this.phase}". Expected: ${expected.join(', ')}`,
      );
    }
  }
}

/**
 * Create a lifecycle manager for a module.
 */
export function createLifecycle(options: LifecycleManagerOptions): LifecycleManager {
  return new LifecycleManager(options);
}
