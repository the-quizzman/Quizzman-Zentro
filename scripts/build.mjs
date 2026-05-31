#!/usr/bin/env node

/**
 * QMF Build Script
 * - Builds all packages via turbo
 * - Generates SRI hashes for all dist files
 * - Creates manifest.json with file sizes + hashes
 */

import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, join, relative, extname } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const DIST_DIR = resolve(ROOT, 'dist');
const PACKAGES_DIR = resolve(ROOT, 'packages');

// ─── Helpers ────────────────────────────────────────────────

function log(msg) {
  console.log(`\x1b[36m[build]\x1b[0m ${msg}`);
}

function success(msg) {
  console.log(`\x1b[32m✓\x1b[0m ${msg}`);
}

function error(msg) {
  console.error(`\x1b[31m✗\x1b[0m ${msg}`);
}

function computeSRI(content) {
  const hash = createHash('sha384').update(content).digest('base64');
  return `sha384-${hash}`;
}

function getFilesRecursive(dir, base = dir) {
  const results = [];
  if (!existsSync(dir)) return results;
  for (const name of readdirSync(dir)) {
    const fullPath = join(dir, name);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      results.push(...getFilesRecursive(fullPath, base));
    } else {
      results.push({
        path: relative(base, fullPath),
        fullPath,
        size: stat.size,
      });
    }
  }
  return results;
}

// ─── Main ───────────────────────────────────────────────────

async function main() {
  const startTime = Date.now();

  // Step 1: Regenerate logo and favicon variants from the canonical sources.
  log('Generating logo assets...');
  try {
    execSync('node scripts/generate-logo-variants.mjs --write', { cwd: ROOT, stdio: 'inherit' });
    success('Logo assets synchronized');
  } catch (e) {
    error('Logo asset generation failed');
    process.exit(1);
  }

  // Step 2: Build all packages via turbo
  log('Building packages with turbo...');
  try {
    execSync('pnpm turbo build', { cwd: ROOT, stdio: 'inherit' });
    success('All packages built');
  } catch (e) {
    error('Build failed');
    process.exit(1);
  }

  // Step 2: Collect all dist files
  log('Collecting dist files...');
  const manifest = {
    version: JSON.parse(readFileSync(resolve(ROOT, '.qmf-version'), 'utf-8').trim() || '"3.0.0"'),
    buildTime: new Date().toISOString(),
    packages: {},
  };

  const packageDirs = readdirSync(PACKAGES_DIR).filter(name => {
    const distPath = join(PACKAGES_DIR, name, 'dist');
    return existsSync(distPath);
  });

  for (const pkgName of packageDirs) {
    const distPath = join(PACKAGES_DIR, pkgName, 'dist');
    const files = getFilesRecursive(distPath);

    const pkgManifest = {
      name: `@qmf/${pkgName}`,
      files: {},
    };

    for (const file of files) {
      const content = readFileSync(file.fullPath);
      pkgManifest.files[file.path] = {
        size: file.size,
        sizeKB: Math.round(file.size / 1024 * 100) / 100,
        sri: computeSRI(content),
      };
    }

    manifest.packages[`@qmf/${pkgName}`] = pkgManifest;
  }

  // Step 3: Copy to consolidated dist/
  log('Creating consolidated dist...');
  mkdirSync(DIST_DIR, { recursive: true });

  for (const pkgName of packageDirs) {
    const srcDist = join(PACKAGES_DIR, pkgName, 'dist');
    const destDist = join(DIST_DIR, pkgName);
    mkdirSync(destDist, { recursive: true });

    const files = getFilesRecursive(srcDist);
    for (const file of files) {
      const dest = join(destDist, file.path);
      mkdirSync(resolve(dest, '..'), { recursive: true });
      const content = readFileSync(file.fullPath);
      writeFileSync(dest, content);
    }
  }

  // Step 4: Write manifest
  const manifestPath = join(DIST_DIR, 'manifest.json');
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  success(`Manifest written: ${manifestPath}`);

  // Step 5: Summary
  const elapsed = Date.now() - startTime;
  const totalFiles = Object.values(manifest.packages).reduce(
    (sum, pkg) => sum + Object.keys(pkg.files).length,
    0,
  );
  const totalSize = Object.values(manifest.packages).reduce(
    (sum, pkg) => sum + Object.values(pkg.files).reduce((s, f) => s + f.size, 0),
    0,
  );

  log('');
  success(`Build complete in ${(elapsed / 1000).toFixed(1)}s`);
  log(`  Packages: ${packageDirs.length}`);
  log(`  Files:    ${totalFiles}`);
  log(`  Total:    ${(totalSize / 1024).toFixed(1)} KB`);
}

main().catch((e) => {
  error(e.message);
  process.exit(1);
});
