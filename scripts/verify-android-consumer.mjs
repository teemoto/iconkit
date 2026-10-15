import { execFileSync, spawnSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generatePreset } from '../packages/core/dist/index.js';
import { initializeNode } from '../packages/core/node.js';

const require = createRequire(
  new URL('../packages/core/package.json', import.meta.url),
);
const { DOMParser } = require('@xmldom/xmldom');
const root = fileURLToPath(new URL('..', import.meta.url));
const fixture = join(root, 'fixtures/android/minimal-app');
const structureOnly = process.argv.includes('--structure-only');
const temporaryRoot = mkdtempSync(join(tmpdir(), 'iconkit-android-consumer-'));
const project = join(temporaryRoot, 'project');
const resourcePrefix = 'android/app/src/main/';

function fail(message) {
  throw new Error(`Android consumer verification failed: ${message}`);
}

function findExecutable(name) {
  const result = spawnSync('which', [name], {
    encoding: 'utf8',
  });
  return result.status === 0 ? result.stdout.trim() : undefined;
}

function validateXml(path) {
  const source = readFileSync(path, 'utf8');
  const document = new DOMParser().parseFromString(source, 'application/xml');
  if (document.getElementsByTagName('parsererror').length)
    fail(`${relative(project, path)} is not valid XML.`);
  return document;
}

try {
  cpSync(fixture, project, { recursive: true });
  await initializeNode();
  const source = new Uint8Array(
    readFileSync(join(root, 'fixtures/svg/simple.svg')),
  );
  const result = await generatePreset({
    config: {
      version: 1,
      source: { kind: 'file', path: 'simple.svg', format: 'svg' },
      canvas: {
        padding: 0.12,
        background: { type: 'solid', color: '#2563EB' },
        shape: { type: 'square' },
      },
      targets: ['android-app-icon'],
    },
    source: { format: 'svg', bytes: source },
    presetId: 'android-app-icon',
  });
  if (!result.valid || !result.value)
    fail(`generation returned ${JSON.stringify(result.diagnostics)}.`);

  const resources = result.value.filter((file) =>
    file.path.startsWith(resourcePrefix),
  );
  if (result.value.length !== 28 || resources.length !== 27)
    fail(
      `expected 28 outputs and 27 resources, received ${result.value.length} and ${resources.length}.`,
    );

  for (const file of resources) {
    const destination = join(
      project,
      'app/src/main',
      file.path.slice(resourcePrefix.length),
    );
    mkdirSync(dirname(destination), { recursive: true });
    writeFileSync(destination, file.bytes);
  }

  const expectedDensities = ['mdpi', 'hdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi'];
  const expectedLayers = [
    'ic_launcher.png',
    'ic_launcher_round.png',
    'ic_launcher_foreground.png',
    'ic_launcher_background.png',
    'ic_launcher_monochrome.png',
  ];
  for (const density of expectedDensities)
    for (const layer of expectedLayers) {
      const path = join(project, `app/src/main/res/mipmap-${density}`, layer);
      if (!existsSync(path)) fail(`missing ${relative(project, path)}.`);
    }

  for (const name of ['ic_launcher.xml', 'ic_launcher_round.xml']) {
    const path = join(project, 'app/src/main/res/mipmap-anydpi-v26', name);
    const document = validateXml(path);
    const references = ['background', 'foreground', 'monochrome'].map((tag) =>
      document.getElementsByTagName(tag)[0]?.getAttribute('android:drawable'),
    );
    const expected = [
      '@mipmap/ic_launcher_background',
      '@mipmap/ic_launcher_foreground',
      '@mipmap/ic_launcher_monochrome',
    ];
    if (JSON.stringify(references) !== JSON.stringify(expected))
      fail(`${name} does not reference all generated adaptive layers.`);
  }

  const manifest = validateXml(
    join(project, 'app/src/main/AndroidManifest.xml'),
  );
  const application = manifest.getElementsByTagName('application')[0];
  if (
    application?.getAttribute('android:icon') !== '@mipmap/ic_launcher' ||
    application?.getAttribute('android:roundIcon') !==
      '@mipmap/ic_launcher_round'
  )
    fail('the fixture manifest does not reference both launcher icons.');

  const aapt2 = process.env.ICONKIT_AAPT2;
  if (aapt2) {
    execFileSync(
      aapt2,
      [
        'compile',
        '--dir',
        join(project, 'app/src/main/res'),
        '-o',
        join(temporaryRoot, 'compiled-resources.zip'),
      ],
      { stdio: 'inherit' },
    );
    console.log('Generated resources compiled successfully with AAPT2.');
  }

  if (structureOnly) {
    console.log('Android consumer resource structure verified.');
  } else {
    const gradle = process.env.ICONKIT_GRADLE || findExecutable('gradle');
    if (!gradle)
      fail(
        'Gradle was not found. Install Gradle 9.5 or set ICONKIT_GRADLE, or run with --structure-only.',
      );
    execFileSync(
      gradle,
      ['--no-daemon', '--stacktrace', ':app:processDebugResources'],
      { cwd: project, stdio: 'inherit' },
    );
    console.log('Android consumer project resources compiled successfully.');
  }
} finally {
  rmSync(temporaryRoot, { recursive: true, force: true });
}
