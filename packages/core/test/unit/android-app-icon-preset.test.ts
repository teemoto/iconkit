import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { DOMParser } from '@xmldom/xmldom';
import { beforeAll, describe, expect, it } from 'vitest';
import {
  decodePng,
  generatePreset,
  initializePngDecoder,
  initializeSvgRasterizer,
  inspectPng,
  type IconKitConfig,
} from '../../src/index.js';

const require = createRequire(import.meta.url);
const source = new TextEncoder().encode(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><circle cx=".5" cy=".5" r=".45" fill="#2563EB"/></svg>',
);
const config: IconKitConfig = {
  version: 1,
  source: { kind: 'file', path: 'logo.svg', format: 'svg' },
  canvas: {
    padding: 0,
    background: { type: 'transparent' },
    shape: { type: 'rounded-square', cornerRadius: 0.2 },
  },
  targets: ['android-app-icon'],
};

describe('Android app icon preset', () => {
  beforeAll(async () => {
    const resvg = readFileSync(
      require.resolve('@resvg/resvg-wasm/index_bg.wasm'),
    );
    await initializeSvgRasterizer(
      resvg.buffer.slice(resvg.byteOffset, resvg.byteOffset + resvg.byteLength),
    );
    const png = readFileSync(
      require.resolve('@jsquash/png/codec/pkg/squoosh_png_bg.wasm'),
    );
    await initializePngDecoder(
      png.buffer.slice(png.byteOffset, png.byteOffset + png.byteLength),
    );
  });

  it('generates the complete deterministic Android resource tree', async () => {
    const request = {
      config,
      source: { format: 'svg' as const, bytes: source },
      presetId: 'android-app-icon' as const,
    };
    const result = await generatePreset(request);
    expect(result.valid, JSON.stringify(result.diagnostics)).toBe(true);
    expect(result.value).toHaveLength(28);
    expect(result.diagnostics.map((item) => item.code)).toEqual([
      'ANDROID_ADAPTIVE_SAFE_AREA_ADJUSTED',
      'ANDROID_OPAQUE_BACKGROUND_APPLIED',
      'ANDROID_SHAPE_IGNORED',
    ]);
    const paths = new Set(result.value!.map((file) => file.path));
    for (const density of ['mdpi', 'hdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi'])
      for (const name of [
        'ic_launcher.png',
        'ic_launcher_round.png',
        'ic_launcher_foreground.png',
        'ic_launcher_background.png',
        'ic_launcher_monochrome.png',
      ])
        expect(paths).toContain(
          `android/app/src/main/res/mipmap-${density}/${name}`,
        );

    const background = result.value!.find((file) =>
      file.path.endsWith('mipmap-xxxhdpi/ic_launcher_background.png'),
    )!;
    expect(inspectPng(background.bytes).value).toMatchObject({
      width: 432,
      height: 432,
    });
    const backgroundPixels = (await decodePng(background.bytes)).value!.pixels;
    expect(
      backgroundPixels.every(
        (value, index) => index % 4 !== 3 || value === 255,
      ),
    ).toBe(true);

    const monochrome = result.value!.find((file) =>
      file.path.endsWith('mipmap-xxxhdpi/ic_launcher_monochrome.png'),
    )!;
    const mono = (await decodePng(monochrome.bytes)).value!;
    let minX = mono.width;
    let minY = mono.height;
    let maxX = -1;
    let maxY = -1;
    const colors = new Set<string>();
    for (let y = 0; y < mono.height; y++)
      for (let x = 0; x < mono.width; x++) {
        const offset = (y * mono.width + x) * 4;
        const [red, green, blue, alpha] = mono.pixels.subarray(
          offset,
          offset + 4,
        );
        colors.add(`${red},${green},${blue}`);
        if (alpha) {
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        }
      }
    expect(colors).toEqual(new Set(['255,255,255']));
    expect({ minX, minY, maxX, maxY }).toMatchObject({
      minX: expect.any(Number),
      minY: expect.any(Number),
      maxX: expect.any(Number),
      maxY: expect.any(Number),
    });
    expect(minX).toBeGreaterThanOrEqual(84);
    expect(minY).toBeGreaterThanOrEqual(84);
    expect(maxX).toBeLessThan(348);
    expect(maxY).toBeLessThan(348);

    const play = result.value!.find(
      (file) => file.path === 'android/play-store-icon.png',
    )!;
    expect(inspectPng(play.bytes).value).toMatchObject({
      width: 512,
      height: 512,
    });
    expect(Buffer.from(play.bytes).includes(Buffer.from('sRGB'))).toBe(true);
    expect(play.bytes.length).toBeLessThanOrEqual(1024 * 1024);

    for (const filename of ['ic_launcher.xml', 'ic_launcher_round.xml']) {
      const file = result.value!.find((item) => item.path.endsWith(filename))!;
      const document = new DOMParser().parseFromString(
        new TextDecoder().decode(file.bytes),
        'application/xml',
      );
      const root = document.documentElement;
      expect(root).not.toBeNull();
      if (!root) throw new Error('Adaptive icon XML has no root element.');
      expect(root.tagName).toBe('adaptive-icon');
      expect(
        root
          .getElementsByTagName('background')[0]
          ?.getAttribute('android:drawable'),
      ).toBe('@mipmap/ic_launcher_background');
      expect(
        root
          .getElementsByTagName('foreground')[0]
          ?.getAttribute('android:drawable'),
      ).toBe('@mipmap/ic_launcher_foreground');
      expect(
        root
          .getElementsByTagName('monochrome')[0]
          ?.getAttribute('android:drawable'),
      ).toBe('@mipmap/ic_launcher_monochrome');
    }
    expect((await generatePreset(request)).value).toEqual(result.value);
  });
});
