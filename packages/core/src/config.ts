/**
 * @qmf/core - Config Resolver
 * Validates and resolves configuration using Zod schemas.
 * Supports environment-specific overrides and defaults.
 */

import { z, type ZodSchema, type ZodError } from 'zod';

/** Build channels */
export type QMFChannel = 'dev' | 'staging' | 'production';

/** Base configuration that all modules should extend */
export const BaseConfigSchema = z.object({
  debug: z.boolean().default(false),
  channel: z.enum(['dev', 'staging', 'production']).default('production'),
});

export type BaseConfig = z.infer<typeof BaseConfigSchema>;

/** Environment URLs */
export const EnvUrlsSchema = z.object({
  id: z.string().url(),
  chat: z.string().url(),
  noti: z.string().url(),
  ui: z.string().url(),
  main: z.string().url(),
});

export type EnvUrls = z.infer<typeof EnvUrlsSchema>;

/** Environment URL presets */
const ENV_URL_PRESETS: Record<QMFChannel, EnvUrls> = {
  dev: {
    id: 'http://localhost:4001',
    chat: 'http://localhost:4002',
    noti: 'http://localhost:4003',
    ui: 'http://localhost:4000',
    main: 'http://localhost:3000',
  },
  staging: {
    id: 'https://id.staging.quizzman.com',
    chat: 'https://chat.staging.quizzman.com',
    noti: 'https://noti.staging.quizzman.com',
    ui: 'https://ui.staging.quizzman.com',
    main: 'https://staging.quizzman.com',
  },
  production: {
    id: 'https://id.quizzman.com',
    chat: 'https://chat.quizzman.com',
    noti: 'https://noti.quizzman.com',
    ui: 'https://ui.quizzman.com',
    main: 'https://quizzman.com',
  },
};

/**
 * Detect current environment from hostname.
 */
export function detectChannel(): QMFChannel {
  if (typeof window === 'undefined') return 'production';
  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') return 'dev';
  if (host.includes('staging') || host.includes('dev')) return 'staging';
  return 'production';
}

/**
 * Get environment URLs for the current or specified channel.
 */
export function resolveEnvUrls(channel?: QMFChannel): EnvUrls {
  return ENV_URL_PRESETS[channel ?? detectChannel()];
}

/**
 * Validate config against a Zod schema.
 * Throws detailed error on invalid config.
 */
export function validateConfig<T>(schema: ZodSchema<T>, config: unknown, moduleName?: string): T {
  const result = schema.safeParse(config);
  if (!result.success) {
    const errors = formatZodErrors(result.error, moduleName);
    throw new QMFConfigError(errors, moduleName);
  }
  return result.data;
}

/**
 * Resolve config with defaults and env-specific overrides.
 */
export function resolveConfig<T>(
  schema: ZodSchema<T>,
  userConfig: unknown,
  defaults?: Partial<T>,
): T {
  const merged = { ...(defaults ?? {}), ...(userConfig as Record<string, unknown>) };
  return validateConfig(schema, merged);
}

/** Config validation error */
export class QMFConfigError extends Error {
  public readonly errors: string[];
  public readonly module?: string;

  constructor(errors: string[], module?: string) {
    const prefix = module ? `[QMF:Config:${module}]` : '[QMF:Config]';
    super(`${prefix} Invalid configuration:\n${errors.map((e) => `  - ${e}`).join('\n')}`);
    this.name = 'QMFConfigError';
    this.errors = errors;
    this.module = module;
  }
}

function formatZodErrors(error: ZodError, _moduleName?: string): string[] {
  return error.issues.map((issue) => {
    const path = issue.path.join('.');
    return path ? `"${path}": ${issue.message}` : issue.message;
  });
}

export { z };
