#!/usr/bin/env node
/**
 * QMF CDN Build (lightweight)
 * Builds dist/ for ui.quizzman.com without turbo/pnpm workspace.
 *
 * Usage:
 *   node scripts/build-cdn.mjs
 *   node scripts/build-cdn.mjs --skip-bundle   # modules only, no qmf.min.js
 */

import { createHash } from 'crypto';
import { execSync } from 'child_process';
import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from 'fs';
import { join, resolve } from 'path';

const ROOT = resolve(import.meta.dirname, '..');
const DIST = join(ROOT, 'dist');
const SRC_MODULES = join(ROOT, '_src', 'modules');
const VERSION = '3.3.1';

const args = new Set(process.argv.slice(2));
const skipBundle = args.has('--skip-bundle');

function sha384(content) {
  return `sha384-${createHash('sha384').update(content).digest('base64')}`;
}

function ensureDir(dir) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function symlinkOrCopy(target, linkPath) {
  if (!existsSync(target)) return;
  if (existsSync(linkPath)) {
    try { unlinkSync(linkPath); } catch { /* ignore */ }
  }
  try {
    symlinkSync(target, linkPath);
  } catch {
    cpSync(target, linkPath, { recursive: true });
  }
}

function copyIfExists(src, dest) {
  if (!existsSync(src)) {
    console.warn(`  ⚠ missing: ${src}`);
    return false;
  }
  ensureDir(resolve(dest, '..'));
  copyFileSync(src, dest);
  return true;
}

function tryBundleQmfMin() {
  if (skipBundle) {
    console.log('  → skip bundle (--skip-bundle)');
    return;
  }

  const cdnEntry = join(ROOT, 'scripts', 'cdn-entry.js');
  const outFile = join(DIST, 'qmf.min.js');
  if (!existsSync(cdnEntry)) {
    console.warn('  ⚠ cdn-entry.js missing, copying core IIFE fallback');
    const fallback = join(ROOT, '_src', 'qmf.iife.js');
    if (existsSync(fallback)) copyFileSync(fallback, outFile);
    return;
  }

  const esbuildLocal = join(ROOT, 'node_modules', '.bin', 'esbuild');
  const esbuildBin = existsSync(esbuildLocal) ? esbuildLocal : 'esbuild';

  try {
    execSync(
      `${esbuildBin} ${cdnEntry} --bundle --format=iife --global-name=QMFBundle --minify --sourcemap --outfile=${outFile}`,
      { cwd: ROOT, stdio: 'inherit', env: { ...process.env, NODE_PATH: join(ROOT, 'node_modules') } },
    );
    console.log('  ✓ qmf.min.js bundled');
  } catch (err) {
    console.warn('  ⚠ esbuild bundle failed, using core IIFE fallback');
    const fallback = join(ROOT, '_src', 'qmf.iife.js');
    if (existsSync(fallback)) copyFileSync(fallback, outFile);
  }
}

function mirrorModulesV3() {
  const modulesDist = join(DIST, 'modules');
  const v3Dist = join(DIST, 'modules-v3');
  if (!existsSync(modulesDist)) return;

  rmSync(v3Dist, { recursive: true, force: true });
  cpSync(modulesDist, v3Dist, { recursive: true });
  console.log('  ✓ modules-v3/ copied from modules/');
}

function createV3Aliases() {
  const v3Root = join(DIST, 'v3');
  ensureDir(v3Root);

  const aliases = ['qmf.min.js', 'tokens.css'];
  for (const name of aliases) {
    const src = join(DIST, name);
    const dest = join(v3Root, name);
    if (existsSync(src)) copyFileSync(src, dest);
  }
  console.log('  ✓ v3/ aliases created');
}

