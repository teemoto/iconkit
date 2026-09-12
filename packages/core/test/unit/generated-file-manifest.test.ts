import { describe, expect, it } from 'vitest';
import {
  createGeneratedFileManifest,
  serializeGeneratedFileManifest,
  type GeneratedFile,
} from '../../src/index.js';

function file(
  path: string,
  format: GeneratedFile['format'] = 'png',
): GeneratedFile {
  return {
    path,
    format,
    dimensions: [{ width: 16, height: 16 }],
    bytes: new Uint8Array([1, 2, 3]),
    sha256: 'a'.repeat(64),
    presetId: 'web-favicon',
    presetVersion: 1,
  };
}

describe('createGeneratedFileManifest', () => {
  it('sorts records by path and excludes output bytes', () => {
    const result = createGeneratedFileManifest([
      file('web/z.png'),
      file('web/a.png'),
    ]);
    expect(result.value).toEqual({
      version: 1,
      files: [
        {
          path: 'web/a.png',
          format: 'png',
          dimensions: [{ width: 16, height: 16 }],
          sha256: 'a'.repeat(64),
          presetId: 'web-favicon',
          presetVersion: 1,
        },
        {
          path: 'web/z.png',
          format: 'png',
          dimensions: [{ width: 16, height: 16 }],
          sha256: 'a'.repeat(64),
          presetId: 'web-favicon',
          presetVersion: 1,
        },
      ],
    });
  });

  it('serializes deterministic, newline-terminated JSON', () => {
    const first = createGeneratedFileManifest([
      file('web/b.png'),
      file('web/a.png'),
    ]).value!;
    const second = createGeneratedFileManifest([
      file('web/a.png'),
      file('web/b.png'),
    ]).value!;
    expect(serializeGeneratedFileManifest(first)).toEqual(
      serializeGeneratedFileManifest(second),
    );
    expect(
      new TextDecoder().decode(serializeGeneratedFileManifest(first)),
    ).toMatch(/\n$/);
  });

  it('inherits unsafe-path and collision failures from the output plan', () => {
    expect(
      createGeneratedFileManifest([file('../outside.png')]).diagnostics[0]
        ?.code,
    ).toBe('OUTPUT_PATH_INVALID');
    expect(
      createGeneratedFileManifest([file('web/icon.png'), file('web/icon.png')])
        .diagnostics[0]?.code,
    ).toBe('OUTPUT_COLLISION');
  });
});
