/**
 * Runtime bootstrap — vanilla JS.
 * @see qmf.schema.json
 */
import { pathToFileURL } from 'node:url';
import { bootstrapFromContract } from '@qmf/runtime';

export async function bootstrap() {
  const contractPath = new URL('../../qmf.schema.json', import.meta.url).pathname;
  const result = await bootstrapFromContract(contractPath, {
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
    skipLazy: false,
    http: {
      async get() {
        // demo: unauthenticated session
        return null;
      },
    },
  });

  return result;
}

const isDirectRun =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  bootstrap()
    .then((r) => {
      console.log('✓ bootstrap ok');
      console.log(r.inspect.summary());
      console.log(
        'plugins:',
        r.plugins.map((p) => `${p.name}:${p.__qmfStatus ?? '?'}`).join(', '),
      );
      const authState = r.inspect.state?.() ?? {};
      console.log('state keys:', Object.keys(authState));
    })
    .catch((err) => {
      console.error('[QMF] bootstrap failed', err);
      process.exit(1);
    });
}
