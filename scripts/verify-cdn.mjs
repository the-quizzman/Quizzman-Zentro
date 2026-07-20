#!/usr/bin/env node
/** Quick health check for ui.quizzman.com QMF CDN */
import { execSync } from 'child_process';

const BASE = process.env.QMF_CDN_BASE || 'https://ui.quizzman.com';
const PATHS = [
  '/qmf/dist/qmf.min.js',
  '/qmf/dist/tokens.css',
  '/qmf/dist/ui.css',
  '/qmf/dist/manifest.json',
  '/qmf/dist/modules/header/unified-header.js',
  '/qmf/dist/modules-v3/header/unified-header.js',
  '/qmf/dist/modules/join-overlay/join-overlay.js',
  '/qmf/dist/modules/join-overlay/join-overlay.css',
  '/qmf/dist/modules-v3/join-overlay/join-overlay.js',
  '/qmf/dist/modules-v3/join-overlay/join-overlay.css',
  '/qmf/dist/modules/auth-widget/auth-widget.js',
  '/qmf/dist/modules/settings-float/settings-float.js',
  '/qmf/dist/modules/loading-screen/loading-screen.js',
  '/qmf/dist/modules/loading-screen/loading-screen.css',
  '/qmf/v3/qmf.min.js',
  '/qmf/assets/logo/quizzman-logo.png',
];

let ok = 0;
let fail = 0;

console.log(`QMF CDN verify — ${BASE}\n`);

for (const p of PATHS) {
  const url = BASE + p;
  try {
    const out = execSync(`curl -sS -o /dev/null -w '%{http_code}' '${url}'`, { encoding: 'utf8' }).trim();
    const pass = out === '200';
    console.log(`${pass ? '✓' : '✗'} ${out} ${p}`);
    pass ? ok++ : fail++;
  } catch {
    console.log(`✗ ERR ${p}`);
    fail++;
  }
}

console.log(`\n${ok}/${PATHS.length} OK`);
process.exit(fail ? 1 : 0);
