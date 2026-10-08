import { unzipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { createZipBundle, type GeneratedFile } from '../../src/index.js';

function file(path: string, value: number): GeneratedFile {
  return {
    path,
    format: 'png',
    dimensions: [{ width: 16, height: 16 }],
    bytes: new Uint8Array([value]),
    sha256: value.toString(16).padStart(64, '0'),
    presetId: 'web-favicon',
    presetVersion: 1,
  };
}

describe('createZipBundle', () => {
  it('includes every generated file and the manifest', () => {
    const result = createZipBundle([
      file('web/b.png', 2),
      file('web/a.png', 1),
    ]);
    expect(result.valid).toBe(true);
    const unzipped = unzipSync(result.value!.bytes);
    expect(Object.keys(unzipped).sort()).toEqual([
      'iconkit.manifest.json',
      'web/a.png',
      'web/b.png',
    ]);
    expect(unzipped['web/a.png']).toEqual(new Uint8Array([1]));
    expect(
      JSON.parse(new TextDecoder().decode(unzipped['iconkit.manifest.json']!)),
    ).toEqual(result.value!.manifest);
  });

  it('creates identical archive bytes regardless of input ordering', () => {
    const first = createZipBundle([file('web/b.png', 2), file('web/a.png', 1)]);
    const second = createZipBundle([
      file('web/a.png', 1),
      file('web/b.png', 2),
    ]);
    expect(first.value?.bytes).toEqual(second.value?.bytes);
  });

  it('rejects a collision with the reserved manifest path', () => {
    expect(
      createZipBundle([file('iconkit.manifest.json', 1)]).diagnostics[0]?.code,
    ).toBe('OUTPUT_COLLISION');
  });
});
