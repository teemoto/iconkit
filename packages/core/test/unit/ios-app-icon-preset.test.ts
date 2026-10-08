import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { beforeAll, describe, expect, it } from 'vitest';
import {
  generatePreset,
  initializeSvgRasterizer,
  inspectPng,
  type IconKitConfig,
} from '../../src/index.js';

const require = createRequire(import.meta.url);
const source = new TextEncoder().encode(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><circle cx=".5" cy=".5" r=".4" fill="#2563EB"/></svg>',
);
const config: IconKitConfig = {
  version: 1,
  source: { kind: 'file', path: 'logo.svg', format: 'svg' },
  canvas: {
    padding: 0.1,
    background: { type: 'transparent' },
    shape: { type: 'rounded-square', cornerRadius: 0.2 },
  },
  targets: ['ios-app-icon'],
};

describe('iOS app icon preset', () => {
  beforeAll(async () => {
    const wasm = readFileSync(
      require.resolve('@resvg/resvg-wasm/index_bg.wasm'),
    );
    await initializeSvgRasterizer(
      wasm.buffer.slice(wasm.byteOffset, wasm.byteOffset + wasm.byteLength),
    );
  });

  it('creates a complete opaque Xcode asset catalog', async () => {
    const result = await generatePreset({
      config,
      source: { format: 'svg', bytes: source },
      presetId: 'ios-app-icon',
    });
    expect(result.valid, JSON.stringify(result.diagnostics)).toBe(true);
    expect(result.value).toHaveLength(14);
    expect(result.diagnostics.map((item) => item.code)).toEqual([
      'IOS_OPAQUE_BACKGROUND_APPLIED',
      'IOS_SQUARE_CANVAS_APPLIED',
    ]);
    const pngs = result.value!.filter((file) => file.format === 'png');
    expect(pngs).toHaveLength(13);
    for (const file of pngs) {
      const inspected = inspectPng(file.bytes);
      expect(inspected.value).toMatchObject({
        ...file.dimensions[0],
        colorType: 2,
        hasAlpha: false,
      });
    }
    const contentsFile = result.value!.find(
      (file) => file.path === 'ios/AppIcon.appiconset/Contents.json',
    )!;
    const contents = JSON.parse(new TextDecoder().decode(contentsFile.bytes));
    expect(contents.images).toHaveLength(18);
    const paths = new Set(pngs.map((file) => file.path.split('/').at(-1)));
    expect(
      contents.images.every((item: { filename: string }) =>
        paths.has(item.filename),
      ),
    ).toBe(true);
    expect(contents.info).toEqual({ author: 'iconkit', version: 1 });
  });
});
