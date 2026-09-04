import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { beforeAll, describe, expect, it } from 'vitest';
import {
  decodePng,
  initializePngDecoder,
  inspectPng,
} from '../../src/index.js';

const require = createRequire(import.meta.url);

function fixture(name: string): Uint8Array {
  return Buffer.from(
    readFileSync(`../../fixtures/png/${name}`, 'utf8').trim(),
    'base64',
  );
}

describe('inspectPng', () => {
  beforeAll(async () => {
    const wasmPath =
      require.resolve('@jsquash/png/codec/pkg/squoosh_png_bg.wasm');
    const wasm = readFileSync(wasmPath);

    await initializePngDecoder(
      wasm.buffer.slice(wasm.byteOffset, wasm.byteOffset + wasm.byteLength),
    );
  });
  it('reads transparent PNG metadata', () => {
    const result = inspectPng(fixture('transparent-1x1.png.base64'));
    expect(result.valid).toBe(true);
    expect(result.value).toMatchObject({ width: 1, height: 1, hasAlpha: true });
  });

  it('rejects corrupt PNG bytes', () => {
    expect(inspectPng(fixture('corrupt.png.base64')).diagnostics[0]?.code).toBe(
      'PNG_INVALID',
    );
  });

  it('decodes PNG pixels into RGBA bytes', async () => {
    const result = await decodePng(fixture('opaque-1x1.png.base64'));
    expect(result.valid).toBe(true);
    expect(result.value?.pixels).toHaveLength(4);
  });
});
