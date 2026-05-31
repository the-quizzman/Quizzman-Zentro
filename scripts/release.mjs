#!/usr/bin/env node

/**
 * QMF Release Script
 * - Bumps version across all packages
 * - Updates CHANGELOG.md
 * - Creates dist archive
 * - Tags git commit
 */

import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const PACKAGES_DIR = resolve(ROOT, 'packages');

function log(msg) { console.log(`\x1b[35m[release]\x1b[0m ${msg}`); }
function success(msg) { console.log(`\x1b[32m✓\x1b[0m ${msg}`); }
function error(msg) { console.error(`\x1b[31m✗\x1b[0m ${msg}`); }

function getCurrentVersion() {
  const versionFile = resolve(ROOT, '.qmf-version');
  return readFileSync(versionFile, 'utf-8').trim();
}

function bumpVersion(version, type) {
  const [major, minor, patch] = version.split('.').map(Number);
  switch (type) {
    case 'major': return `${major + 1}.0.0`;
    case 'minor': return `${major}.${minor + 1}.0`;
    case 'patch': return `${major}.${minor}.${patch + 1}`;
    default: return version;
  }
}

function updatePackageVersion(pkgPath, newVersion) {
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
  pkg.version = newVersion;
  // Update internal deps
  for (const depField of ['dependencies', 'devDependencies', 'peerDependencies']) {
    if (pkg[depField]) {
      for (const [name, ver] of Object.entries(pkg[depField])) {
        if (name.startsWith('@qmf/') && ver === 'workspace:*') continue;
        if (name.startsWith('@qmf/')) pkg[depField][name] = `^${newVersion}`;
      }
    }
  }
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
}

async function main() {
  const bumpType = process.argv[2] || 'patch';
  if (!['major', 'minor', 'patch'].includes(bumpType)) {
    error(`Invalid bump type: ${bumpType}. Use: major | minor | patch`);
    process.exit(1);
  }

  const currentVersion = getCurrentVersion();
  const newVersion = bumpVersion(currentVersion, bumpType);
  log(`Bumping ${currentVersion} → ${newVersion} (${bumpType})`);

  // 1. Update .qmf-version
  writeFileSync(resolve(ROOT, '.qmf-version'), newVersion);
  success('.qmf-version updated');

  // 2. Update root package.json
  const rootPkgPath = resolve(ROOT, 'package.json');
  updatePackageVersion(rootPkgPath, newVersion);
  success('Root package.json updated');

  // 3. Update all package versions
  const packages = readdirSync(PACKAGES_DIR).filter(name => {
    return existsSync(join(PACKAGES_DIR, name, 'package.json'));
  });

  for (const pkgName of packages) {
    const pkgPath = join(PACKAGES_DIR, pkgName, 'package.json');
    updatePackageVersion(pkgPath, newVersion);
    success(`@qmf/${pkgName} updated to ${newVersion}`);
  }

  // 4. Update CHANGELOG.md
  const changelogPath = resolve(ROOT, 'CHANGELOG.md');
  const date = new Date().toISOString().split('T')[0];
  const changelogEntry = `\n## [${newVersion}] — ${date}\n\n- Version bump (${bumpType})\n`;

  if (existsSync(changelogPath)) {
    const existing = readFileSync(changelogPath, 'utf-8');
    const insertPos = existing.indexOf('\n## ');
    if (insertPos > 0) {
      writeFileSync(changelogPath, existing.slice(0, insertPos) + changelogEntry + existing.slice(insertPos));
    } else {
      writeFileSync(changelogPath, existing + changelogEntry);
    }
  } else {
    writeFileSync(changelogPath, `# QMF Framework Changelog\n${changelogEntry}`);
  }
  success('CHANGELOG.md updated');

  // 5. Build
  log('Building...');
  try {
    execSync('node scripts/build.mjs', { cwd: ROOT, stdio: 'inherit' });
  } catch {
    error('Build failed');
    process.exit(1);
  }

  // 6. Git tag
  log('Creating git tag...');
  try {
    execSync(`git add -A && git commit -m "release: v${newVersion}"`, { cwd: ROOT, stdio: 'pipe' });
    execSync(`git tag -a v${newVersion} -m "v${newVersion}"`, { cwd: ROOT, stdio: 'pipe' });
    success(`Tagged v${newVersion}`);
  } catch {
    log('Git operations skipped (no git or nothing to commit)');
  }

  log('');
  success(`Released v${newVersion}`);
  log('  Next: push to remote with `git push --follow-tags`');
}

main().catch((e) => {
  error(e.message);
  process.exit(1);
});
