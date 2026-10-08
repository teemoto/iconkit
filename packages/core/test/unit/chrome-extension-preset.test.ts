import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { beforeAll, describe, expect, it } from 'vitest';
import {
  generateChromeExtensionPreset,
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
  padding: 0.12,
  background: { type: 'transparent' as const },
  shape: { type: 'square' as const },
};

describe('generateChromeExtensionPreset', () => {
  beforeAll(async () => {
    const wasmPath = require.resolve('@resvg/resvg-wasm/index_bg.wasm');
    const wasm = readFileSync(wasmPath);
    await initializeSvgRasterizer(
      wasm.buffer.slice(wasm.byteOffset, wasm.byteOffset + wasm.byteLength),
    );
  });

  it('generates approved Chrome extension paths, dimensions, and manifest metadata', async () => {
    const result = await generateChromeExtensionPreset(source, canvas);
    expect(result.value?.files.map((file) => file.path)).toEqual([
      'chrome-extension/icons/icon-16.png',
      'chrome-extension/icons/icon-32.png',
      'chrome-extension/icons/icon-48.png',
      'chrome-extension/icons/icon-128.png',
    ]);
    expect(result.value?.manifestIcons).toEqual({
      16: 'chrome-extension/icons/icon-16.png',
      32: 'chrome-extension/icons/icon-32.png',
      48: 'chrome-extension/icons/icon-48.png',
      128: 'chrome-extension/icons/icon-128.png',
    });
    for (const file of result.value?.files ?? []) {
      expect(inspectPng(file.bytes).value).toMatchObject(file.dimensions[0]!);
      expect(file).toMatchObject({
        presetId: 'chrome-extension',
        presetVersion: 1,
      });
    }
  });

  it('is deterministic across repeated generation', async () => {
    const first = await generateChromeExtensionPreset(source, canvas);
    const second = await generateChromeExtensionPreset(source, canvas);
    expect(first.value?.files.map((file) => file.sha256)).toEqual(
      second.value?.files.map((file) => file.sha256),
    );
  });
});
