#!/usr/bin/env node
/**
 * Phase 0 — Auth Shell audit across Quizzman domains.
 * Read-only: scans local repos + optional live HTTP probes.
 *
 * Usage:
 *   node scripts/audit-auth-shell.mjs
 *   node scripts/audit-auth-shell.mjs --live
 *   node scripts/audit-auth-shell.mjs --out reports/auth-shell-audit
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, extname } from 'node:path';
import { execSync } from 'node:child_process';

const ROOT = new URL('..', import.meta.url).pathname;
const args = process.argv.slice(2);
const DO_LIVE = args.includes('--live');
const outIdx = args.indexOf('--out');
const OUT_BASE = outIdx >= 0 ? args[outIdx + 1] : join(ROOT, 'reports', 'auth-shell-audit');

/** @type {{ domain: string, repo: string, globs?: string[], liveUrls?: string[] }[]} */
const TARGETS = [
  {
    domain: 'lab.quizzman.com',
    repo: '/opt/qm-lab',
    liveUrls: ['https://lab.quizzman.com/', 'https://lab.quizzman.com/tool/iching-divination.html'],
  },
  {
    domain: 'app.quizzman.com',
    repo: '/opt/qm-application',
    liveUrls: ['https://app.quizzman.com/'],
  },
  {
    domain: 'study.quizzman.com',
    repo: '/opt/qm-mandarin/Quizzman-mandarin-main',
    liveUrls: ['https://study.quizzman.com/'],
  },
  {
    domain: 'lms.quizzman.com',
    repo: '/opt/qm-lms',
    liveUrls: ['https://lms.quizzman.com/'],
  },
  {
    domain: 'class.quizzman.com',
    repo: '/opt/qm-classroom',
    liveUrls: ['https://class.quizzman.com/'],
  },
  {
    domain: 'quizzman.com',
    repo: '/opt/qm-home',
    liveUrls: ['https://quizzman.com/'],
  },
  {
    domain: 'dict.quizzman.com',
    repo: '/opt/qm-dictionary',
    liveUrls: ['https://dict.quizzman.com/'],
  },
  {
    domain: 'ui.quizzman.com',
    repo: '/opt/QMF',
    liveUrls: [
      'https://ui.quizzman.com/qmf/dist/modules/header/unified-header.js',
      'https://ui.quizzman.com/qmf/dist/modules/auth-widget/auth-widget.js',
      'https://ui.quizzman.com/qmf/dist/modules/header/legatus-bridge.js',
    ],
  },
  {
    domain: 'play.quizzman.com',
    repo: '/opt/qm-application/apps/play-frontend',
    liveUrls: ['https://play.quizzman.com/'],
  },
  {
    domain: 'payments.quizzman.com',
    repo: '/opt/qm-payments',
    liveUrls: ['https://payments.quizzman.com/'],
  },
  {
    domain: 'id.quizzman.com',
    repo: '/opt/qm-id',
    liveUrls: ['https://id.quizzman.com/account', 'https://id.quizzman.com/settings', 'https://id.quizzman.com/profile'],
  },
];

const SKIP_DIR = new Set([
  'node_modules', '.git', 'dist', 'build', '.next', 'coverage',
  'target', 'vendor', '__pycache__', '.turbo', 'playwright-report',
]);

const EXT_OK = new Set(['.html', '.htm', '.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx', '.vue']);

function walk(dir, files = [], depth = 0) {
  if (depth > 12 || !existsSync(dir)) return files;
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return files;
  }
  for (const ent of entries) {
    if (ent.name.startsWith('.') && ent.name !== '.html') continue;
    if (SKIP_DIR.has(ent.name)) continue;
    const p = join(dir, ent.name);
    if (ent.isDirectory()) {
      // Skip huge vendored trees except qmf copies we care about
      if (ent.name === 'public' || ent.name === 'qmf' || ent.name === 'frontend' ||
          ent.name === 'apps' || ent.name === 'modules' || ent.name === 'pages' ||
          ent.name === 'helper' || ent.name === 'src' || ent.name === '_src' ||
          ent.name === 'tool' || ent.name === 'assets' || ent.name === 'shared' ||
          depth < 4) {
        walk(p, files, depth + 1);
      } else if (depth < 6) {
        walk(p, files, depth + 1);
      }
    } else if (EXT_OK.has(extname(ent.name).toLowerCase())) {
      const st = statSync(p);
      if (st.size > 0 && st.size < 2_000_000) files.push(p);
    }
  }
  return files;
}

