/**
 * QMF 4.0 live browser demo — boots example app modules in the page.
 */
import { bootstrapFromContractUrl } from '@qmf/runtime';
import { subscribe, emit } from '@qmf/events';

const statusEl = document.getElementById('status');
const inspectOut = document.getElementById('inspect-out');
const eventLog = document.getElementById('event-log');

/** @type {{ id: string|null, tier: string|null }} */
let session = { id: 'demo-user', tier: 'pro' };

const DICT = [
  { id: '1', title: 'quiz — bài kiểm tra ngắn', keys: ['quiz', 'test'] },
  { id: '2', title: 'QMF — Quizzman Module Framework', keys: ['qmf', 'framework', 'module'] },
  { id: '3', title: 'react — thư viện UI (adapter, không phải core)', keys: ['react', 'ui'] },
  { id: '4', title: 'contract — qmf.schema.json là SSOT', keys: ['contract', 'schema', 'qmf'] },
  { id: '5', title: 'event bus — typed defineEvent / emit / subscribe', keys: ['event', 'bus', 'emit'] },
  { id: '6', title: 'dictionary — module tìm kiếm mẫu', keys: ['dict', 'dictionary', 'search'] },
];

function setStatus(text, cls) {
  statusEl.textContent = text;
  statusEl.className = cls || '';
}

function logEvent(name, payload) {
  if (eventLog.textContent === 'waiting…') eventLog.textContent = '';
  const row = document.createElement('div');
  row.className = 'e';
  const t = new Date().toLocaleTimeString();
  const pre = document.createElement('div');
  pre.innerHTML = `<span class="name">${name}</span> ${t}`;
  const body = document.createElement('div');
  body.textContent = JSON.stringify(payload);
  row.append(pre, body);
  eventLog.prepend(row);
}

function refreshInspect(api) {
  try {
    inspectOut.textContent =
      api.inspect.summary() + '\n\n' + JSON.stringify(api.inspect.toJSON(), null, 2);
  } catch (e) {
    inspectOut.textContent = String(e);
  }
}

const http = {
  async get(url) {
    const u = String(url);
    if (u.includes('/api/auth/me')) {
      if (!session.id) return null;
      return { id: session.id, tier: session.tier };
    }
    if (u.includes('/api/dict/search')) {
      const q = new URL(u, 'http://local').searchParams.get('q')?.toLowerCase() ?? '';
      const items = DICT.filter(
        (d) =>
          d.keys.some((k) => k.includes(q) || q.includes(k)) ||
          d.title.toLowerCase().includes(q),
      ).map(({ id, title }) => ({ id, title }));
      return { items };
    }
    return {};
  },
};

try {
  const contractUrl = new URL('../app/qmf.schema.json', import.meta.url).href;
  const appBaseUrl = new URL('../app/', import.meta.url).href;
  const schemasBase = new URL('/schemas/', window.location.origin).href;

  const result = await bootstrapFromContractUrl(contractUrl, {
    appBaseUrl,
    metaContractUrl: schemasBase + 'qmf.schema.schema.json',
    metaManifestUrl: schemasBase + 'module.manifest.schema.json',
    skipLazy: false,
    configs: {
      auth: {
        loginUrl: 'https://id.quizzman.com/login',
        apiEndpoint: '/api/auth/me',
      },
      dictionary: {
        apiBase: '/api/dict',
        mountSelector: '#qmf-dictionary',
      },
    },
    http,
  });

  const names = result.plugins.map((p) => p.name).join(', ');
  setStatus(`ready — ${names}`, 'ok');
  refreshInspect(result.api);

  subscribe('auth.session.changed', (payload) => logEvent('auth.session.changed', payload));
  subscribe('dictionary.search', (payload) => logEvent('dictionary.search', payload));

  async function reloadAuth(id, tier) {
    session = { id, tier };
    const svc = result.container.resolve('svc:auth.session');
    const s = await svc.fetchSession();
    const chip = document.querySelector('.qmf-auth-chip');
    if (chip) chip.textContent = s?.userId ?? 'Sign in';
    emit('auth.session.changed', {
      userId: s?.userId ?? null,
      tier: s?.tier ?? null,
    });
    logEvent('demo.session.set', { userId: s?.userId ?? null, tier: s?.tier ?? null });
    refreshInspect(result.api);
  }

  document.getElementById('btn-guest')?.addEventListener('click', () => {
    reloadAuth('guest', 'free');
  });
  document.getElementById('btn-pro')?.addEventListener('click', () => {
    reloadAuth('demo-user', 'pro');
  });
  document.getElementById('btn-out')?.addEventListener('click', () => {
    reloadAuth(null, null);
  });
} catch (err) {
  console.error(err);
  setStatus('error: ' + (err && err.message ? err.message : String(err)), 'err');
  inspectOut.textContent = String(err && err.stack ? err.stack : err);
}
