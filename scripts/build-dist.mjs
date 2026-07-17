#!/usr/bin/env node
/**
 * QMF Build Script - Creates distributable bundles for CDN and npm
 * 
 * Output:
 *   /opt/QMF/dist/
 *   ├── qmf.iife.js          # Browser global bundle (all-in-one)
 *   ├── qmf.iife.min.js      # Minified browser bundle
 *   ├── qmf.esm.js           # ES module bundle
 *   ├── tokens.css           # Design tokens
 *   ├── ui.css               # UI component styles
 *   ├── manifest.json        # SRI hashes for CDN
 *   └── packages/            # Individual package bundles
 *       ├── core/
 *       ├── header/
 *       ├── chat-embed/
 *       └── ...
 */

import { execSync } from 'child_process';
import { createHash } from 'crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync, copyFileSync, readdirSync, statSync, symlinkSync, unlinkSync } from 'fs';
import { join, resolve } from 'path';
import { createRequire } from 'module';

const ROOT = resolve(import.meta.dirname, '..');
const DIST = join(ROOT, 'dist');
const PACKAGES = join(ROOT, 'packages');

// Resolve esbuild binary via tsup's dependencies
function findEsbuild() {
  try {
    const require = createRequire(join(ROOT, 'package.json'));
    const esbuildPkg = require.resolve('esbuild/package.json');
    return join(esbuildPkg, '..', 'bin', 'esbuild');
  } catch {
    // Fallback: search in pnpm store
    const glob = join(ROOT, 'node_modules', '.pnpm');
    for (const dir of existsSync(glob) ? readdirSync(glob) : []) {
      const bin = join(glob, dir, 'node_modules', '.bin', 'esbuild');
      if (existsSync(bin)) return bin;
    }
    return 'esbuild'; // hope it's on PATH
  }
}

// Package build order (respects dependencies)
const BUILD_ORDER = [
  'tokens',
  'utils',
  'core',
  'ui',
  'auth-shell',
  'header',
  'footer',
  'chat-embed',
  'noti-embed',
  'loading-screen',
];

// ─── Helpers ────────────────────────────────────────────────

function run(cmd, cwd = ROOT) {
  console.log(`\n$ ${cmd}`);
  try {
    execSync(cmd, { cwd, stdio: 'inherit' });
  } catch (err) {
    console.error(`Command failed: ${cmd}`);
    process.exit(1);
  }
}

function sha384(content) {
  const hash = createHash('sha384').update(content).digest('base64');
  return `sha384-${hash}`;
}

