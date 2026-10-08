#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { basename, dirname, extname, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import {
  generateBundle,
  hashBytes,
  listPresets,
  serializeConfig,
  validateConfig,
} from '@icon-kit/core';
import { initializeNode } from '@icon-kit/core/node';
import { writeOutput } from './write-output.js';

const help = `IconKit — generate reproducible brand assets from SVG or PNG

Usage:
  iconkit generate --source logo.svg --preset web-favicon,pwa --out assets
  iconkit generate --config iconkit.config.json --out assets [--zip]
  iconkit validate --config iconkit.config.json
  iconkit init [--source logo.svg] [--out iconkit.config.json]
  iconkit presets [--json]

Options:
  --source <path>   Source file; with --config, overrides source location only
  --config <path>   Version-1 design config (source relative to config directory)
  --preset <list>   Comma-separated preset IDs (default: all available)
  --out <path>      Output directory (generate) or config filename (init)
  --zip            Also write iconkit.zip
  --overwrite      Explicitly replace generated files (generate only)
  --json           Machine-readable report on stdout
  --help, -h       Show help
  --version, -v    Show version

Exit codes: 0 success; 1 input, validation, or output failure; 2 usage error.
`;

function reportError(message, json, code = 'CLI_ERROR') {
  const diagnostic = {
    severity: 'error',
    code,
    message,
    suggestion: 'Check the input and command options; run iconkit --help.',
  };
  if (json)
    console.log(JSON.stringify({ valid: false, diagnostics: [diagnostic] }));
  else console.error(`${code}: ${message}`);
}

async function main() {
  let parsed;
  const arguments_ = process.argv.slice(2);
  if (arguments_[0] === '--') arguments_.shift();
  try {
    parsed = parseArgs({
      args: arguments_,
      allowPositionals: true,
      options: {
        source: { type: 'string' },
        config: { type: 'string' },
        preset: { type: 'string' },
        out: { type: 'string' },
        zip: { type: 'boolean' },
        overwrite: { type: 'boolean' },
        json: { type: 'boolean' },
        help: { type: 'boolean', short: 'h' },
        version: { type: 'boolean', short: 'v' },
      },
    });
  } catch (error) {
    reportError(error.message, process.argv.includes('--json'), 'CLI_USAGE');
    process.exitCode = 2;
    return;
  }
  const { values, positionals } = parsed;
  if (values.help || (!positionals.length && !values.version)) {
    console.log(help);
    return;
  }
  if (values.version) {
    const pkg = JSON.parse(
      await readFile(new URL('../package.json', import.meta.url), 'utf8'),
    );
    console.log(pkg.version);
    return;
  }
  const command = positionals[0];
  const allowed = {
    generate: ['source', 'config', 'preset', 'out', 'zip', 'overwrite', 'json'],
    init: ['source', 'out', 'json'],
    validate: ['config', 'json'],
    presets: ['json'],
  };
  if (
    positionals.length !== 1 ||
    !allowed[command] ||
    Object.keys(values).some((key) => !allowed[command].includes(key))
  ) {
    reportError(
      'Unknown command, extra argument, or unsupported option.',
      values.json,
      'CLI_USAGE',
    );
    process.exitCode = 2;
    return;
  }
  if (command === 'presets') {
    console.log(
      values.json
        ? JSON.stringify(listPresets())
        : listPresets()
            .map((preset) => `${preset.id}: ${preset.description}`)
            .join('\n'),
    );
    return;
  }
  if (
    (command === 'validate' && !values.config) ||
    (command === 'generate' && !values.source && !values.config)
  ) {
    reportError(
      'Provide --config, or --source for generation.',
      values.json,
      'CLI_USAGE',
    );
    process.exitCode = 2;
    return;
  }
  try {
    let config = values.config
      ? JSON.parse(await readFile(resolve(values.config), 'utf8'))
      : {
          version: 1,
          source: {
            kind: 'file',
            path: basename(values.source ?? 'logo.svg'),
            format: extname(values.source ?? 'logo.svg')
              .slice(1)
              .toLowerCase(),
          },
          canvas: {
            padding: 0.12,
            background: { type: 'transparent' },
            shape: { type: 'square' },
          },
          targets: listPresets().map((preset) => preset.id),
          vectorOutput: 'when-vector-safe',
        };
    if (values.preset)
      config = {
        ...config,
        targets: values.preset.split(',').map((id) => id.trim()),
      };
    const validation = validateConfig(config);
    if (!validation.valid) {
      if (values.json) console.log(JSON.stringify(validation));
      else
        for (const item of validation.diagnostics)
          console.error(
            `${item.code} ${item.path?.join('.') ?? ''}: ${item.message}`,
          );
      process.exitCode = 1;
      return;
    }
    config = validation.value;
    if (command === 'validate') {
      console.log(
        values.json
          ? JSON.stringify({ valid: true, diagnostics: [] })
          : 'Config is valid.',
      );
      return;
    }
    if (command === 'init') {
      const path = resolve(values.out ?? 'iconkit.config.json');
      await writeOutput(dirname(path), [
        {
          path: basename(path),
          format: 'json',
          dimensions: [],
          bytes: serializeConfig(config),
          sha256: '',
        },
      ]);
      console.log(
        values.json
          ? JSON.stringify({ valid: true, path })
          : `Created ${path}. Place ${config.source.path} alongside it, or edit source.path.`,
      );
      return;
    }
    const sourcePath =
      config.source.kind === 'file'
        ? values.source
          ? resolve(values.source)
          : resolve(dirname(resolve(values.config)), config.source.path)
        : undefined;
    const source = sourcePath
      ? {
          format: config.source.kind === 'file' ? config.source.format : 'svg',
          bytes: new Uint8Array(await readFile(sourcePath)),
        }
      : undefined;
    await initializeNode();
    const result = await generateBundle({
      config,
      ...(source ? { source } : {}),
      includeZip: !!values.zip,
    });
    if (!result.value) {
      if (values.json) console.log(JSON.stringify(result));
      else
        for (const item of result.diagnostics)
          console.error(`${item.code}: ${item.message} ${item.suggestion}`);
      process.exitCode = 1;
      return;
    }
    const files = [...result.value.files];
    if (result.value.zip)
      files.push({
        path: 'iconkit.zip',
        bytes: result.value.zip,
        format: 'zip',
        dimensions: [],
        sha256: await hashBytes(result.value.zip),
      });
    const root = resolve(values.out ?? 'iconkit-output');
    await writeOutput(root, files, !!values.overwrite, [
      ...(sourcePath ? [sourcePath] : []),
      ...(values.config ? [resolve(values.config)] : []),
    ]);
    const report = {
      valid: true,
      out: root,
      files: files.map(({ path, sha256 }) => ({ path, sha256 })),
      diagnostics: result.diagnostics,
    };
    if (values.json) console.log(JSON.stringify(report));
    else {
      for (const item of result.diagnostics)
        console.error(`${item.code}: ${item.message}`);
      console.log(`Generated ${files.length} files in ${root}`);
    }
  } catch (error) {
    reportError(error.message, values.json);
    process.exitCode = 1;
  }
}
await main();
