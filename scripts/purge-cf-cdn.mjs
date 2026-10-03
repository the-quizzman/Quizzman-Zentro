#!/usr/bin/env node
/**
 * Purge ui.quizzman.com QMF CDN paths via Cloudflare API.
 *
 * IMPORTANT: CF API tokens on this host are IPv4-allowlisted.
 * Always force family:4 — default dual-stack often returns "Invalid API Token".
 *
 * Usage:
 *   node scripts/purge-cf-cdn.mjs
 *   node scripts/purge-cf-cdn.mjs --files url1 url2
 *
 * Env (from /opt/.env or process):
 *   cf_api_token / CF_API_TOKEN
 *   cf_zone_id   / CF_ZONE_ID
 */
import https from 'node:https';
import { readFileSync } from 'node:fs';
import { URL } from 'node:url';

const CF_API = 'https://api.cloudflare.com/client/v4';
const DEFAULT_FILES = [
  'https://ui.quizzman.com/qmf/dist/modules/auth-widget/auth-widget.js',
  'https://ui.quizzman.com/qmf/dist/modules/shell/qmf-shell.js',
  'https://ui.quizzman.com/qmf/dist/modules/shell/qmf-shell.runtime.js',
  'https://ui.quizzman.com/qmf/dist/modules/shell/qmf-shell.rev',
  'https://ui.quizzman.com/qmf/dist/modules/header/lab-header.css',
  'https://ui.quizzman.com/qmf/dist/modules/header/unified-header.js',
  'https://ui.quizzman.com/qmf/dist/modules/join-overlay/join-overlay.js',
  'https://ui.quizzman.com/qmf/dist/modules/join-overlay/join-overlay.css',
  'https://ui.quizzman.com/qmf/dist/modules-v3/auth-widget/auth-widget.js',
  'https://ui.quizzman.com/qmf/dist/modules-v3/shell/qmf-shell.js',
  'https://ui.quizzman.com/qmf/dist/modules-v3/shell/qmf-shell.runtime.js',
  'https://ui.quizzman.com/qmf/dist/modules-v3/header/unified-header.js',
  'https://ui.quizzman.com/qmf/dist/modules-v3/join-overlay/join-overlay.js',
  'https://ui.quizzman.com/qmf/errors/',
  'https://ui.quizzman.com/qmf/errors/index.html',
  'https://ui.quizzman.com/qmf/errors/40x.html',
  'https://ui.quizzman.com/qmf/errors/50x.html',
];

function loadOptEnv() {
  try {
    const raw = readFileSync('/opt/.env', 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (!m) continue;
      const key = m[1];
      let val = m[2];
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (process.env[key] == null || process.env[key] === '') {
        process.env[key] = val;
      }
    }
  } catch {
    /* optional */
  }
}

/** Cloudflare API — IPv4 only (token allowlist). */
function ipv4Fetch(url, init = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const headers = { ...(init.headers || {}) };
    const req = https.request(
      {
        hostname: u.hostname,
        port: u.port || 443,
        path: `${u.pathname}${u.search}`,
        method: init.method || 'GET',
        headers,
        family: 4,
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const body = Buffer.concat(chunks);
          resolve({
            ok: (res.statusCode || 0) >= 200 && (res.statusCode || 0) < 300,
            status: res.statusCode || 0,
            async json() {
              try {
                return JSON.parse(body.toString('utf8') || '{}');
              } catch {
                return {};
              }
            },
            async text() {
              return body.toString('utf8');
            },
          });
        });
      },
    );
    req.on('error', reject);
    if (init.body) req.write(init.body);
    req.end();
  });
}

function parseFiles(argv) {
  const idx = argv.indexOf('--files');
  if (idx >= 0) {
    const list = argv.slice(idx + 1).filter((a) => !a.startsWith('--'));
    if (list.length) return list;
  }
  return DEFAULT_FILES;
}

async function main() {
  loadOptEnv();
  const token = process.env.CF_API_TOKEN || process.env.cf_api_token || '';
  const zoneId = process.env.CF_ZONE_ID || process.env.cf_zone_id || '';
  if (!token) {
    console.error('Missing cf_api_token / CF_API_TOKEN');
    process.exit(1);
  }
  if (!zoneId) {
    console.error('Missing cf_zone_id / CF_ZONE_ID');
    process.exit(1);
  }

  const files = parseFiles(process.argv.slice(2));
  console.log(`Purging ${files.length} URL(s) over IPv4…`);

  const res = await ipv4Fetch(`${CF_API}/zones/${zoneId}/purge_cache`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ files }),
  });
  const body = await res.json();
  if (!res.ok || body.success === false) {
    console.error('Purge failed', res.status, body.errors || body);
    process.exit(1);
  }
  console.log('✓ Cloudflare purge OK (IPv4)');
  for (const f of files) console.log('  ·', f);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
