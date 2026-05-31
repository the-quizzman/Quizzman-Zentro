#!/usr/bin/env node

/**
 * @qmf/cli - QMF Framework CLI
 * 
 * Commands:
 *   qmf create <app-name>   Create a new QMF-powered app
 *   qmf add <module>        Add a QMF module to current project
 *   qmf doctor              Check project health
 *   qmf build               Build all packages
 *   qmf version              Show QMF version info
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { execSync } from 'node:child_process';

// ─── Constants ──────────────────────────────────────────────

const QMF_VERSION = '3.0.0';

const AVAILABLE_MODULES = [
  'core', 'tokens', 'utils', 'ui', 'auth-shell',
  'header', 'footer', 'chat-embed', 'noti-embed', 'loading-screen',
];

const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
};

// ─── Helpers ────────────────────────────────────────────────

function log(msg: string): void {
  console.log(msg);
}

function success(msg: string): void {
  log(`${COLORS.green}✓${COLORS.reset} ${msg}`);
}

function warn(msg: string): void {
  log(`${COLORS.yellow}⚠${COLORS.reset} ${msg}`);
}

function error(msg: string): void {
  log(`${COLORS.red}✗${COLORS.reset} ${msg}`);
}

function info(msg: string): void {
  log(`${COLORS.blue}ℹ${COLORS.reset} ${msg}`);
}

function heading(msg: string): void {
  log(`\n${COLORS.bold}${COLORS.cyan}${msg}${COLORS.reset}\n`);
}

function run(cmd: string, cwd?: string): string {
  try {
    return execSync(cmd, { cwd, encoding: 'utf-8', stdio: 'pipe' }).trim();
  } catch {
    return '';
  }
}

// ─── Commands ───────────────────────────────────────────────

function cmdCreate(appName: string): void {
  heading(`🏗  Creating QMF app: ${appName}`);

  if (!appName || appName.startsWith('-')) {
    error('Please provide a valid app name: qmf create <app-name>');
    process.exit(1);
  }

  const targetDir = resolve(process.cwd(), appName);
  if (existsSync(targetDir)) {
    error(`Directory "${appName}" already exists`);
    process.exit(1);
  }

  mkdirSync(targetDir, { recursive: true });

  // Create package.json
  const pkg = {
    name: appName,
    version: '1.0.0',
    private: true,
    type: 'module',
    scripts: {
      dev: 'vite',
      build: 'vite build',
      preview: 'vite preview',
    },
    dependencies: {
      '@qmf/core': `^${QMF_VERSION}`,
      '@qmf/tokens': `^${QMF_VERSION}`,
      '@qmf/utils': `^${QMF_VERSION}`,
      '@qmf/ui': `^${QMF_VERSION}`,
      '@qmf/auth-shell': `^${QMF_VERSION}`,
      '@qmf/header': `^${QMF_VERSION}`,
      '@qmf/footer': `^${QMF_VERSION}`,
      '@qmf/loading-screen': `^${QMF_VERSION}`,
    },
    devDependencies: {
      typescript: '^5.4.0',
      vite: '^5.0.0',
    },
  };
  writeFileSync(join(targetDir, 'package.json'), JSON.stringify(pkg, null, 2));

  // Create index.html
  writeFileSync(join(targetDir, 'index.html'), `<!doctype html>
<html lang="vi" data-theme="light">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${appName} — Powered by QMF</title>
  <link rel="stylesheet" href="/src/main.css" />
</head>
<body>
  <div id="qmf-header"></div>
  <main id="app"></main>
  <div id="qmf-footer"></div>
  <div id="qmf-chat"></div>
  <script type="module" src="/src/main.ts"></script>
</body>
</html>
`);

  // Create src/
  mkdirSync(join(targetDir, 'src'), { recursive: true });

  writeFileSync(join(targetDir, 'src/main.ts'), `import { QMF } from '@qmf/core';
import { createHeaderPlugin } from '@qmf/header';
import { createFooterPlugin } from '@qmf/footer';
import { createLoadingScreenPlugin } from '@qmf/loading-screen';
import { createAuthShellPlugin } from '@qmf/auth-shell';

// Import styles
import '@qmf/tokens/tokens.css';
import '@qmf/tokens/dark.css';
import '@qmf/ui/style.css';
import '@qmf/header/style.css';
import '@qmf/footer/style.css';
import '@qmf/loading-screen/style.css';
import './main.css';

async function bootstrap() {
  const qmf = QMF.getInstance();

  // Register plugins
  qmf.use(createLoadingScreenPlugin());
  qmf.use(createAuthShellPlugin({ loginUrl: 'https://id.quizzman.com/login' }));
  qmf.use(createHeaderPlugin({ brandName: '${appName}' }));
  qmf.use(createFooterPlugin());

  // Initialize
  await qmf.init({
    appId: '${appName}',
    env: 'production',
    debug: false,
  });
}

bootstrap().catch(console.error);
`);

  writeFileSync(join(targetDir, 'src/main.css'), `/* ${appName} - Custom styles */

