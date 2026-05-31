/**
 * QMF Migration Tool v1.0 - Browser Version
 * Automatically converts v2 QMF code to v3
 * 
 * Usage:
 *   Browser: QMFMigrate.transform(code);
 */

/**
 * Migration rules: v2 pattern -> v3 replacement
 */
const MIGRATION_RULES = [
  // ============ CONTEXT -> STORE ============
  {
    name: 'context.get to store.getState',
    pattern: /QMF\.context\.get\s*\(\s*['"`](\w+)['"`]\s*\)/g,
    replace: 'QMF.store.getState().$1',
    category: 'state'
  },
  {
    name: 'context.set to store.setState',
    pattern: /QMF\.context\.set\s*\(\s*['"`](\w+)['"`]\s*,\s*([^)]+)\)/g,
    replace: 'QMF.store.setState({ $1: $2 })',
    category: 'state'
  },
  {
    name: 'context.watch to store.watch',
    pattern: /QMF\.context\.watch\s*\(\s*['"`](\w+)['"`]\s*,/g,
    replace: 'QMF.store.watch(s => s.$1,',
    category: 'state'
  },

  // ============ RUNTIME INIT ============
  {
    name: 'runtime.init to init',
    pattern: /QMF\.runtime\.init\s*\(/g,
    replace: 'await QMF.init(',
    category: 'init'
  },

  // ============ TOAST ============
  {
    name: 'toast.show to toast()',
    pattern: /QMF\.toast\.show\s*\(/g,
    replace: 'QMF.toast(',
    category: 'ui'
  },
  {
    name: 'toast.success shorthand',
    pattern: /QMF\.toast\.success\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g,
    replace: "QMF.toast({ message: '$1', type: 'success' })",
    category: 'ui'
  },
  {
    name: 'toast.error shorthand',
    pattern: /QMF\.toast\.error\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g,
    replace: "QMF.toast({ message: '$1', type: 'error' })",
    category: 'ui'
  },
  {
    name: 'toast.warning shorthand',
    pattern: /QMF\.toast\.warning\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g,
    replace: "QMF.toast({ message: '$1', type: 'warning' })",
    category: 'ui'
  },
  {
    name: 'toast.info shorthand',
    pattern: /QMF\.toast\.info\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g,
    replace: "QMF.toast({ message: '$1', type: 'info' })",
    category: 'ui'
  },
  {
    name: 'toast.hide',
    pattern: /QMF\.toast\.hide\s*\(\)/g,
    replace: 'QMF.hideToast()',
    category: 'ui'
  },

  // ============ LOADING ============
  {
    name: 'loading.show',
    pattern: /QMF\.loading\.show\s*\(/g,
    replace: 'QMF.showLoading(',
    category: 'ui'
  },
  {
    name: 'loading.hide',
    pattern: /QMF\.loading\.hide\s*\(\)/g,
    replace: 'QMF.hideLoading()',
    category: 'ui'
  },

  // ============ MODULE LOADER ============
  {
    name: 'moduleLoader.load',
    pattern: /QMF\.moduleLoader\.load\s*\(\s*['"`](\w+)['"`]\s*\)/g,
    replace: "QMF.loadModule('$1')",
    category: 'modules'
  },
  {
    name: 'moduleLoader.register',
    pattern: /QMF\.moduleLoader\.register\s*\(/g,
    replace: 'QMF.registerModule(',
    category: 'modules'
  },

  // ============ PLUGINS ============
  {
    name: 'plugins.header.init',
    pattern: /QMF\.plugins\.header\.init\s*\(/g,
    replace: 'QMF.use(createHeaderPlugin(',
    category: 'plugins'
  },
  {
    name: 'plugins.footer.init',
    pattern: /QMF\.plugins\.footer\.init\s*\(/g,
    replace: 'QMF.use(createFooterPlugin(',
    category: 'plugins'
  },
  {
    name: 'plugins.header usage',
    pattern: /QMF\.plugins\.header\./g,
    replace: 'QMF.header.',
    category: 'plugins'
  },
  {
    name: 'plugins.footer usage',
    pattern: /QMF\.plugins\.footer\./g,
    replace: 'QMF.footer.',
    category: 'plugins'
  },

  // ============ CDN URLS ============
  {
    name: 'CDN: share-ui/dist/qmf.min.js',
    pattern: /\/share-ui\/dist\/qmf\.min\.js/g,
    replace: '/qmf/v3/qmf-compat.min.js',
    category: 'cdn'
  },
  {
    name: 'CDN: share-ui/dist/qmf.js',
    pattern: /\/share-ui\/dist\/qmf\.js/g,
    replace: '/qmf/v3/qmf-compat.min.js',
    category: 'cdn'
  },
  {
    name: 'CDN: qmf/dist/qmf.min.js',
    pattern: /\/qmf\/dist\/qmf\.min\.js/g,
    replace: '/qmf/v3/qmf-compat.min.js',
    category: 'cdn'
  },
  {
    name: 'CDN: share-ui/dist/qmf.min.css',
    pattern: /\/share-ui\/dist\/qmf\.min\.css/g,
    replace: '/qmf/v3/tokens.css',
    category: 'cdn'
  },
  {
    name: 'CDN: share-ui/dist/qmf.css',
    pattern: /\/share-ui\/dist\/qmf\.css/g,
    replace: '/qmf/v3/tokens.css',
    category: 'cdn'
  },
  {
    name: 'CDN: ui.quizzman.com old path',
    pattern: /ui\.quizzman\.com\/qmf\/dist\/qmf\.min\.js/g,
    replace: 'ui.quizzman.com/qmf/v3/qmf-compat.min.js',
    category: 'cdn'
  },

  // ============ CSS VARIABLES ============
  {
    name: 'CSS: primary color #6366f1',
    pattern: /#6366f1/gi,
    replace: 'var(--qmf-color-primary)',
    category: 'css'
  },
  {
    name: 'CSS: primary color #4f46e5',
    pattern: /#4f46e5/gi,
    replace: 'var(--qmf-color-primary)',
    category: 'css'
  },
  {
    name: 'CSS: success color #22c55e',
    pattern: /#22c55e/gi,
    replace: 'var(--qmf-color-success)',
    category: 'css'
  },
  {
    name: 'CSS: error color #ef4444',
    pattern: /#ef4444/gi,
    replace: 'var(--qmf-color-error)',
    category: 'css'
  },
  {
    name: 'CSS: warning color #f59e0b',
    pattern: /#f59e0b/gi,
    replace: 'var(--qmf-color-warning)',
    category: 'css'
  },
];

/**
 * Transform source code using migration rules
 * @param {string} source - Source code to transform
 * @param {object} options - Options
 * @returns {object|string} - { code, changes } or just code string
 */
function transform(source, options = {}) {
  const { categories = null, dryRun = false, returnReport = false } = options;
  const changes = [];
  let code = source;

  for (const rule of MIGRATION_RULES) {
    // Filter by category if specified
    if (categories && !categories.includes(rule.category)) continue;

    // Find all matches
    const matches = [...source.matchAll(new RegExp(rule.pattern.source, rule.pattern.flags))];
    
    if (matches.length > 0) {
      if (!dryRun) {
        code = code.replace(rule.pattern, rule.replace);
      }
      
      changes.push({
        rule: rule.name,
        category: rule.category,
        count: matches.length,
        matches: matches.map(m => ({
          original: m[0],
          line: source.substring(0, m.index).split('\n').length
        }))
      });
    }
  }

  if (returnReport) {
    return { code, changes };
  }
  return code;
}

/**
 * Get migration report for source code
 * @param {string} source - Source code to analyze
 * @returns {object} - Report object
 */
function analyze(source) {
  const { changes } = transform(source, { dryRun: true, returnReport: true });
  
  const summary = {
    totalChanges: changes.reduce((sum, c) => sum + c.count, 0),
    byCategory: {},
    rules: changes
  };

  for (const change of changes) {
    if (!summary.byCategory[change.category]) {
      summary.byCategory[change.category] = 0;
    }
    summary.byCategory[change.category] += change.count;
  }

  return summary;
}

/**
 * Get all available migration rules
 * @returns {Array} - List of rules
 */
function getRules() {
  return MIGRATION_RULES.map(r => ({
    name: r.name,
    category: r.category,
    pattern: r.pattern.source,
    replace: r.replace
  }));
}

/**
 * Get categories
 * @returns {Array} - List of categories
 */
function getCategories() {
  return [...new Set(MIGRATION_RULES.map(r => r.category))];
}

/**
 * Add custom migration rule
 * @param {object} rule - Rule object with name, pattern, replace, category
 */
function addRule(rule) {
  if (!rule.name || !rule.pattern || !rule.replace || !rule.category) {
    throw new Error('Rule must have name, pattern, replace, and category');
  }
  MIGRATION_RULES.push({
    ...rule,
    pattern: typeof rule.pattern === 'string' ? new RegExp(rule.pattern, 'g') : rule.pattern
  });
}

/**
 * Interactive migration helper for browser
 * Creates a UI to paste and migrate code
 */
function createMigrationUI(container) {
  if (typeof document === 'undefined') {
    console.warn('createMigrationUI is only available in browser');
    return null;
  }

  const el = typeof container === 'string' ? document.querySelector(container) : container;
  if (!el) {
    console.error('Container not found');
    return null;
  }

  el.innerHTML = `
    <div style="font-family: system-ui, sans-serif; max-width: 1200px; margin: 0 auto;">
      <h2 style="margin-bottom: 1rem;">QMF Migration Tool</h2>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
        <div>
          <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Input (v2 code):</label>
          <textarea id="qmf-migrate-input" style="width: 100%; height: 300px; font-family: monospace; padding: 0.5rem; border: 1px solid #ccc; border-radius: 4px;"></textarea>
        </div>
        <div>
          <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Output (v3 code):</label>
          <textarea id="qmf-migrate-output" readonly style="width: 100%; height: 300px; font-family: monospace; padding: 0.5rem; border: 1px solid #ccc; border-radius: 4px; background: #f5f5f5;"></textarea>
        </div>
      </div>
      <div style="margin-top: 1rem; display: flex; gap: 0.5rem; align-items: center;">
        <button id="qmf-migrate-btn" style="padding: 0.5rem 1rem; background: #4f46e5; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 500;">Transform</button>
        <button id="qmf-migrate-copy" style="padding: 0.5rem 1rem; background: #22c55e; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 500;">Copy Output</button>
        <span id="qmf-migrate-status" style="color: #666;"></span>
      </div>
      <div id="qmf-migrate-report" style="margin-top: 1rem; padding: 1rem; background: #f5f5f5; border-radius: 4px; display: none;">
      </div>
    </div>
  `;

  const input = el.querySelector('#qmf-migrate-input');
  const output = el.querySelector('#qmf-migrate-output');
  const btn = el.querySelector('#qmf-migrate-btn');
  const copyBtn = el.querySelector('#qmf-migrate-copy');
  const status = el.querySelector('#qmf-migrate-status');
  const reportEl = el.querySelector('#qmf-migrate-report');

  btn.addEventListener('click', () => {
    const result = transform(input.value, { returnReport: true });
    output.value = result.code;
    
    const totalChanges = result.changes.reduce((sum, c) => sum + c.count, 0);
    status.textContent = `${totalChanges} changes made`;
    
    if (result.changes.length > 0) {
      reportEl.style.display = 'block';
      reportEl.innerHTML = '<strong>Changes:</strong><ul style="margin: 0.5rem 0; padding-left: 1.5rem;">' +
        result.changes.map(c => `<li>${c.rule} (${c.count}x)</li>`).join('') +
        '</ul>';
    } else {
      reportEl.style.display = 'none';
    }
  });

  copyBtn.addEventListener('click', () => {
    output.select();
    document.execCommand('copy');
    status.textContent = 'Copied!';
    setTimeout(() => { status.textContent = ''; }, 2000);
  });

  return { input, output, transform: () => btn.click() };
}

// Export for browser
if (typeof window !== 'undefined') {
  window.QMFMigrate = {
    transform,
    analyze,
    getRules,
    getCategories,
    addRule,
    createMigrationUI,
    MIGRATION_RULES
  };
}

export { transform, analyze, getRules, getCategories, addRule, createMigrationUI, MIGRATION_RULES };
