import { access, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';

const rootDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const logoDir = path.join(rootDir, 'assets', 'logo');
const configPath = path.join(logoDir, 'logo-config.json');

const args = new Set(process.argv.slice(2));
const shouldWrite = args.has('--write');
const verbose = args.has('--verbose');

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function runCommand(command, commandArgs) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, commandArgs, {
      cwd: rootDir,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }

      reject(new Error(`${command} ${commandArgs.join(' ')} failed with code ${code}: ${stderr || stdout}`));
    });
  });
}

async function resolveImagemagickCommand() {
  for (const candidate of ['magick', 'convert']) {
    try {
      const versionArgs = candidate === 'magick' ? ['-version'] : ['--version'];
      await runCommand(candidate, versionArgs);
      return candidate;
    } catch {
      // Try next candidate.
    }
  }

  throw new Error('ImageMagick is required. Neither "magick" nor "convert" is available.');
}

async function loadConfig() {
  const fileUrl = new URL(`file://${configPath}`);
  const module = await import(fileUrl.href, { with: { type: 'json' } });
  return module.default;
}

async function getPngSize(filePath) {
  const fileStats = await stat(filePath);
  return fileStats.size;
}

async function getImageDimensions(filePath) {
  const { stdout } = await runCommand('identify', ['-format', '%w %h', filePath]);
  const [width, height] = stdout.trim().split(/\s+/).map(Number);
  return { width, height };
}

function buildResizeArgs({ sourcePath, outputPath, size, square, usePng8 }) {
  const outputSpecifier = usePng8 ? `PNG8:${outputPath}` : outputPath;

  if (square) {
    return [sourcePath, '-strip', '-filter', 'Lanczos', '-resize', `${size}x${size}`, outputSpecifier];
  }

  return [sourcePath, '-strip', '-filter', 'Lanczos', '-resize', `${size}x`, outputSpecifier];
}

async function generateVariant(imagemagickCommand, variant) {
  const beforeSize = (await exists(variant.outputPath)) ? await getPngSize(variant.outputPath) : 0;

  if (!shouldWrite) {
    return {
      ...variant,
      changed: false,
      beforeSize,
      afterSize: beforeSize,
      dryRun: true,
    };
  }

  await runCommand(imagemagickCommand, buildResizeArgs(variant));
  const afterSize = await getPngSize(variant.outputPath);

  return {
    ...variant,
    changed: beforeSize !== afterSize,
    beforeSize,
    afterSize,
    dryRun: false,
  };
}

async function collectSquareVariants(subsystemDir, sourceLogoPath) {
  const entries = await readdir(subsystemDir);
  const square512 = entries.find((entry) => entry.endsWith('-512-square.png'));

  if (!square512) {
    return [];
  }

  const squareSourcePath = path.join(subsystemDir, square512);
  const squareBase = square512.replace(/-512-square\.png$/, '');
  const squareTargets = [256, 128, 64, 32];

  return squareTargets.map((size) => ({
    sourcePath: squareSourcePath,
    outputPath: path.join(subsystemDir, `${squareBase}-${size}-square.png`),
    size,
    square: true,
    usePng8: true,
    kind: 'square',
    sourceLogoPath,
  }));
}

async function collectFaviconPngs(subsystemDir) {
  const entries = await readdir(subsystemDir);
  return entries
    .filter((entry) => /^favicon-(16|32|48)\.png$/.test(entry))
    .map((entry) => ({
      outputPath: path.join(subsystemDir, entry),
      size: Number(entry.match(/(16|32|48)/)[1]),
    }));
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)}MB`;
}

async function main() {
  const imagemagickCommand = await resolveImagemagickCommand();
  const config = await loadConfig();
  const variants = [];

  for (const [name, subsystem] of Object.entries(config.subsystems)) {
    if (!subsystem.hasCustomLogo || !subsystem.logo || !subsystem.sizes) {
      continue;
    }

    const sourceLogoPath = path.join(logoDir, subsystem.logo);
    const subsystemDir = path.dirname(sourceLogoPath);
    const sourceDimensions = await getImageDimensions(sourceLogoPath);

    for (const [sizeText, relativeOutputPath] of Object.entries(subsystem.sizes)) {
      const size = Number(sizeText);
      const outputPath = path.join(logoDir, relativeOutputPath);
      const upscale = size > sourceDimensions.width || size > sourceDimensions.height;
      variants.push({
        subsystem: name,
        sourcePath: sourceLogoPath,
        outputPath,
        size,
        square: false,
        usePng8: size <= 256 || upscale,
        kind: 'logo',
      });
    }

    variants.push(...(await collectSquareVariants(subsystemDir, sourceLogoPath)).map((variant) => ({
      ...variant,
      subsystem: name,
    })));

    const faviconPngs = await collectFaviconPngs(subsystemDir);
    for (const favicon of faviconPngs) {
      variants.push({
        subsystem: name,
        sourcePath: sourceLogoPath,
        outputPath: favicon.outputPath,
        size: favicon.size,
        square: true,
        usePng8: true,
        kind: 'favicon',
      });
    }
  }

  const results = [];
  for (const variant of variants) {
    const result = await generateVariant(imagemagickCommand, variant);
    results.push(result);
  }

  const totalBefore = results.reduce((sum, item) => sum + item.beforeSize, 0);
  const totalAfter = results.reduce((sum, item) => sum + item.afterSize, 0);

  console.log(`${shouldWrite ? 'Generated' : 'Planned'} ${results.length} logo assets using ${imagemagickCommand}.`);
  console.log(`Total size ${shouldWrite ? 'now' : 'currently'}: ${formatBytes(totalAfter)}${shouldWrite ? ` (was ${formatBytes(totalBefore)})` : ''}`);

  if (verbose || !shouldWrite) {
    for (const item of results) {
      const relOutput = path.relative(rootDir, item.outputPath);
      const summary = `${item.subsystem}:${item.kind}:${item.size} -> ${relOutput}`;
      if (item.dryRun) {
        console.log(`DRY ${summary} (${formatBytes(item.beforeSize)})`);
        continue;
      }

      const delta = item.afterSize - item.beforeSize;
      const deltaText = delta === 0 ? 'unchanged' : `${delta > 0 ? '+' : ''}${formatBytes(delta)}`;
      console.log(`${summary} ${formatBytes(item.beforeSize)} -> ${formatBytes(item.afterSize)} (${deltaText})`);
    }
  }
}

main().catch((error) => {
  console.error(`[logo-variants] ${error.message}`);
  process.exitCode = 1;
});