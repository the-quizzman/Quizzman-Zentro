#!/usr/bin/env node
/**
 * Publish QMF 4.0 packages to local Verdaccio (ui.quizzman.com/registry).
 *
 * Usage:
 *   node scripts/publish-v4.mjs
 */
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const REG = 'http://127.0.0.1:4873/';
const ROOT = new URL('..', import.meta.url).pathname;
const PACKAGES = ['contract', 'events', 'inspect', 'runtime', 'qmf-cli'];

const npmrcSrc = readFileSync(join(ROOT, '.npmrc'), 'utf8');
const auth = (npmrcSrc.match(/_auth=(.+)/) || [])[1];
if (!auth) {
  console.error('Missing //127.0.0.1:4873/:_auth in .npmrc');
  process.exit(1);
}

const dir = mkdtempSync(join(tmpdir(), 'qmf-pub-'));
const userconfig = join(dir, '.npmrc');
writeFileSync(
  userconfig,
  `registry=${REG}\n//127.0.0.1:4873/:_auth=${auth}\n//127.0.0.1:4873/:always-auth=true\nemail=admin@quizzman.com\n`,
);

try {
  for (const pkg of PACKAGES) {
    console.log(`\n→ publish @qmf/${pkg}`);
    execSync(`npm publish --userconfig ${userconfig} --registry ${REG} --access public`, {
      cwd: join(ROOT, 'packages', pkg),
      stdio: 'inherit',
    });
  }
  console.log('\n✓ published:');
  for (const pkg of PACKAGES) {
    const v = execSync(`npm view @qmf/${pkg} version --registry ${REG}`, {
      encoding: 'utf8',
    }).trim();
    console.log(`  @qmf/${pkg}@${v}`);
  }
  console.log('\nInstall:\n  npm i @qmf/runtime@4.0.0-alpha.1 --registry https://ui.quizzman.com/registry/');
} finally {
  rmSync(dir, { recursive: true, force: true });
}
