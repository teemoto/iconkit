import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { beforeAll, describe, expect, it } from 'vitest';
import {
  generatePwaPreset,
  initializeSvgRasterizer,
  inspectPng,
} from '../../src/index.js';

const require = createRequire(import.meta.url);
const source = {
  svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><rect width="1" height="1" fill="#2563EB"/></svg>',
  width: 1,
  height: 1,
  viewBox: [0, 0, 1, 1] as const,
};
const canvas = {
  padding: 0,
  background: { type: 'transparent' as const },
  shape: { type: 'square' as const },
};

describe('generatePwaPreset', () => {
  beforeAll(async () => {
    const wasmPath = require.resolve('@resvg/resvg-wasm/index_bg.wasm');
    const wasm = readFileSync(wasmPath);
    await initializeSvgRasterizer(
      wasm.buffer.slice(wasm.byteOffset, wasm.byteOffset + wasm.byteLength),
    );
  });

  it('generates standard and maskable PWA icons with approved paths and sizes', async () => {
    const result = await generatePwaPreset(source, canvas);
    expect(result.value?.map((file) => file.path)).toEqual([
      'pwa/icons/icon-192.png',
      'pwa/icons/icon-512.png',
      'pwa/icons/icon-maskable-192.png',
      'pwa/icons/icon-maskable-512.png',
    ]);
    for (const file of result.value ?? []) {
      expect(inspectPng(file.bytes).value).toMatchObject(file.dimensions[0]);
      expect(file).toMatchObject({ presetId: 'pwa', presetVersion: 1 });
    }
  });

  it('recomposes maskable output into the guaranteed safe zone and reports the adjustment', async () => {
    const result = await generatePwaPreset(source, canvas);
    expect(result.diagnostics[0]).toMatchObject({
      severity: 'warning',
      code: 'PWA_MASKABLE_SAFE_AREA_ADJUSTED',
    });
    expect(result.value?.[0]?.bytes).not.toEqual(result.value?.[2]?.bytes);
  });

  it('can omit maskable variants when explicitly requested', async () => {
    const result = await generatePwaPreset(source, canvas, {
      includeMaskable: false,
    });
    expect(result.value?.map((file) => file.path)).toEqual([
      'pwa/icons/icon-192.png',
      'pwa/icons/icon-512.png',
    ]);
    expect(result.diagnostics).toEqual([]);
  });
});