function analyzeFile(path, text) {
  const findings = {
    path,
    createAuthWidget: /\bcreateAuthWidget\s*\(/.test(text),
    authHeaderCustom: /auth-header\.js|lah-|class=['\"]lah-/.test(text),
    ssoRefresh: /sso-refresh\.js/.test(text),
    idSysSso: /id-sys-sso\.js|IdSysSSO/.test(text),
    authJs: /id\.quizzman\.com\/module\/auth\.js|\/module\/auth\.js/.test(text),
    quizzmanSso: /\bQuizzmanSSO\b/.test(text),
    quizzmanAuth: /\bQuizzmanAuth\b/.test(text),
    unifiedHeader: /unified-header\.js|createUnifiedHeader/.test(text),
    authWidgetSrc: /auth-widget\.js/.test(text),
    legatusBridge: /legatus-bridge\.js|mountLegatusInHeader/.test(text),
    autoMountLegatusFalse: /autoMountLegatus\s*:\s*false/.test(text),
    autoMountLegatusTrue: /autoMountLegatus\s*:\s*true/.test(text),
    settingsUrl: /id\.quizzman\.com\/settings|settingsUrl\s*:\s*['\"][^'\"]*settings/.test(text),
    accountUrl: /id\.quizzman\.com\/account|accountUrl\s*:\s*['\"][^'\"]*account|profileUrl\s*:\s*['\"][^'\"]*account/.test(text),
    profileUrlSettings: /profileUrl\s*:\s*['\"][^'\"]*\/settings/.test(text),
    modulesV3: /modules-v3\//.test(text),
    modulesPath: /\/qmf\/dist\/modules\//.test(text),
    localForkAuth: /vendor\/qmf.*auth-widget|frontend\/qmf\/auth-widget|\/module\/auth-widget\.js/.test(text),
    localForkHeader: /vendor\/qmf.*unified-header|frontend\/qmf\/unified-header/.test(text),
    lumenBar: /qmf-auth-lumen-bar|showLumenBadge/.test(text),
    planRing: /qmf-plan-ring|data-tier/.test(text),
    qmfShell: /qmf-shell\.js|QMFShell\.mount/.test(text),
    typeModule: /type\s*=\s*["']module["']/.test(text),
    deferScript: /<script[^>]*\sdefer[\s>]/.test(text),
    asyncScript: /<script[^>]*\sasync[\s>]/.test(text),
    preload: /rel\s*=\s*["']preload["']/.test(text),
    httpMixed: /http:\/\/(?!localhost)/.test(text),
    serviceWorker: /serviceWorker|navigator\.serviceWorker|sw\.js|service-worker/.test(text),
    pins: [],
  };

  const pinRe = /(?:unified-header|auth-widget|legatus-bridge|lab-header|sso-refresh|id-sys-sso|qmf-shell)[^"'?\s]*\?v=([^"'&\s]+)/g;
  let m;
  while ((m = pinRe.exec(text))) findings.pins.push(m[0].slice(0, 120));

  const verRe = /(?:HEADER_VER|QMF_V|VERSION)\s*=\s*['"`]([^'"`]+)['"`]/g;
  while ((m = verRe.exec(text))) findings.pins.push(`const:${m[0]}`);

  return findings;
}

function summarizeDomain(domain, repo, fileFindings) {
  const relevant = fileFindings.filter((f) =>
    f.createAuthWidget || f.authHeaderCustom || f.ssoRefresh || f.idSysSso ||
    f.unifiedHeader || f.authWidgetSrc || f.legatusBridge || f.settingsUrl ||
    f.accountUrl || f.localForkAuth || f.localForkHeader || f.qmfShell ||
    f.pins.length > 0
  );

  const count = (key) => relevant.filter((f) => f[key]).length;
  const allPins = [...new Set(relevant.flatMap((f) => f.pins))];

  const authModes = [];
  if (count('createAuthWidget')) authModes.push('createAuthWidget');
  if (count('authHeaderCustom')) authModes.push('custom-auth-header');
  if (!authModes.length && count('unifiedHeader')) authModes.push('header-only');
  if (!authModes.length) authModes.push('none-detected');

  const sso = [];
  if (count('ssoRefresh')) sso.push('sso-refresh');
  if (count('idSysSso')) sso.push('id-sys-sso');
  if (count('authJs')) sso.push('auth.js');
  if (!sso.length) sso.push('none');

  const issues = [];
  if (count('settingsUrl') || count('profileUrlSettings')) issues.push('settings_url_404_risk');
  if (count('authHeaderCustom')) issues.push('custom_auth_header');
  if (count('localForkAuth') || count('localForkHeader')) issues.push('local_fork');
  if (count('modulesV3')) issues.push('modules_v3');
  if (sso.includes('none') && (count('createAuthWidget') || count('authHeaderCustom'))) {
    issues.push('no_early_sso_script');
  }
  if (count('autoMountLegatusFalse') === 0 && count('legatusBridge') > 0 && count('autoMountLegatusTrue') === 0) {
    // may still early-mount via header default
    if (count('unifiedHeader')) issues.push('legatus_may_early_mount');
  }
  if (count('httpMixed')) issues.push('mixed_protocol');
  if (count('serviceWorker')) issues.push('has_service_worker');
  if (authModes.includes('header-only')) issues.push('missing_auth_widget');
  if (count('qmfShell') === 0 && (count('createAuthWidget') || count('unifiedHeader'))) {
    issues.push('not_on_qmf_shell');
  }

  // Duplicate heuristics: many files mounting auth
  if (count('createAuthWidget') > 15) issues.push('many_auth_mount_sites');
  if (count('unifiedHeader') > 20) issues.push('many_header_mount_sites');

  return {
    domain,
    repo,
    filesScanned: fileFindings.length,
    relevantFiles: relevant.length,
    authModes,
    sso,
    counts: {
      createAuthWidget: count('createAuthWidget'),
      authHeaderCustom: count('authHeaderCustom'),
      unifiedHeader: count('unifiedHeader'),
      authWidgetSrc: count('authWidgetSrc'),
      legatusBridge: count('legatusBridge'),
      settingsUrl: count('settingsUrl'),
      accountUrl: count('accountUrl'),
      localFork: count('localForkAuth') + count('localForkHeader'),
      modulesV3: count('modulesV3'),
      lumenBar: count('lumenBar'),
      planRing: count('planRing'),
      qmfShell: count('qmfShell'),
      typeModule: count('typeModule'),
      defer: count('deferScript'),
      async: count('asyncScript'),
      preload: count('preload'),
      serviceWorker: count('serviceWorker'),
    },
    pins: allPins.slice(0, 40),
    issues,
    samplePaths: relevant.slice(0, 25).map((f) => relative(repo, f.path)),
  };
}

function probeLive(url) {
  try {
    const headers = execSync(`curl -sSIL --max-time 12 '${url}'`, { encoding: 'utf8', maxBuffer: 2_000_000 });
    const body = execSync(`curl -sSL --max-time 12 '${url}' | head -c 200000`, { encoding: 'utf8', maxBuffer: 300_000 });
    const get = (name) => {
      const re = new RegExp(`^${name}:\\s*(.+)$`, 'im');
      const m = headers.match(re);
      return m ? m[1].trim() : null;
    };
    const scripts = [...body.matchAll(/<script[^>]+src=["']([^"']+)["'][^>]*>/gi)].map((m) => m[1]);
    const preloads = [...body.matchAll(/rel=["']preload["'][^>]*href=["']([^"']+)["']/gi)].map((m) => m[1]);
    return {
      url,
      ok: true,
      status: (headers.match(/HTTP\/[\d.]+ (\d+)/) || [])[1] || null,
      cacheControl: get('cache-control'),
      csp: get('content-security-policy'),
      contentType: get('content-type'),
      cfCache: get('cf-cache-status'),
      scriptCount: scripts.length,
      scripts: scripts.slice(0, 30),
      preloads: preloads.slice(0, 15),
      hasSsoRefresh: scripts.some((s) => s.includes('sso-refresh')),
      hasAuthWidget: scripts.some((s) => s.includes('auth-widget')),
      hasHeader: scripts.some((s) => s.includes('unified-header')),
      hasShell: scripts.some((s) => s.includes('qmf-shell')),
      hasSettingsInHtml: /id\.quizzman\.com\/settings/.test(body),
      hasAccountInHtml: /id\.quizzman\.com\/account/.test(body),
      typeModule: /type=["']module["']/.test(body),
      defer: /<script[^>]*\sdefer/.test(body),
      async: /<script[^>]*\sasync/.test(body),
    };
  } catch (err) {
    return { url, ok: false, error: String(err.message || err).slice(0, 200) };
  }
}

function toCsv(rows) {
  const cols = [
    'domain', 'repo', 'authModes', 'sso', 'issues',
    'createAuthWidget', 'authHeaderCustom', 'unifiedHeader', 'settingsUrl', 'accountUrl',
    'localFork', 'modulesV3', 'qmfShell', 'pins',
  ];
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = [cols.join(',')];
  for (const r of rows) {
    lines.push([
      r.domain, r.repo, r.authModes.join('|'), r.sso.join('|'), r.issues.join('|'),
      r.counts.createAuthWidget, r.counts.authHeaderCustom, r.counts.unifiedHeader,
      r.counts.settingsUrl, r.counts.accountUrl, r.counts.localFork, r.counts.modulesV3,
      r.counts.qmfShell, r.pins.slice(0, 8).join('; '),
    ].map(esc).join(','));
  }
  return lines.join('\n');
}

function main() {
  mkdirSync(OUT_BASE.includes('.') ? join(OUT_BASE, '..') : OUT_BASE, { recursive: true });
  const outDir = OUT_BASE.endsWith('.json') ? join(OUT_BASE, '..') : OUT_BASE;
  mkdirSync(outDir, { recursive: true });

  const domains = [];
  const allFiles = [];

  console.log('╔════════════════════════════════════════╗');
  console.log('║  QMF Auth Shell Audit — Phase 0        ║');
  console.log('╚════════════════════════════════════════╝\n');

  for (const t of TARGETS) {
    process.stdout.write(`→ ${t.domain} (${t.repo}) … `);
    if (!existsSync(t.repo)) {
      console.log('MISSING REPO');
      domains.push({ domain: t.domain, repo: t.repo, error: 'repo_missing', issues: ['repo_missing'] });
      continue;
    }
    const files = walk(t.repo);
    const findings = [];
    for (const f of files) {
      let text;
      try {
        text = readFileSync(f, 'utf8');
      } catch {
        continue;
      }
      // Quick prefilter to skip unrelated files
      if (!/auth|header|sso|legatus|quizzman|QMF|account|settings|lumen/i.test(text) &&
          !/\.html?$/i.test(f)) {
        continue;
      }
      const a = analyzeFile(f, text);
      findings.push(a);
      allFiles.push({ domain: t.domain, ...a, path: relative(t.repo, f) });
    }
    const summary = summarizeDomain(t.domain, t.repo, findings);
    if (DO_LIVE && t.liveUrls?.length) {
      summary.live = t.liveUrls.map(probeLive);
      for (const L of summary.live) {
        if (L.ok && L.hasSettingsInHtml) summary.issues.push('live_settings_url');
        if (L.ok && L.status === '404') summary.issues.push(`live_404:${L.url}`);
        if (L.ok && L.csp && /script-src/i.test(L.csp) && !/ui\.quizzman\.com|cdn/i.test(L.csp)) {
          summary.issues.push('csp_may_block_cdn');
        }
      }
      summary.issues = [...new Set(summary.issues)];
    }
    domains.push(summary);
    console.log(`${summary.relevantFiles} relevant / ${summary.filesScanned} scanned · issues: ${summary.issues.join(', ') || 'none'}`);
  }

  const report = {
    generatedAt: new Date().toISOString(),
    liveProbes: DO_LIVE,
    domains,
    fileCount: allFiles.length,
  };

  const jsonPath = join(outDir, 'auth-shell-audit.json');
  const csvPath = join(outDir, 'auth-shell-audit.csv');
  const mdPath = join(outDir, 'auth-shell-audit.md');
  const filesPath = join(outDir, 'auth-shell-audit-files.json');

  writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  writeFileSync(csvPath, toCsv(domains.filter((d) => !d.error)));
  writeFileSync(filesPath, JSON.stringify(allFiles, null, 2));

  const md = [];
  md.push('# Auth Shell Audit — Phase 0');
  md.push('');
  md.push(`Generated: ${report.generatedAt}`);
  md.push(`Live probes: ${DO_LIVE ? 'yes' : 'no (pass --live)'}`);
  md.push('');
  md.push('| Domain | Auth | SSO | Issues | settings? | account? | forks | pins (sample) |');
  md.push('|--------|------|-----|--------|-----------|----------|-------|---------------|');
  for (const d of domains) {
    if (d.error) {
      md.push(`| ${d.domain} | — | — | ${d.error} | — | — | — | — |`);
      continue;
    }
    md.push(`| ${d.domain} | ${d.authModes.join(', ')} | ${d.sso.join(', ')} | ${d.issues.join(', ') || '—'} | ${d.counts.settingsUrl} | ${d.counts.accountUrl} | ${d.counts.localFork} | ${(d.pins[0] || '—').replace(/\|/g, '/')} |`);
  }
  md.push('');
  md.push('## Top issues by frequency');
  const freq = {};
  for (const d of domains) {
    for (const i of d.issues || []) freq[i] = (freq[i] || 0) + 1;
  }
  for (const [k, v] of Object.entries(freq).sort((a, b) => b[1] - a[1])) {
    md.push(`- **${k}**: ${v} domain(s)`);
  }
  md.push('');
  md.push('## Next');
  md.push('Review this report, then Phase 1 contract + Phase 2 `qmf-shell` on ui CDN.');
  md.push('');
  writeFileSync(mdPath, md.join('\n'));

  console.log(`\n✓ Wrote:\n  ${jsonPath}\n  ${csvPath}\n  ${mdPath}\n  ${filesPath}`);
}

main();
