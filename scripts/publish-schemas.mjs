#!/usr/bin/env node
/**
 * Publish QMF 4.0 JSON schemas to CDN docroot.
 * Target: /opt/QMF/schemas and /opt/Quizzman/qmf/schemas
 */
import { cpSync, mkdirSync, existsSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'packages/contract/schemas');
const targets = [join(root, 'schemas'), join(root, '../Quizzman/qmf/schemas')].filter((t) => {
  // Quizzman path may not exist
  const parent = dirname(t);
  return existsSync(parent) || t.includes('/QMF/schemas');
});

for (const dest of targets) {
  mkdirSync(dest, { recursive: true });
  for (const f of readdirSync(src)) {
    if (!f.endsWith('.json')) continue;
    cpSync(join(src, f), join(dest, f));
  }
  writeFileSync(
    join(dest, 'index.json'),
    JSON.stringify(
      {
        version: '4.0.0-alpha.1',
        schemas: readdirSync(src).filter((f) => f.endsWith('.json')),
        urls: {
          contract: '/qmf/schemas/qmf.schema.schema.json',
          manifest: '/qmf/schemas/module.manifest.schema.json',
          event: '/qmf/schemas/event.schema.json',
        },
      },
      null,
      2,
    ) + '\n',
  );
  console.log('✓ published', dest);
}
