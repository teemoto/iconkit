import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const destination = mkdtempSync(join(tmpdir(), 'iconkit-pack-'));
for (const packageName of ['@icon-kit/core', '@icon-kit/cli']) {
  execFileSync(
    'corepack',
    [
      'pnpm',
      '--filter',
      packageName,
      'pack',
      '--pack-destination',
      destination,
    ],
    { stdio: 'pipe' },
  );
}

const archives = readdirSync(destination).filter((name) =>
  name.endsWith('.tgz'),
);
if (archives.length !== 2)
  throw new Error('Expected core and CLI package archives.');

const core = archives.find((name) => name.includes('core'));
const cli = archives.find((name) => name.includes('cli'));
if (!core || !cli) throw new Error('Could not identify both package archives.');

const list = (archive) =>
  execFileSync('tar', ['-tf', join(destination, archive)], {
    encoding: 'utf8',
  });
const coreFiles = list(core);
const cliFiles = list(cli);
for (const path of [
  'package/dist/index.js',
  'package/dist/index.d.ts',
  'package/dist/wasm/resvg.wasm',
  'package/dist/wasm/png.wasm',
  'package/node.js',
  'package/NOTICE',
  'package/README.md',
]) {
  if (!coreFiles.includes(path))
    throw new Error(`Core package is missing ${path}.`);
}
for (const path of [
  'package/bin/iconkit.js',
  'package/bin/write-output.js',
  'package/README.md',
]) {
  if (!cliFiles.includes(path))
    throw new Error(`CLI package is missing ${path}.`);
}

console.log('Core and CLI package contents verified.');
