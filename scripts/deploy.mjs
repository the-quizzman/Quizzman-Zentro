#!/usr/bin/env node
/**
 * QMF Deploy Script - Uploads dist to CDN/server
 * 
 * Targets:
 *   - https://ui.quizzman.com/qmf/v3/
 *   - npm registry (optional)
 * 
 * Usage:
 *   node scripts/deploy.mjs --target cdn
 *   node scripts/deploy.mjs --target npm
 *   node scripts/deploy.mjs --target all
 */

import { execSync } from 'child_process';
import { existsSync, readdirSync, statSync } from 'fs';
import { join, resolve } from 'path';

const ROOT = resolve(import.meta.dirname, '..');
const DIST = join(ROOT, 'dist');
const LOGO_ASSETS_DIR = join(ROOT, 'assets', 'logo');

// Parse args
const args = process.argv.slice(2);
const target = args.includes('--target') 
  ? args[args.indexOf('--target') + 1] 
  : 'cdn';
const dryRun = args.includes('--dry-run');

// CDN Config (update these for your setup)
const CDN_CONFIG = {
  // Option 1: rsync to server
  rsync: {
    host: 'ui.quizzman.com',
    user: 'deploy',
    remotePath: '/opt/Quizzman/qmf/dist/',
    logoAssetsRemotePath: '/opt/Quizzman/qmf/assets/logo/',
  },
  // Option 2: S3/R2 bucket
  s3: {
    bucket: 'qmf-cdn',
    region: 'auto',
    prefix: 'qmf/v3/',
  },
};

// ─── Helpers ────────────────────────────────────────────────

function run(cmd, opts = {}) {
  console.log(`\n$ ${cmd}`);
  if (dryRun) {
    console.log('  (dry-run, skipped)');
    return;
  }
  try {
    execSync(cmd, { cwd: ROOT, stdio: 'inherit', ...opts });
  } catch (err) {
    console.error(`Command failed: ${cmd}`);
    process.exit(1);
  }
}

function listFiles(dir, prefix = '') {
  const files = [];
  for (const item of readdirSync(dir)) {
    const itemPath = join(dir, item);
    const relPath = prefix ? `${prefix}/${item}` : item;
    if (statSync(itemPath).isDirectory()) {
      files.push(...listFiles(itemPath, relPath));
    } else {
      files.push(relPath);
    }
  }
  return files;
}

// ─── Deploy to CDN ──────────────────────────────────────────

async function deployCDN() {
  console.log('╔════════════════════════════════════════╗');
  console.log('║      Deploying to CDN                  ║');
  console.log('╚════════════════════════════════════════╝');

  run('node scripts/generate-logo-variants.mjs --write');

  if (!existsSync(DIST)) {
    console.error('dist/ not found. Run `node scripts/build-dist.mjs` first.');
    process.exit(1);
  }

  if (!existsSync(LOGO_ASSETS_DIR)) {
    console.error('assets/logo/ not found.');
    process.exit(1);
  }

  const files = listFiles(DIST);
  const logoFiles = listFiles(LOGO_ASSETS_DIR);
  console.log(`\nFiles to deploy: ${files.length}`);
  files.forEach(f => console.log(`  - ${f}`));
  console.log(`\nLogo assets to deploy: ${logoFiles.length}`);
  logoFiles.forEach(f => console.log(`  - assets/logo/${f}`));

  // Method 1: rsync (recommended for VPS)
  const { host, user, remotePath, logoAssetsRemotePath } = CDN_CONFIG.rsync;
  const rsyncCmd = [
    'rsync -avz --progress --delete',
    `${DIST}/`,
    `${user}@${host}:${remotePath}`,
  ].join(' ');
  const logoRsyncCmd = [
    'rsync -avz --progress --delete',
    `${LOGO_ASSETS_DIR}/`,
    `${user}@${host}:${logoAssetsRemotePath}`,
  ].join(' ');

  console.log('\n→ Uploading via rsync...');
  run(rsyncCmd);
  console.log('\n→ Uploading logo assets via rsync...');
  run(logoRsyncCmd);

  // Alternative: S3/R2
  // const { bucket, prefix } = CDN_CONFIG.s3;
  // run(`aws s3 sync ${DIST}/ s3://${bucket}/${prefix} --delete`);

  console.log('\n✓ CDN deploy complete!');
  console.log(`  URL: https://ui.quizzman.com/qmf/v3/`);
}

// ─── Publish to npm ─────────────────────────────────────────

async function deployNpm() {
  console.log('╔════════════════════════════════════════╗');
  console.log('║      Publishing to npm                 ║');
  console.log('╚════════════════════════════════════════╝');

  // Check changesets status
  console.log('\n→ Checking changesets...');
  run('pnpm changeset status');

  // Version packages
  console.log('\n→ Versioning packages...');
  run('pnpm changeset version');

  // Build all packages
  console.log('\n→ Building packages...');
  run('pnpm build');

  // Publish
  console.log('\n→ Publishing to npm...');
  run('pnpm changeset publish');

  console.log('\n✓ npm publish complete!');
}

// ─── Main ───────────────────────────────────────────────────

async function main() {
  console.log(`Target: ${target}`);
  console.log(`Dry run: ${dryRun}`);

  switch (target) {
    case 'cdn':
      await deployCDN();
      break;
    case 'npm':
      await deployNpm();
      break;
    case 'all':
      await deployCDN();
      await deployNpm();
      break;
    default:
      console.error(`Unknown target: ${target}`);
      console.log('Usage: node scripts/deploy.mjs --target [cdn|npm|all]');
      process.exit(1);
  }
}

main().catch(console.error);
