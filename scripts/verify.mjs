#!/usr/bin/env node

/**
 * QMF Verify Script
 * - Import boundary enforcement
 * - Bundle size budget checks
 * - Package export validation
 */

import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { resolve, join, relative } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const PACKAGES_DIR = resolve(ROOT, 'packages');

// ─── Constants ──────────────────────────────────────────────

const SIZE_BUDGETS_KB = {
  core: 30,
  tokens: 10,
  utils: 15,
  ui: 40,
  'auth-shell': 12,
  header: 20,
  footer: 10,
  'chat-embed': 25,
  'noti-embed': 20,
  'loading-screen': 15,
  cli: 20,
};

const LAYER_RULES = {
  // Core layer: cannot import from modules
  core: { forbidden: ['header', 'footer', 'chat-embed', 'noti-embed', 'loading-screen', 'auth-shell', 'cli'] },
  tokens: { forbidden: ['core', 'utils', 'ui', 'header', 'footer', 'chat-embed', 'noti-embed', 'loading-screen', 'auth-shell', 'cli'] },
  utils: { forbidden: ['ui', 'header', 'footer', 'chat-embed', 'noti-embed', 'loading-screen', 'auth-shell', 'cli'] },
  // UI layer: cannot import from modules
  ui: { forbidden: ['header', 'footer', 'chat-embed', 'noti-embed', 'loading-screen', 'auth-shell', 'cli'] },
};

// ─── Helpers ────────────────────────────────────────────────

let errors = 0;
let warnings = 0;

function success(msg) { console.log(`\x1b[32m✓\x1b[0m ${msg}`); }
function warn(msg) { warnings++; console.log(`\x1b[33m⚠\x1b[0m ${msg}`); }
function fail(msg) { errors++; console.log(`\x1b[31m✗\x1b[0m ${msg}`); }
function heading(msg) { console.log(`\n\x1b[1m\x1b[36m${msg}\x1b[0m\n`); }

function getFilesRecursive(dir, ext) {
  const results = [];
  if (!existsSync(dir)) return results;
  for (const name of readdirSync(dir)) {
    const fullPath = join(dir, name);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      results.push(...getFilesRecursive(fullPath, ext));
    } else if (name.endsWith(ext)) {
      results.push(fullPath);
    }
  }
  return results;
}

// ─── Check 1: Import Boundaries ────────────────────────────

function checkImportBoundaries() {
  heading('Import Boundary Enforcement');

  for (const [pkg, rules] of Object.entries(LAYER_RULES)) {
    const srcDir = join(PACKAGES_DIR, pkg, 'src');
    const tsFiles = getFilesRecursive(srcDir, '.ts');

    for (const file of tsFiles) {
      const content = readFileSync(file, 'utf-8');
      const relFile = relative(ROOT, file);

      for (const forbidden of rules.forbidden) {
        const importPattern = new RegExp(`from\\s+['"]@qmf/${forbidden}`, 'g');
        if (importPattern.test(content)) {
          fail(`${relFile}: @qmf/${pkg} must not import @qmf/${forbidden}`);
        }
      }
    }

    success(`@qmf/${pkg}: import boundaries OK`);
  }
}

// ─── Check 2: Bundle Size Budgets ──────────────────────────

function checkBundleSizes() {
  heading('Bundle Size Budgets');

  const packages = readdirSync(PACKAGES_DIR).filter(name => {
    return existsSync(join(PACKAGES_DIR, name, 'dist'));
  });

  for (const pkgName of packages) {
    const distDir = join(PACKAGES_DIR, pkgName, 'dist');
    const files = getFilesRecursive(distDir, '');
    const totalSize = files.reduce((sum, f) => sum + statSync(f).size, 0);
    const sizeKB = Math.round(totalSize / 1024 * 10) / 10;
    const budget = SIZE_BUDGETS_KB[pkgName] || 50;

    if (sizeKB > budget) {
      fail(`@qmf/${pkgName}: ${sizeKB}KB exceeds budget of ${budget}KB`);
    } else if (sizeKB > budget * 0.8) {
      warn(`@qmf/${pkgName}: ${sizeKB}KB (${Math.round(sizeKB / budget * 100)}% of ${budget}KB budget)`);
    } else {
      success(`@qmf/${pkgName}: ${sizeKB}KB (budget: ${budget}KB)`);
    }
  }
}

// ─── Check 3: Package Exports ──────────────────────────────

function checkPackageExports() {
  heading('Package Export Validation');

  const packages = readdirSync(PACKAGES_DIR).filter(name => {
    return existsSync(join(PACKAGES_DIR, name, 'package.json'));
  });

  for (const pkgName of packages) {
    const pkgPath = join(PACKAGES_DIR, pkgName, 'package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));

    // Verify required fields
    if (!pkg.name) fail(`@qmf/${pkgName}: missing "name" field`);
    if (!pkg.version) fail(`@qmf/${pkgName}: missing "version" field`);
    if (!pkg.exports) fail(`@qmf/${pkgName}: missing "exports" field`);

    // Verify type: module
    if (pkg.type !== 'module') warn(`@qmf/${pkgName}: should have "type": "module"`);

    // Verify sideEffects
    if (pkg.sideEffects === undefined) warn(`@qmf/${pkgName}: missing "sideEffects" field`);

    success(`@qmf/${pkgName}: package.json valid`);
  }
}

// ─── Check 4: Version Consistency ──────────────────────────

function checkVersionConsistency() {
  heading('Version Consistency');

  const rootVersion = readFileSync(resolve(ROOT, '.qmf-version'), 'utf-8').trim();

  const packages = readdirSync(PACKAGES_DIR).filter(name => {
    return existsSync(join(PACKAGES_DIR, name, 'package.json'));
  });

  for (const pkgName of packages) {
    const pkg = JSON.parse(readFileSync(join(PACKAGES_DIR, pkgName, 'package.json'), 'utf-8'));
    if (pkg.version !== rootVersion) {
      fail(`@qmf/${pkgName}: version ${pkg.version} != root ${rootVersion}`);
    } else {
      success(`@qmf/${pkgName}: v${pkg.version} ✓`);
    }
  }
}

// ─── Main ───────────────────────────────────────────────────

function main() {
  console.log('\x1b[1m\x1b[35m🔍 QMF Verification\x1b[0m');

  checkImportBoundaries();
  checkPackageExports();
  checkVersionConsistency();

  // Only check bundle sizes if dist exists
  const anyDist = readdirSync(PACKAGES_DIR).some(name =>
    existsSync(join(PACKAGES_DIR, name, 'dist'))
  );
  if (anyDist) {
    checkBundleSizes();
  }

  // Summary
  console.log('\n' + '─'.repeat(50));
  if (errors === 0 && warnings === 0) {
    success('All checks passed!');
  } else {
    if (errors > 0) fail(`${errors} error(s)`);
    if (warnings > 0) warn(`${warnings} warning(s)`);
    if (errors > 0) process.exit(1);
  }
}

main();
