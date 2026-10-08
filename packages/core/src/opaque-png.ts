import { unzlibSync, zlibSync } from 'fflate';
import type { Diagnostic, ValidationResult } from './index.js';

const SIGNATURE = Uint8Array.of(137, 80, 78, 71, 13, 10, 26, 10);

function failure(): ValidationResult<never> {
  const diagnostic: Diagnostic = {
    severity: 'error',
    code: 'PNG_ALPHA_REMOVAL_FAILED',
    message: 'IconKit could not remove the alpha channel from the iOS icon.',
    suggestion: 'Try a different source image or background.',
  };
  return { valid: false, diagnostics: [diagnostic] };
}

function paeth(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++)
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const typeBytes = new TextEncoder().encode(type);
  const output = new Uint8Array(12 + data.length);
  const view = new DataView(output.buffer);
  view.setUint32(0, data.length);
  output.set(typeBytes, 4);
  output.set(data, 8);
  view.setUint32(8 + data.length, crc32(output.subarray(4, 8 + data.length)));
  return output;
}

/** Converts an 8-bit RGBA PNG to an RGB PNG after verifying every pixel is opaque. */
export function removeOpaquePngAlpha(
  bytes: Uint8Array,
): ValidationResult<Uint8Array> {
  try {
    if (!SIGNATURE.every((value, index) => bytes[index] === value))
      return failure();
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const idat: Uint8Array[] = [];
    let width = 0;
    let height = 0;
    for (let offset = 8; offset + 12 <= bytes.length;) {
      const length = view.getUint32(offset);
      const type = new TextDecoder().decode(
        bytes.subarray(offset + 4, offset + 8),
      );
      const data = bytes.subarray(offset + 8, offset + 8 + length);
      if (type === 'IHDR') {
        width = new DataView(
          data.buffer,
          data.byteOffset,
          data.byteLength,
        ).getUint32(0);
        height = new DataView(
          data.buffer,
          data.byteOffset,
          data.byteLength,
        ).getUint32(4);
        if (
          data[8] !== 8 ||
          data[9] !== 6 ||
          data[10] !== 0 ||
          data[11] !== 0 ||
          data[12] !== 0
        )
          return failure();
      } else if (type === 'IDAT') idat.push(data);
      offset += length + 12;
    }
    if (!width || !height || !idat.length) return failure();
    const compressed = new Uint8Array(
      idat.reduce((total, item) => total + item.length, 0),
    );
    let cursor = 0;
    for (const item of idat) {
      compressed.set(item, cursor);
      cursor += item.length;
    }
    const filtered = unzlibSync(compressed);
    const rgbaStride = width * 4;
    if (filtered.length !== (rgbaStride + 1) * height) return failure();
    const rgba = new Uint8Array(rgbaStride * height);
    for (let y = 0; y < height; y++) {
      const rowStart = y * (rgbaStride + 1);
      const filter = filtered[rowStart]!;
      for (let x = 0; x < rgbaStride; x++) {
        const raw = filtered[rowStart + 1 + x]!;
        const left = x >= 4 ? rgba[y * rgbaStride + x - 4]! : 0;
        const up = y ? rgba[(y - 1) * rgbaStride + x]! : 0;
        const upperLeft = y && x >= 4 ? rgba[(y - 1) * rgbaStride + x - 4]! : 0;
        const predictor =
          filter === 0
            ? 0
            : filter === 1
              ? left
              : filter === 2
                ? up
                : filter === 3
                  ? Math.floor((left + up) / 2)
                  : filter === 4
                    ? paeth(left, up, upperLeft)
                    : -1;
        if (predictor < 0) return failure();
        rgba[y * rgbaStride + x] = (raw + predictor) & 0xff;
      }
    }
    const rgbStride = width * 3;
    const rgb = new Uint8Array((rgbStride + 1) * height);
    for (let y = 0; y < height; y++) {
      const outputRow = y * (rgbStride + 1);
      for (let x = 0; x < width; x++) {
        const source = y * rgbaStride + x * 4;
        if (rgba[source + 3] !== 255) return failure();
        rgb.set(rgba.subarray(source, source + 3), outputRow + 1 + x * 3);
      }
    }
    const header = new Uint8Array(13);
    const headerView = new DataView(header.buffer);
    headerView.setUint32(0, width);
    headerView.setUint32(4, height);
    header.set([8, 2, 0, 0, 0], 8);
    const chunks = [
      chunk('IHDR', header),
      chunk('IDAT', zlibSync(rgb)),
      chunk('IEND', new Uint8Array()),
    ];
    const output = new Uint8Array(
      SIGNATURE.length + chunks.reduce((total, item) => total + item.length, 0),
    );
    output.set(SIGNATURE);
    cursor = SIGNATURE.length;
    for (const item of chunks) {
      output.set(item, cursor);
      cursor += item.length;
    }
    return { valid: true, value: output, diagnostics: [] };
  } catch {
    return failure();
  }
}
