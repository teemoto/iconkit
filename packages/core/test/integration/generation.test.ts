import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { beforeAll, describe, expect, it } from 'vitest';
import { unzipSync } from 'fflate';
import {
  decodePng,
  generateBundle,
  initializePngDecoder,
  initializeSvgRasterizer,
  inspectPng,
  renderAsset,
  validateConfig,
  type IconKitConfig,
} from '../../src/index.js';
const require = createRequire(import.meta.url);
const base: IconKitConfig = {
  version: 1,
  source: { kind: 'file', path: 'logo.svg', format: 'svg' },
  canvas: {
    padding: 0.12,
    background: { type: 'transparent' },
    shape: { type: 'square' },
  },
  targets: ['web-favicon', 'pwa', 'chrome-extension'],
};
const svg = new TextEncoder().encode(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 10" fill="#ff0000"><rect width="20" height="10"/></svg>',
);
beforeAll(async () => {
  await initializeSvgRasterizer(
    Uint8Array.from(
      readFileSync(require.resolve('@resvg/resvg-wasm/index_bg.wasm')),
    ).buffer,
  );
  await initializePngDecoder(
    Uint8Array.from(
      readFileSync(
        require.resolve('@jsquash/png/codec/pkg/squoosh_png_bg.wasm'),
      ),
    ).buffer,
  );
});
describe('config validation', () => {
  it.each([
    null,
    [],
    {},
    { ...base, version: 2 },
    { ...base, targets: ['pwa', 'pwa'] },
    { ...base, extra: true },
    { ...base, source: { ...base.source, path: '../logo.svg' } },
    { ...base, canvas: { ...base.canvas, padding: NaN } },
    {
      ...base,
      canvas: { ...base.canvas, background: { type: 'solid', color: 'red' } },
    },
  ])('rejects invalid input without throwing: %j', (input) => {
    expect(validateConfig(input).valid).toBe(false);
  });
  it('clones valid config without mutation', () => {
    const result = validateConfig(base);
    expect(result.value).toEqual(base);
    expect(result.value).not.toBe(base);
  });
});
describe('complete bundle generation', () => {
  it.each(['svg', 'png'] as const)(
    'renders all presets and reproduces portable %s bundles',
    async (format) => {
      const bytes =
        format === 'svg'
          ? svg
          : Buffer.from(
              readFileSync(
                new URL(
                  '../../../../fixtures/png/opaque-1x1.png.base64',
                  import.meta.url,
                ),
                'utf8',
              ).trim(),
              'base64',
            );
      const config: IconKitConfig = {
        ...base,
        source: { kind: 'file', path: `logo.${format}`, format },
      };
      const result = await generateBundle({
        config,
        source: { format, bytes },
        includeZip: true,
      });
      expect(result.valid, JSON.stringify(result.diagnostics)).toBe(true);
      const bundle = result.value!;
      expect(bundle.files.filter((file) => file.presetId)).toHaveLength(13);
      for (const file of bundle.files.filter(
        (file) => file.format === 'png' && file.presetId,
      )) {
        expect(inspectPng(file.bytes).value).toMatchObject(file.dimensions[0]!);
        expect((await decodePng(file.bytes)).valid).toBe(true);
      }
      const archived = unzipSync(bundle.zip!);
      for (const file of bundle.files)
        expect(archived[file.path]).toEqual(Uint8Array.from(file.bytes));
      const saved = JSON.parse(
        new TextDecoder().decode(bundle.config.bytes),
      ) as IconKitConfig;
      const again = await generateBundle({
        config: saved,
        source: { format, bytes: archived[`source/input.${format}`]! },
        includeZip: true,
      });
      expect(again.value?.zip).toEqual(bundle.zip);
      expect(bundle.files.some((file) => file.path === 'iconkit.svg')).toBe(
        format === 'svg',
      );
    },
  );
  it('preserves root SVG fill, contain fit, and transparency', async () => {
    const result = await renderAsset({
      config: base,
      source: { format: 'svg', bytes: svg },
      width: 32,
      height: 32,
    });
    const image = (await decodePng(result.value!.bytes)).value!;
    expect(
      Array.from(
        image.pixels.slice((16 * 32 + 16) * 4, (16 * 32 + 16) * 4 + 4),
      ),
    ).toEqual([255, 0, 0, 255]);
    expect(image.pixels[3]).toBe(0);
  });
  it('preserves PNG pixels through raster composition', async () => {
    const first = await renderAsset({
      config: { ...base, canvas: { ...base.canvas, padding: 0 } },
      source: { format: 'svg', bytes: svg },
      width: 32,
      height: 32,
    });
    const rasterConfig: IconKitConfig = {
      ...base,
      source: { kind: 'file', path: 'logo.png', format: 'png' },
    };
    const result = await renderAsset({
      config: rasterConfig,
      source: { format: 'png', bytes: first.value!.bytes },
      width: 64,
      height: 64,
    });
    const image = (await decodePng(result.value!.bytes)).value!;
    expect(
      Array.from(
        image.pixels.slice((32 * 64 + 32) * 4, (32 * 64 + 32) * 4 + 4),
      ),
    ).toEqual([255, 0, 0, 255]);
    expect(image.pixels[3]).toBe(0);
  });
  it('rejects malicious sources and changed source hashes', async () => {
    const malicious = new TextEncoder().encode(
      '<svg viewBox="0 0 1 1"><script>alert(1)</script></svg>',
    );
    expect(
      (
        await generateBundle({
          config: base,
          source: { format: 'svg', bytes: malicious },
        })
      ).valid,
    ).toBe(false);
    expect(
      (
        await generateBundle({
          config: {
            ...base,
            source: {
              kind: 'file',
              path: 'logo.svg',
              format: 'svg',
              sha256: '0'.repeat(64),
            },
          },
          source: { format: 'svg', bytes: svg },
        })
      ).diagnostics[0]?.code,
    ).toBe('INPUT_HASH_MISMATCH');
  });

  it('generates a reproducible catalog bundle without source bytes', async () => {
    const config: IconKitConfig = {
      ...base,
      source: {
        kind: 'catalog-icon',
        catalog: 'lucide',
        catalogVersion: '1.50.0',
        id: 'lucide:camera',
      },
      canvas: { ...base.canvas, iconColor: '#2563EB' },
    };
    const first = await generateBundle({ config, includeZip: true });
    const second = await generateBundle({ config, includeZip: true });
    expect(first.valid, JSON.stringify(first.diagnostics)).toBe(true);
    expect(first.value?.zip).toEqual(second.value?.zip);
    expect(first.value?.files.map((file) => file.path)).toContain(
      'THIRD_PARTY_NOTICES.txt',
    );
    expect(
      first.value?.files.some((file) => file.path.startsWith('source/')),
    ).toBe(false);
  });
});
