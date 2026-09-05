import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { beforeAll, describe, expect, it } from 'vitest';
import {
  encodeIco,
  initializeSvgRasterizer,
  inspectPng,
  renderSvgToPng,
} from '../../src/index.js';

const require = createRequire(import.meta.url);
const squareSvg =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><rect width="1" height="1" fill="#2563EB"/></svg>';

function decodeIco(
  bytes: Uint8Array,
): { width: number; height: number; bytes: Uint8Array }[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  expect(view.getUint16(0, true)).toBe(0);
  expect(view.getUint16(2, true)).toBe(1);
  const count = view.getUint16(4, true);
  return Array.from({ length: count }, (_, index) => {
    const offset = 6 + index * 16;
    const width = bytes[offset] === 0 ? 256 : bytes[offset]!;
    const height = bytes[offset + 1] === 0 ? 256 : bytes[offset + 1]!;
    const length = view.getUint32(offset + 8, true);
    const imageOffset = view.getUint32(offset + 12, true);
    return {
      width,
      height,
      bytes: bytes.slice(imageOffset, imageOffset + length),
    };
  });
}

describe('encodeIco', () => {
  beforeAll(async () => {
    const wasmPath = require.resolve('@resvg/resvg-wasm/index_bg.wasm');
    const wasm = readFileSync(wasmPath);
    await initializeSvgRasterizer(
      wasm.buffer.slice(wasm.byteOffset, wasm.byteOffset + wasm.byteLength),
    );
  });

  it('creates an ICO with independently readable PNG images', () => {
    const pngs = [16, 32, 48].map(
      (size) => renderSvgToPng(squareSvg, size).value!.bytes,
    );
    const ico = encodeIco([
      { bytes: pngs[2]! },
      { bytes: pngs[0]! },
      { bytes: pngs[1]! },
    ]);
    expect(ico.valid).toBe(true);

    const decoded = decodeIco(ico.value!);
    expect(decoded.map((image) => image.width)).toEqual([16, 32, 48]);
    for (const image of decoded) {
      expect(inspectPng(image.bytes).value).toMatchObject({
        width: image.width,
        height: image.height,
      });
    }
  });

  it('sorts input sizes for deterministic ICO bytes', () => {
    const png16 = renderSvgToPng(squareSvg, 16).value!.bytes;
    const png32 = renderSvgToPng(squareSvg, 32).value!.bytes;
    expect(encodeIco([{ bytes: png32 }, { bytes: png16 }]).value).toEqual(
      encodeIco([{ bytes: png16 }, { bytes: png32 }]).value,
    );
  });

  it('rejects duplicate image dimensions', () => {
    const png = renderSvgToPng(squareSvg, 16).value!.bytes;
    expect(
      encodeIco([{ bytes: png }, { bytes: png }]).diagnostics[0]?.code,
    ).toBe('ICO_INVALID_INPUT');
  });
});
