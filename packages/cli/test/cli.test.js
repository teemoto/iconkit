import { execFileSync, spawnSync } from 'node:child_process';
import {
  mkdtempSync,
  readFileSync,
  mkdirSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
const cli = fileURLToPath(new URL('../bin/iconkit.js', import.meta.url));
const source = fileURLToPath(
  new URL('../../../fixtures/svg/simple.svg', import.meta.url),
);
const run = (...args) =>
  spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8' });
const temp = () => mkdtempSync(join(tmpdir(), 'iconkit-cli-'));
describe('CLI', () => {
  it('documents commands and reports usage failures', () => {
    expect(run('--help').stdout).toContain('iconkit generate');
    expect(run('unknown', '--json').status).toBe(2);
    expect(JSON.parse(run('generate', '--json').stdout).valid).toBe(false);
    expect(JSON.parse(run('presets', '--json').stdout)).toHaveLength(5);
  });
  it('generates a movable bundle and reproduces its archive', () => {
    const out = join(temp(), 'assets');
    const first = run(
      'generate',
      '--source',
      source,
      '--out',
      out,
      '--zip',
      '--json',
    );
    expect(first.status, first.stdout + first.stderr).toBe(0);
    const again = join(temp(), 'copy');
    const second = run(
      'generate',
      '--config',
      join(out, 'iconkit.config.json'),
      '--out',
      again,
      '--zip',
      '--json',
    );
    expect(second.status, second.stdout + second.stderr).toBe(0);
    expect(readFileSync(join(out, 'iconkit.zip'))).toEqual(
      readFileSync(join(again, 'iconkit.zip')),
    );
    const refusal = run('generate', '--source', source, '--out', out, '--json');
    expect(refusal.status).toBe(1);
    expect(refusal.stdout).toContain('already exists');
    expect(
      run('generate', '--source', source, '--out', out, '--overwrite', '--json')
        .status,
    ).toBe(0);
  });
  it('refuses symlink output parents before writing', () => {
    const root = temp();
    const outside = temp();
    mkdirSync(join(root, 'assets'));
    symlinkSync(outside, join(root, 'assets', 'web'));
    const result = run(
      'generate',
      '--source',
      source,
      '--out',
      join(root, 'assets'),
      '--json',
    );
    expect(result.status).toBe(1);
    expect(result.stdout).toContain('symbolic link');
  });
  it('creates and validates a config without overwriting', () => {
    const path = join(temp(), 'iconkit.config.json');
    expect(run('init', '--out', path).status).toBe(0);
    expect(run('init', '--out', path).status).toBe(1);
    expect(run('validate', '--config', path).status).toBe(0);
    expect(
      execFileSync(process.execPath, [cli, '--version'], {
        encoding: 'utf8',
      }).trim(),
    ).toBe('0.0.1');
  });
  it('generates a catalog icon directly from a portable config', () => {
    const root = temp();
    const config = join(root, 'camera.iconkit.json');
    writeFileSync(
      config,
      JSON.stringify({
        version: 1,
        source: {
          kind: 'catalog-icon',
          catalog: 'lucide',
          catalogVersion: '1.50.0',
          id: 'lucide:camera',
        },
        canvas: {
          padding: 0.15,
          background: { type: 'solid', color: '#1D4ED8' },
          shape: { type: 'rounded-square', cornerRadius: 0.2 },
          iconColor: '#FFFFFF',
        },
        targets: ['web-favicon'],
      }),
    );
    const result = run(
      'generate',
      '--config',
      config,
      '--out',
      join(root, 'assets'),
      '--json',
    );
    expect(result.status, result.stdout + result.stderr).toBe(0);
    expect(
      readFileSync(join(root, 'assets', 'THIRD_PARTY_NOTICES.txt'), 'utf8'),
    ).toContain('Lucide Icons 1.50.0');
  });
});
