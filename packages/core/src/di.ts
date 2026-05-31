/**
 * @qmf/core - Dependency Injection Container
 *
 * A simple but powerful DI container for registering and resolving services.
 * Supports singleton & transient lifetimes, factory functions, and scoped containers.
 *
 * Usage:
 *   container.register('http', HttpClient, { singleton: true });
 *   container.registerInstance('config', appConfig);
 *   container.registerFactory('logger', (c) => new Logger(c.resolve('config')));
 *
 *   const http = container.resolve<HttpClient>('http');
 */

// ─── Types ──────────────────────────────────────────────────

export type ServiceFactory<T = unknown> = (container: DIContainer) => T;

export interface ServiceDescriptor<T = unknown> {
  /** Factory that creates the service instance */
  factory: ServiceFactory<T>;
  /** Whether this is a singleton (default true) */
  singleton: boolean;
  /** Cached singleton instance */
  instance?: T;
  /** Tags for grouping/filtering */
  tags?: string[];
}

export interface RegisterOptions {
  /** If true, the same instance is returned on every resolve (default: true) */
  singleton?: boolean;
  /** Optional tags for grouping/filtering */
  tags?: string[];
  /** If true, silently replaces existing registration */
  replace?: boolean;
}

// ─── Container ──────────────────────────────────────────────

export class DIContainer {
  private services = new Map<string, ServiceDescriptor>();
  private resolving = new Set<string>(); // Circular dependency detection

  /**
   * Register a class/constructor as a service.
   * The container will instantiate it once (singleton) or per-resolve (transient).
   */
  register<T>(
    token: string,
    Ctor: new (...args: unknown[]) => T,
    options: RegisterOptions = {},
  ): this {
    this.assertOrReplace(token, options);
    this.services.set(token, {
      factory: () => new Ctor(),
      singleton: options.singleton ?? true,
      tags: options.tags,
    });
    return this;
  }

  /**
   * Register a factory function that receives the container for resolving deps.
   */
  registerFactory<T>(
    token: string,
    factory: ServiceFactory<T>,
    options: RegisterOptions = {},
  ): this {
    this.assertOrReplace(token, options);
    this.services.set(token, {
      factory: factory as ServiceFactory,
      singleton: options.singleton ?? true,
      tags: options.tags,
    });
    return this;
  }

  /**
   * Register a pre-built instance directly.
   * Always treated as singleton.
   */
  registerInstance<T>(token: string, instance: T, options: Omit<RegisterOptions, 'singleton'> = {}): this {
    this.assertOrReplace(token, options as RegisterOptions);
    this.services.set(token, {
      factory: () => instance,
      singleton: true,
      instance,
      tags: (options as RegisterOptions).tags,
    });
    return this;
  }

  /**
   * Resolve a service by token.
   * Throws if not registered.
   */
  resolve<T>(token: string): T {
    const descriptor = this.services.get(token);
    if (!descriptor) {
      throw new Error(`[QMF:DI] Service "${token}" is not registered. Available: ${this.tokens().join(', ')}`);
    }

    // Singleton: return cached instance
    if (descriptor.singleton && descriptor.instance !== undefined) {
      return descriptor.instance as T;
    }

    // Circular dependency guard
    if (this.resolving.has(token)) {
      throw new Error(
        `[QMF:DI] Circular dependency detected when resolving "${token}". ` +
        `Resolution chain: ${[...this.resolving].join(' → ')} → ${token}`,
      );
    }

    this.resolving.add(token);
    try {
      const instance = descriptor.factory(this) as T;
      if (descriptor.singleton) {
        descriptor.instance = instance;
      }
      return instance;
    } finally {
      this.resolving.delete(token);
    }
  }

  /**
   * Try to resolve a service. Returns undefined if not registered.
   */
  tryResolve<T>(token: string): T | undefined {
    if (!this.has(token)) return undefined;
    return this.resolve<T>(token);
  }

  /**
   * Check if a service is registered.
   */
  has(token: string): boolean {
    return this.services.has(token);
  }

  /**
   * Unregister a service.
   */
  unregister(token: string): boolean {
    return this.services.delete(token);
  }

  /**
   * Get all registered tokens.
   */
  tokens(): string[] {
    return [...this.services.keys()];
  }

  /**
   * Get all tokens matching a tag.
   */
  getByTag(tag: string): string[] {
    return [...this.services.entries()]
      .filter(([, desc]) => desc.tags?.includes(tag))
      .map(([token]) => token);
  }

  /**
   * Create a child container that inherits parent registrations.
   * Overrides in the child don't affect the parent.
   */
  createScope(): DIContainer {
    const child = new DIContainer();
    // Copy all registrations (shallow — singletons are shared by reference)
    for (const [token, desc] of this.services) {
      child.services.set(token, { ...desc });
    }
    return child;
  }

  /**
   * Reset all singletons (forces re-creation on next resolve).
   * Useful for testing.
   */
  resetSingletons(): void {
    for (const desc of this.services.values()) {
      if (desc.singleton) {
        desc.instance = undefined;
      }
    }
  }

  /**
   * Clear all registrations.
   */
  clear(): void {
    this.services.clear();
    this.resolving.clear();
  }

  /**
   * Snapshot of all registered services (for debugging).
   */
  [Symbol.for('nodejs.util.inspect.custom')](): string {
    const entries = [...this.services.entries()].map(
      ([token, desc]) =>
        `  ${token}: ${desc.singleton ? 'singleton' : 'transient'}${desc.instance !== undefined ? ' (cached)' : ''}${desc.tags?.length ? ` [${desc.tags.join(',')}]` : ''}`,
    );
    return `DIContainer {\n${entries.join('\n')}\n}`;
  }

  private assertOrReplace(token: string, options: RegisterOptions): void {
    if (this.services.has(token) && !options.replace) {
      throw new Error(
        `[QMF:DI] Service "${token}" is already registered. Use { replace: true } to override.`,
      );
    }
  }
}

// ─── Global Container ───────────────────────────────────────

let _globalContainer: DIContainer | null = null;

/**
 * Get the global DI container (singleton).
 */
export function getGlobalContainer(): DIContainer {
  if (!_globalContainer) {
    _globalContainer = new DIContainer();
  }
  return _globalContainer;
}

/**
 * Reset the global container (useful for testing).
 */
export function resetGlobalContainer(): void {
  _globalContainer?.clear();
  _globalContainer = null;
}
