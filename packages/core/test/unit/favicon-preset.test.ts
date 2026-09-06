import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { beforeAll, describe, expect, it } from 'vitest';
import {
  generateFaviconPreset,
  initializeSvgRasterizer,
  inspectPng,
} from '../../src/index.js';

const require = createRequire(import.meta.url);
const svg =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><rect width="1" height="1" fill="#2563EB"/></svg>';

describe('generateFaviconPreset', () => {
  beforeAll(async () => {
    const wasmPath = require.resolve('@resvg/resvg-wasm/index_bg.wasm');
    const wasm = readFileSync(wasmPath);
    await initializeSvgRasterizer(
      wasm.buffer.slice(wasm.byteOffset, wasm.byteOffset + wasm.byteLength),
    );
  });

  it('generates every approved favicon artifact with stable metadata', async () => {
    const result = await generateFaviconPreset(svg);
    expect(result.valid).toBe(true);
    expect(result.value?.map((file) => file.path)).toEqual([
      'web/favicon/favicon.ico',
      'web/favicon/favicon-16x16.png',
      'web/favicon/favicon-32x32.png',
      'web/favicon/favicon-48x48.png',
      'web/favicon/apple-touch-icon.png',
    ]);
    expect(
      result.value?.every((file) => /^[a-f0-9]{64}$/.test(file.sha256)),
    ).toBe(true);
    expect(result.value?.[0]?.dimensions).toEqual([
      { width: 16, height: 16 },
      { width: 32, height: 32 },
      { width: 48, height: 48 },
    ]);
  });

  it('renders each standalone PNG at its declared dimensions', async () => {
    const result = await generateFaviconPreset(svg);
    for (const file of result.value?.filter((file) => file.format === 'png') ??
      []) {
      expect(inspectPng(file.bytes).value).toMatchObject(file.dimensions[0]);
    }
  });

  it('is deterministic across repeated generation', async () => {
    const first = await generateFaviconPreset(svg);
    const second = await generateFaviconPreset(svg);
    expect(first.value?.map((file) => file.sha256)).toEqual(
      second.value?.map((file) => file.sha256),
    );
  });
});