#app {
  min-height: calc(100vh - var(--qmf-header-height, 56px) - 200px);
  max-width: 1200px;
  margin: 0 auto;
  padding: var(--qmf-spacing-6, 24px);
}
`);

  // Create tsconfig
  writeFileSync(join(targetDir, 'tsconfig.json'), JSON.stringify({
    compilerOptions: {
      target: 'ES2020',
      module: 'ESNext',
      moduleResolution: 'bundler',
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
      forceConsistentCasingInFileNames: true,
      jsx: 'preserve',
    },
    include: ['src'],
  }, null, 2));

  success(`App created at ./${appName}`);
  log('');
  info('Next steps:');
  log(`  cd ${appName}`);
  log('  pnpm install');
  log('  pnpm dev');
}

function cmdAdd(moduleName: string): void {
  heading(`📦 Adding module: @qmf/${moduleName}`);

  if (!AVAILABLE_MODULES.includes(moduleName)) {
    error(`Unknown module: ${moduleName}`);
    log(`Available modules: ${AVAILABLE_MODULES.join(', ')}`);
    process.exit(1);
  }

  // Check for package.json
  const pkgPath = resolve(process.cwd(), 'package.json');
  if (!existsSync(pkgPath)) {
    error('No package.json found. Run this command from your project root.');
    process.exit(1);
  }

  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
  const dep = `@qmf/${moduleName}`;

  if (pkg.dependencies?.[dep]) {
    warn(`${dep} is already installed`);
    return;
  }

  // Add dependency
  pkg.dependencies = pkg.dependencies || {};
  pkg.dependencies[dep] = `^${QMF_VERSION}`;

  // Sort dependencies
  pkg.dependencies = Object.fromEntries(
    Object.entries(pkg.dependencies).sort(([a], [b]) => a.localeCompare(b)),
  );

  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  success(`Added ${dep}@^${QMF_VERSION} to dependencies`);
  info('Run "pnpm install" to install the new dependency');
}

function cmdDoctor(): void {
  heading('🩺 QMF Doctor — Project Health Check');

  let issues = 0;
  let warnings = 0;

  // Check Node
  const nodeVersion = process.version;
  const majorNode = parseInt(nodeVersion.slice(1));
  if (majorNode >= 18) {
    success(`Node.js ${nodeVersion}`);
  } else {
    error(`Node.js ${nodeVersion} — requires >= 18`);
    issues++;
  }

  // Check pnpm
  const pnpmVersion = run('pnpm --version');
  if (pnpmVersion) {
    success(`pnpm ${pnpmVersion}`);
  } else {
    warn('pnpm not found — recommended for QMF monorepo');
    warnings++;
  }

  // Check package.json
  const pkgPath = resolve(process.cwd(), 'package.json');
  if (existsSync(pkgPath)) {
    success('package.json found');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));

    // Check for QMF packages
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    const qmfPackages = Object.keys(deps).filter(k => k.startsWith('@qmf/'));
    if (qmfPackages.length > 0) {
      success(`QMF packages: ${qmfPackages.join(', ')}`);
    } else {
      warn('No @qmf/ packages found');
      warnings++;
    }

    // Check for required deps
    if (!deps['@qmf/core']) {
      error('@qmf/core is required');
      issues++;
    }
  } else {
    error('No package.json found');
    issues++;
  }

  // Check TypeScript
  const tsVersion = run('npx tsc --version');
  if (tsVersion) {
    success(`TypeScript: ${tsVersion}`);
  } else {
    warn('TypeScript not found');
    warnings++;
  }

  // Check tsconfig
  if (existsSync(resolve(process.cwd(), 'tsconfig.json'))) {
    success('tsconfig.json found');
  } else {
    warn('No tsconfig.json — TypeScript config recommended');
    warnings++;
  }

  // Summary
  log('');
  if (issues === 0 && warnings === 0) {
    success('All checks passed!');
  } else {
    if (issues > 0) error(`${issues} issue(s) found`);
    if (warnings > 0) warn(`${warnings} warning(s)`);
  }
}

function cmdVersion(): void {
  heading('QMF Framework');
  log(`  Version:  ${QMF_VERSION}`);
  log(`  Node:     ${process.version}`);
  log(`  Platform: ${process.platform} ${process.arch}`);
  log(`  Packages: ${AVAILABLE_MODULES.length}`);
  log('');
  log('  Packages:');
  for (const mod of AVAILABLE_MODULES) {
    log(`    @qmf/${mod}@${QMF_VERSION}`);
  }
}

function cmdBuild(): void {
  heading('🔨 Building QMF packages');

  info('Running turbo build...');
  try {
    execSync('pnpm turbo build', {
      cwd: process.cwd(),
      stdio: 'inherit',
    });
    success('Build complete');
  } catch {
    error('Build failed');
    process.exit(1);
  }
}

function cmdHelp(): void {
  log(`
${COLORS.bold}${COLORS.cyan}QMF CLI v${QMF_VERSION}${COLORS.reset}

${COLORS.bold}Usage:${COLORS.reset}
  qmf <command> [options]

${COLORS.bold}Commands:${COLORS.reset}
  create <name>    Create a new QMF-powered app
  add <module>     Add a QMF module to current project
  doctor           Check project health
  build            Build all packages
  version          Show version info
  help             Show this help message

${COLORS.bold}Available Modules:${COLORS.reset}
  ${AVAILABLE_MODULES.join(', ')}

${COLORS.bold}Examples:${COLORS.reset}
  qmf create my-app
  qmf add chat-embed
  qmf doctor
`);
}

// ─── Main ───────────────────────────────────────────────────

function main(): void {
  const args = process.argv.slice(2);
  const command = args[0];
  const arg1 = args[1];

  switch (command) {
    case 'create':
      cmdCreate(arg1);
      break;
    case 'add':
      cmdAdd(arg1);
      break;
    case 'doctor':
      cmdDoctor();
      break;
    case 'build':
      cmdBuild();
      break;
    case 'version':
    case '-v':
    case '--version':
      cmdVersion();
      break;
    case 'help':
    case '-h':
    case '--help':
    default:
      cmdHelp();
      break;
  }
}

main();
