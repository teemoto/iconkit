import { describe, expect, it } from 'vitest';
import { planOutputWrite, type GeneratedFile } from '../../src/index.js';

function file(path: string): GeneratedFile {
  return {
    path,
    format: 'png',
    dimensions: [{ width: 16, height: 16 }],
    bytes: new Uint8Array(),
    sha256: '0'.repeat(64),
  };
}

describe('planOutputWrite', () => {
  it('permits safe unique relative paths', () => {
    expect(
      planOutputWrite([file('web/favicon/favicon-16x16.png')]),
    ).toMatchObject({
      valid: true,
      value: { overwrite: false },
    });
  });

  it.each([
    '/absolute.png',
    '../outside.png',
    'web\\favicon.png',
    'web//favicon.png',
  ])('rejects unsafe output path %s', (path) => {
    expect(planOutputWrite([file(path)]).diagnostics[0]?.code).toBe(
      'OUTPUT_PATH_INVALID',
    );
  });

  it('detects collisions on case-sensitive and case-insensitive hosts', () => {
    expect(
      planOutputWrite([
        file('web/favicon/icon.png'),
        file('web/favicon/ICON.png'),
      ]).diagnostics[0]?.code,
    ).toBe('OUTPUT_COLLISION');
  });

  it('requires explicit overwrite for paths known to exist', () => {
    expect(
      planOutputWrite([file('web/favicon/icon.png')], {
        existingPaths: ['web/favicon/icon.png'],
      }).diagnostics[0]?.code,
    ).toBe('OUTPUT_EXISTS');
    expect(
      planOutputWrite([file('web/favicon/icon.png')], {
        existingPaths: ['web/favicon/icon.png'],
        overwrite: true,
      }).value,
    ).toMatchObject({ overwrite: true });
  });
});
