#!/usr/bin/env node
/**
 * Publish QMF dist/ to ui.quizzman.com document root.
 *
 * Default target: /opt/Quizzman/qmf/
 * Nginx root:     /opt/Quizzman  →  /qmf/dist/...
 *
 * Usage:
 *   node scripts/build-cdn.mjs && node scripts/publish-ui.mjs
 *   node scripts/publish-ui.mjs --target /opt/Quizzman/qmf
 *   node scripts/publish-ui.mjs --dry-run
 */

import { copyFileSync, cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'fs';
import { join, resolve } from 'path';

const ROOT = resolve(import.meta.dirname, '..');
const DIST = join(ROOT, 'dist');
const LOGO_SRC = join(ROOT, 'assets', 'logo');
const FONTS_SRC = join(ROOT, 'assets', 'fonts');

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const targetIdx = args.indexOf('--target');
const TARGET = targetIdx >= 0 ? args[targetIdx + 1] : '/opt/Quizzman/qmf';

function log(msg) {
  console.log(dryRun ? `[dry-run] ${msg}` : msg);
}

function copyTree(src, dest) {
  if (!existsSync(src)) {
    console.warn(`  ⚠ skip missing: ${src}`);
    return 0;
  }
  if (!dryRun) {
    ensureDir(dest);
    cpSync(src, dest, { recursive: true });
  }
  return countFiles(src);
}

function ensureDir(dir) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function countFiles(dir) {
  let n = 0;
  for (const item of readdirSync(dir)) {
    const p = join(dir, item);
    if (statSync(p).isDirectory()) n += countFiles(p);
    else n += 1;
  }
  return n;
}

function main() {
  console.log('╔════════════════════════════════════════╗');
  console.log('║   Publish QMF → ui.quizzman.com        ║');
  console.log('╚════════════════════════════════════════╝');

  if (!existsSync(DIST)) {
    console.error('dist/ not found. Run: node scripts/build-cdn.mjs');
    process.exit(1);
  }

  const distTarget = join(TARGET, 'dist');
  const v3Target = join(TARGET, 'v3');
  const assetsTarget = join(TARGET, 'assets', 'logo');

  log(`\n→ ${DIST} → ${distTarget}`);
  if (!dryRun) rmSync(distTarget, { recursive: true, force: true });
  const n1 = copyTree(DIST, distTarget);

  if (!dryRun) {
    ensureDir(v3Target);
    rmSync(v3Target, { recursive: true, force: true });
    ensureDir(v3Target);
  }
  log(`→ v3 aliases → ${v3Target}`);
  if (!dryRun) {
    const v3Src = join(DIST, 'v3');
    if (existsSync(v3Src)) cpSync(v3Src, v3Target, { recursive: true });
  }

  log(`→ logo assets → ${assetsTarget}`);
  if (!dryRun) rmSync(assetsTarget, { recursive: true, force: true });
  const n2 = copyTree(LOGO_SRC, assetsTarget);

  const fontsTarget = join(TARGET, 'assets', 'fonts');
  log(`→ font assets → ${fontsTarget}`);
  if (!dryRun) rmSync(fontsTarget, { recursive: true, force: true });
  const nFonts = copyTree(FONTS_SRC, fontsTarget);

  // Copy landing index if present
  const indexSrc = join(ROOT, 'index.html');
  const indexDest = join(TARGET, 'index.html');
  if (existsSync(indexSrc)) {
    log(`→ index.html → ${indexDest}`);
    if (!dryRun) {
      if (existsSync(indexDest) && statSync(indexDest).isDirectory()) rmSync(indexDest, { recursive: true });
      copyFileSync(indexSrc, indexDest);
    }
  }

  console.log(`\n✓ Published ~${n1 + n2 + nFonts} files`);
  console.log(`  CDN base: https://ui.quizzman.com/qmf/dist/`);
  console.log(`  Fonts:    https://ui.quizzman.com/qmf/assets/fonts/fonts.css`);
  console.log(`  Verify:   curl -sI https://ui.quizzman.com/qmf/dist/modules/header/unified-header.js`);
  console.log(`\n  Reload nginx if docroot changed:`);
  console.log(`    sudo nginx -t && sudo systemctl reload nginx`);
}

main();
