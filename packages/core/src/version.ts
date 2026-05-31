/**
 * @qmf/core - Version Metadata
 * Build and version metadata for the QMF framework.
 */

export interface QMFBuildMeta {
  /** Framework version (SemVer) */
  frameworkVersion: string;
  /** Unique build ID */
  buildId: string;
  /** Git commit SHA */
  gitCommit: string;
  /** Build channel */
  channel: 'dev' | 'staging' | 'production';
  /** Build timestamp (ISO 8601) */
  buildTime: string;
  /** Individual package versions */
  packages: Record<string, string>;
}

/** Current framework version — updated by release script */
export const QMF_VERSION = '3.0.0';

/** Package versions — updated by release script */
export const QMF_PACKAGES: Record<string, string> = {
  '@qmf/core': '3.0.0',
  '@qmf/tokens': '3.0.0',
  '@qmf/utils': '3.0.0',
  '@qmf/ui': '3.0.0',
  '@qmf/auth-shell': '3.0.0',
  '@qmf/header': '3.0.0',
  '@qmf/footer': '3.0.0',
  '@qmf/chat-embed': '3.0.0',
  '@qmf/noti-embed': '3.0.0',
  '@qmf/loading-screen': '3.0.0',
};

/**
 * Get full build metadata.
 * Populated at build time by the release script.
 */
export function getBuildMeta(): QMFBuildMeta {
  return {
    frameworkVersion: QMF_VERSION,
    buildId: '__BUILD_ID__',
    gitCommit: '__GIT_COMMIT__',
    channel: (typeof process !== 'undefined' ? process.env.QMF_CHANNEL : 'production') as QMFBuildMeta['channel'] ?? 'production',
    buildTime: '__BUILD_TIME__',
    packages: QMF_PACKAGES,
  };
}

/**
 * Print version info to console (dev mode).
 */
export function printVersion(): void {
  const meta = getBuildMeta();
  console.info(
    `%c⚡ QMF v${meta.frameworkVersion}%c (${meta.channel})`,
    'color: #667eea; font-weight: bold; font-size: 14px;',
    'color: #888; font-size: 12px;',
  );
}
