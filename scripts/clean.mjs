#!/usr/bin/env node

/**
 * QMF Clean Script
 * Removes all dist/, node_modules/.cache, and turbo cache
 */

import { rmSync, readdirSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const PACKAGES_DIR = resolve(ROOT, 'packages');

function log(msg) { console.log(`\x1b[33m[clean]\x1b[0m ${msg}`); }
function success(msg) { console.log(`\x1b[32m✓\x1b[0m ${msg}`); }

const dirsToClean = [
  resolve(ROOT, 'dist'),
  resolve(ROOT, 'node_modules/.cache'),
  resolve(ROOT, '.turbo'),
];

// Add per-package dist dirs
if (existsSync(PACKAGES_DIR)) {
  for (const name of readdirSync(PACKAGES_DIR)) {
    dirsToClean.push(join(PACKAGES_DIR, name, 'dist'));
    dirsToClean.push(join(PACKAGES_DIR, name, '.turbo'));
  }
}

let cleaned = 0;
for (const dir of dirsToClean) {
  if (existsSync(dir)) {
    log(`Removing ${dir.replace(ROOT + '/', '')}`);
    rmSync(dir, { recursive: true, force: true });
    cleaned++;
  }
}

success(`Cleaned ${cleaned} directories`);
