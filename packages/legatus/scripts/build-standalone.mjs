import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgRoot = join(__dirname, '..');
const dist = join(pkgRoot, 'dist');
const rootEsbuild = join(pkgRoot, '..', '..', 'node_modules', '.bin', 'esbuild');

mkdirSync(dist, { recursive: true });

const VERSION = '1.3.12';

function runBuild() {
  const esbuildBin = existsSync(rootEsbuild) ? rootEsbuild : 'npx esbuild';
  const css = readFileSync(join(pkgRoot, 'src', 'runtime', 'styles.css'), 'utf8');
  writeFileSync(join(dist, 'legatus.css'), css);
  execSync(
    `${esbuildBin} ${join(pkgRoot, 'src', 'runtime', 'index.js')} --bundle --minify --format=iife --global-name=Legatus --outfile=${join(dist, 'legatus.min.js')} --loader:.css=text --define:__LEGATUS_SDK_VERSION__='"${VERSION}"' --footer:js="globalThis.Legatus=Legatus.default||Legatus;if(globalThis.QMF){globalThis.QMF.Legatus=globalThis.Legatus;}"`,
    { stdio: 'inherit' },
  );
  console.log(`✓ legatus CDN bundles v${VERSION} (from packages/legatus)`);
}

runBuild();