function ensureDir(dir) {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function copyDir(src, dest) {
  ensureDir(dest);
  for (const item of readdirSync(src)) {
    const srcPath = join(src, item);
    const destPath = join(dest, item);
    if (statSync(srcPath).isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      copyFileSync(srcPath, destPath);
    }
  }
}

// ─── Main Build ─────────────────────────────────────────────

async function build() {
  console.log('╔════════════════════════════════════════╗');
  console.log('║      QMF Build Script v3.0.0           ║');
  console.log('╚════════════════════════════════════════╝');

  // Clean dist
  console.log('\n[1/6] Cleaning dist...');
  run(`rm -rf ${DIST}`);
  ensureDir(DIST);
  ensureDir(join(DIST, 'packages'));

  // Regenerate logo assets (optional — skip if ImageMagick unavailable)
  console.log('\n[2/6] Generating logo assets...');
  try {
    run('node scripts/generate-logo-variants.mjs --write');
  } catch {
    console.warn('  ⚠ Logo generation skipped (ImageMagick missing or assets present)');
  }

  // Install dependencies
  console.log('\n[3/6] Installing dependencies...');
  run('pnpm install --no-frozen-lockfile');

  // Build all packages
  console.log('\n[4/6] Building packages...');
  for (const pkg of BUILD_ORDER) {
    const pkgDir = join(PACKAGES, pkg);
    if (!existsSync(pkgDir)) {
      console.warn(`  ⚠ Package "${pkg}" not found, skipping`);
      continue;
    }
    console.log(`  → Building @qmf/${pkg}...`);
    run('pnpm build', pkgDir);
    
    // Copy to dist/packages/
    const pkgDist = join(pkgDir, 'dist');
    if (existsSync(pkgDist)) {
      copyDir(pkgDist, join(DIST, 'packages', pkg));
    }
  }

  // Create combined bundles
  console.log('\n[5/6] Creating combined bundles...');
  
  // Copy core IIFE as main bundle
  const coreDist = join(PACKAGES, 'core', 'dist');
  if (existsSync(join(coreDist, 'index.iife.js'))) {
    copyFileSync(join(coreDist, 'index.iife.js'), join(DIST, 'qmf.iife.js'));
  } else if (existsSync(join(coreDist, 'index.js'))) {
    copyFileSync(join(coreDist, 'index.js'), join(DIST, 'qmf.esm.js'));
  }

  // Build combined CDN bundle (qmf.min.js) from cdn-entry.js
  // This bundles core + header + footer + loading-screen into a single IIFE
  const cdnEntry = join(ROOT, 'scripts', 'cdn-entry.js');
  if (existsSync(cdnEntry)) {
    console.log('  → Building combined CDN bundle (qmf.min.js)...');
    const esbuild = findEsbuild();
    run(
      `${esbuild} ${cdnEntry} --bundle --format=iife --global-name=QMFBundle --minify --sourcemap --outfile=${join(DIST, 'qmf.min.js')}`,
      ROOT,
    );
  }

  // Copy CSS files
  const tokensCss = join(PACKAGES, 'tokens', 'dist', 'tokens.css');
  if (existsSync(tokensCss)) {
    copyFileSync(tokensCss, join(DIST, 'tokens.css'));
  }
  
  const uiCss = join(PACKAGES, 'ui', 'dist', 'ui.css');
  if (existsSync(uiCss)) {
    copyFileSync(uiCss, join(DIST, 'ui.css'));
  }

  // Copy standalone module files (_src/modules → dist/modules + modules-v3 mirror)
  const srcModules = join(ROOT, '_src', 'modules');
  const distModules = join(DIST, 'modules');
  if (existsSync(srcModules)) {
    console.log('  → Copying standalone modules to dist/modules...');
    copyDir(srcModules, distModules);
    copyDir(srcModules, join(DIST, 'modules-v3'));
  }

  // v3 path aliases (legacy URLs)
  ensureDir(join(DIST, 'v3'));
  for (const [name, target] of [['qmf.min.js', 'qmf.min.js'], ['tokens.css', 'tokens.css']]) {
    const t = join(DIST, target);
    if (existsSync(t)) {
      const linkPath = join(DIST, 'v3', name);
      if (existsSync(linkPath)) unlinkSync(linkPath);
      symlinkSync(target, linkPath);
    }
  }

  // Create legacy symlinks (qmf.js → qmf.min.js, qmf.css → tokens.css)
  const legacyLinks = [
    ['qmf.js', 'qmf.min.js'],
    ['qmf.css', 'tokens.css'],
  ];
  for (const [linkName, target] of legacyLinks) {
    const linkPath = join(DIST, linkName);
    if (existsSync(join(DIST, target))) {
      if (existsSync(linkPath)) unlinkSync(linkPath);
      symlinkSync(target, linkPath);
      console.log(`  → Symlink ${linkName} → ${target}`);
    }
  }

  // Generate manifest with SRI hashes
  console.log('\n[6/6] Generating manifest...');
  const manifest = {
    version: '3.0.0',
    buildTime: new Date().toISOString(),
    files: {},
  };

  for (const file of readdirSync(DIST)) {
    const filePath = join(DIST, file);
    if (statSync(filePath).isFile()) {
      const content = readFileSync(filePath);
      manifest.files[file] = {
        size: content.length,
        integrity: sha384(content),
      };
    }
  }

  writeFileSync(join(DIST, 'manifest.json'), JSON.stringify(manifest, null, 2));

  // Summary
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║          Build Complete!                ║');
  console.log('╚════════════════════════════════════════╝');
  console.log('\nOutput files:');
  for (const [file, info] of Object.entries(manifest.files)) {
    console.log(`  ${file} (${(info.size / 1024).toFixed(1)} KB)`);
  }
  console.log(`\nTotal: ${Object.keys(manifest.files).length} files`);
  console.log(`\nTo deploy: node scripts/deploy.mjs`);
}

build().catch(console.error);
