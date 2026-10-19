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
  'package/licenses/Apache-2.0.txt',
  'package/licenses/MPL-2.0.html',
  'package/licenses/png-codec-BSD-3-Clause.txt',
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

const readPackage = (archive) =>
  JSON.parse(
    execFileSync(
      'tar',
      ['-xOf', join(destination, archive), 'package/package.json'],
      {
        encoding: 'utf8',
      },
    ),
  );
const corePackage = readPackage(core);
const cliPackage = readPackage(cli);
if (corePackage.version !== cliPackage.version) {
  throw new Error('Core and CLI package versions must match.');
}
if (cliPackage.dependencies?.['@icon-kit/core'] !== corePackage.version) {
  throw new Error('Packed CLI must depend on the matching core version.');
}

console.log('Core and CLI package contents verified.');
