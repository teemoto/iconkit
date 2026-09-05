import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { beforeAll, describe, expect, it } from 'vitest';
import {
  initializeSvgRasterizer,
  inspectPng,
  renderSvgToPng,
} from '../../src/index.js';

const require = createRequire(import.meta.url);
const squareSvg =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><rect width="1" height="1" fill="#2563EB"/></svg>';

describe('renderSvgToPng', () => {
  beforeAll(async () => {
    const wasmPath = require.resolve('@resvg/resvg-wasm/index_bg.wasm');
    const wasm = readFileSync(wasmPath);
    await initializeSvgRasterizer(
      wasm.buffer.slice(wasm.byteOffset, wasm.byteOffset + wasm.byteLength),
    );
  });

  it('renders exact requested PNG dimensions', () => {
    const result = renderSvgToPng(squareSvg, 128);
    expect(result).toMatchObject({
      valid: true,
      value: { width: 128, height: 128 },
    });
    expect(inspectPng(result.value!.bytes).value).toMatchObject({
      width: 128,
      height: 128,
    });
  });

  it('emits deterministic PNG bytes for identical vector input', () => {
    expect(renderSvgToPng(squareSvg, 32).value?.bytes).toEqual(
      renderSvgToPng(squareSvg, 32).value?.bytes,
    );
  });

  it.each([0, 16.5, 4097])('rejects unsupported PNG size %s', (size) => {
    expect(renderSvgToPng(squareSvg, size).diagnostics[0]?.code).toBe(
      'INPUT_RASTER_TOO_LARGE',
    );
  });
});
