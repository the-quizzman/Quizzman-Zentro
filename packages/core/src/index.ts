/**
 * @qmf/core
 * Public API — exports only what consumers are allowed to use.
 */

// === Event Bus ===
export { EventBus, getGlobalEventBus, createScopedBus, type EventHandler, type EventBusOptions } from './event-bus';

// === State Store ===
export {
  Store,
  createStore,
  createModuleStore,
  getModuleStore,
  destroyModuleStore,
  listModuleStores,
  GlobalStateSchema,
  type GlobalState,
  type StoreOptions,
  type StateListener,
  type Selector,
  z,
} from './state';

// === Lifecycle ===
export {
  LifecycleManager,
  createLifecycle,
  type LifecyclePhase,
  type LifecycleHook,
  type LifecycleHooks,
  type LifecycleManagerOptions,
} from './lifecycle';

// === Config ===
export {
  validateConfig,
  resolveConfig,
  resolveEnvUrls,
  detectChannel,
  QMFConfigError,
  BaseConfigSchema,
  EnvUrlsSchema,
  type BaseConfig,
  type EnvUrls,
  type QMFChannel,
} from './config';

// === HTTP ===
export {
  HttpClient,
  HttpError,
  createHttpClient,
  type HttpClientOptions,
  type HttpRequestConfig,
  type HttpResponse,
  type HttpInterceptor,
  type HttpResponseInterceptor,
  type HttpErrorInterceptor,
} from './http';

// === DI Container ===
export {
  DIContainer,
  getGlobalContainer,
  resetGlobalContainer,
  type ServiceFactory,
  type ServiceDescriptor,
  type RegisterOptions,
} from './di';

// === Plugin Loader ===
export {
  PluginLoader,
  createPluginLoader,
  lazy,
  type QMFPlugin,
  type LazyPluginLoader,
  type PluginContext,
  type PluginInstance,
} from './plugin-loader';

// === Error Boundary ===
export {
  ModuleErrorBoundary,
  createErrorBoundary,
  getErrorBoundary,
  listErrorBoundaries,
  getAllModuleErrors,
  type ModuleError,
  type ErrorHandler,
  type ErrorRecovery,
  type ErrorBoundaryOptions,
} from './error-boundary';

// === Event Tracer & DevTools ===
export {
  EventTracer,
  installDevTools,
  type TraceEntry,
  type EventTracerOptions,
} from './event-tracer';

// === Version ===
export { QMF_VERSION, QMF_PACKAGES, getBuildMeta, printVersion, type QMFBuildMeta } from './version';

// === QMF Framework ===
export { QMF, QMFInitSchema, type QMFInitOptions } from './qmf';
