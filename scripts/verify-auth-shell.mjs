#!/usr/bin/env node
/**
 * AST/HTML-based auth-shell guard (Phase 4).
 * Fails if migrated entrypoints still pin modules or use /settings.
 *
 * Usage: node scripts/verify-auth-shell.mjs
 */
import { readFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';

const CHECKS = [
  { file: '/opt/qm-id/frontend/pages/account.html', expectShell: true },
  { file: '/opt/qm-home/frontend/pages/index.html', expectShell: true },
  { file: '/opt/qm-dictionary/apps/dictionary/src/app/qmf-header-adapter.js', expectShell: true },
  { file: '/opt/qm-payments/frontend/public/js/qmf-header.js', expectShell: true },
  { file: '/opt/qm-classroom/frontend/assets/js/qmf-header.js', expectShell: true },
  { file: '/opt/qm-lms/apps/shell/src/modules/auth/view.js', expectShell: true },
  { file: '/opt/qm-application/apps/landing/src/lib/qmf-lab-header-loader.ts', expectShell: true },
  { file: '/opt/qm-application/apps/play-frontend/pages/play-house.html', expectShell: true },
  { file: '/opt/qm-lab/frontend/index.html', expectShell: true },
  { file: '/opt/qm-lab/frontend/helper/auth-header.js', expectShell: true },
  { file: '/opt/QMF/_src/modules/header/unified-header.js', expectShell: false, banSettings: true },
];

const BAN_SETTINGS = /id\.quizzman\.com\/settings/;
const BAN_PIN = /(?:unified-header|auth-widget|legatus-bridge)\.js\?v=/;
const HAS_SHELL = /qmf-shell\.js|QMFShell\.mount/;

let fail = 0;
for (const c of CHECKS) {
  if (!existsSync(c.file)) {
    console.log(`✗ missing ${c.file}`);
    fail++;
    continue;
  }
  const text = readFileSync(c.file, 'utf8');
  const issues = [];
  if (c.expectShell && !HAS_SHELL.test(text)) issues.push('missing QMFShell');
  if (BAN_SETTINGS.test(text)) issues.push('settings URL');
  if (c.expectShell && BAN_PIN.test(text) && !c.file.includes('unified-header')) {
    // allow comments? still flag direct pins in migrated entrypoints
    issues.push('module ?v= pin');
  }
  if (c.banSettings && BAN_SETTINGS.test(text)) issues.push('header default still settings');
  if (c.banSettings && !/id\.quizzman\.com\/account/.test(text)) issues.push('header missing account default');

  if (issues.length) {
    console.log(`✗ ${c.file}: ${issues.join(', ')}`);
    fail++;
  } else {
    console.log(`✓ ${c.file}`);
  }
}

// Live shell probe
try {
  const out = execSync('curl -sI https://ui.quizzman.com/qmf/dist/modules/shell/qmf-shell.js', { encoding: 'utf8' });
  const ok = /HTTP\/\d(?:\.\d)? 200/.test(out) && (/no-store|max-age=0|max-age=60/).test(out);
  console.log(ok ? '✓ CDN qmf-shell.js (200, no-store/short cache)' : '✗ CDN qmf-shell.js headers');
  if (!ok) fail++;
} catch {
  console.log('✗ CDN probe failed');
  fail++;
}

console.log(fail ? `\n${fail} check(s) failed` : '\nAll checks passed');
process.exit(fail ? 1 : 0);