function generateManifest() {
  const manifest = {
    version: VERSION,
    buildTime: new Date().toISOString(),
    cdnBase: 'https://ui.quizzman.com/qmf/dist/',
    files: {},
  };

  function walk(dir, prefix = '') {
    for (const item of readdirSync(dir)) {
      const full = join(dir, item);
      const rel = prefix ? `${prefix}/${item}` : item;
      if (statSync(full).isDirectory()) walk(full, rel);
      else {
        const content = readFileSync(full);
        manifest.files[rel] = {
          size: content.length,
          integrity: sha384(content),
        };
      }
    }
  }

  walk(DIST);
  writeFileSync(join(DIST, 'manifest.json'), JSON.stringify(manifest, null, 2));
}

async function main() {
  console.log('╔════════════════════════════════════════╗');
  console.log('║   QMF CDN Build (lightweight) v3.3.1   ║');
  console.log('╚════════════════════════════════════════╝');

  console.log('\n[1/5] Clean dist/');
  rmSync(DIST, { recursive: true, force: true });
  ensureDir(DIST);

  console.log('\n[2/5] Copy CSS tokens & UI');
  copyIfExists(join(ROOT, '_src', 'tokens.css'), join(DIST, 'tokens.css'))
    || copyIfExists(join(ROOT, 'packages', 'tokens', 'src', 'tokens.css'), join(DIST, 'tokens.css'));
  copyIfExists(join(ROOT, 'packages', 'ui', 'src', 'styles', 'ui.css'), join(DIST, 'ui.css'));
  // Referenced by dict/lab/landing HTML heads — missing file → 404 stalls CSSOM
  copyIfExists(join(ROOT, '_src', 'qmf-friends-preload.css'), join(DIST, 'qmf-friends-preload.css'));

  console.log('\n[3/6] Copy standalone modules → dist/modules/');
  if (existsSync(SRC_MODULES)) {
    cpSync(SRC_MODULES, join(DIST, 'modules'), { recursive: true });
    console.log('  ✓ _src/modules → dist/modules');
  } else {
    console.warn('  ⚠ _src/modules not found');
  }

  console.log('\n[3b/6] Build @qmf/legatus → dist/legatus/');
  const legatusPkg = join(ROOT, 'packages', 'legatus');
  if (existsSync(join(legatusPkg, 'scripts', 'build-standalone.mjs'))) {
    try {
      execSync('node scripts/build-standalone.mjs', { cwd: legatusPkg, stdio: 'inherit' });
      const legatusDist = join(legatusPkg, 'dist');
      const legatusTarget = join(DIST, 'legatus');
      ensureDir(legatusTarget);
      for (const f of ['legatus.min.js', 'legatus.esm.js', 'legatus.css']) {
        copyIfExists(join(legatusDist, f), join(legatusTarget, f));
      }
      console.log('  ✓ packages/legatus → dist/legatus/');
    } catch (err) {
      console.warn('  ⚠ legatus standalone build failed:', err.message);
    }
  }

  mirrorModulesV3();

  console.log('\n[4/6] Bundle qmf.min.js');
  tryBundleQmfMin();
  if (!existsSync(join(DIST, 'qmf.min.js'))) {
    const fallback = join(ROOT, '_src', 'qmf.iife.js');
    if (existsSync(fallback)) {
      copyFileSync(fallback, join(DIST, 'qmf.min.js'));
      console.log('  ✓ qmf.min.js ← _src/qmf.iife.js fallback');
    }
  }

  const legacyLinks = [
    ['qmf.js', 'qmf.min.js'],
    ['qmf.css', 'tokens.css'],
  ];
  for (const [linkName, target] of legacyLinks) {
    const targetPath = join(DIST, target);
    const linkPath = join(DIST, linkName);
    if (existsSync(targetPath)) copyFileSync(targetPath, linkPath);
  }

  createV3Aliases();

  console.log('\n[5/6] manifest.json');
  generateManifest();

  const fileCount = Object.keys(JSON.parse(readFileSync(join(DIST, 'manifest.json'), 'utf8')).files).length;
  console.log(`\n✓ Build complete — ${fileCount} files in dist/`);
  console.log('  Publish: node scripts/publish-ui.mjs');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
