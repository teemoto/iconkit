import { unzlibSync, zlibSync } from 'fflate';
import type { Diagnostic, ValidationResult } from './index.js';

const SIGNATURE = Uint8Array.of(137, 80, 78, 71, 13, 10, 26, 10);

interface RgbaImage {
  readonly width: number;
  readonly height: number;
  readonly pixels: Uint8Array;
}

export interface MonochromePng {
  readonly bytes: Uint8Array;
  readonly solidRectangle: boolean;
}

function failure(): ValidationResult<never> {
  const diagnostic: Diagnostic = {
    severity: 'error',
    code: 'PNG_TRANSFORM_FAILED',
    message: 'IconKit could not transform an internally rendered PNG.',
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

/** Adds the standard sRGB rendering-intent chunk when a PNG does not carry one. */
export function addPngSrgbChunk(
  bytes: Uint8Array,
): ValidationResult<Uint8Array> {
  if (
    bytes.length < 33 ||
    !SIGNATURE.every((value, index) => bytes[index] === value)
  )
    return failure();
  try {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    for (let offset = 8; offset + 12 <= bytes.length;) {
      const length = view.getUint32(offset);
      const type = new TextDecoder().decode(
        bytes.subarray(offset + 4, offset + 8),
      );
      if (type === 'sRGB')
        return { valid: true, value: bytes, diagnostics: [] };
      if (type === 'IHDR') {
        const end = offset + length + 12;
        const srgb = chunk('sRGB', Uint8Array.of(0));
        const output = new Uint8Array(bytes.length + srgb.length);
        output.set(bytes.subarray(0, end));
        output.set(srgb, end);
        output.set(bytes.subarray(end), end + srgb.length);
        return { valid: true, value: output, diagnostics: [] };
      }
      offset += length + 12;
    }
    return failure();
  } catch {
    return failure();
  }
}

function decodeRgba(bytes: Uint8Array): RgbaImage | undefined {
  if (!SIGNATURE.every((value, index) => bytes[index] === value)) return;
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
      const header = new DataView(
        data.buffer,
        data.byteOffset,
        data.byteLength,
      );
      width = header.getUint32(0);
      height = header.getUint32(4);
      if (
        data[8] !== 8 ||
        data[9] !== 6 ||
        data[10] !== 0 ||
        data[11] !== 0 ||
        data[12] !== 0
      )
        return;
    } else if (type === 'IDAT') idat.push(data);
    offset += length + 12;
  }
  if (!width || !height || !idat.length) return;
  const compressed = new Uint8Array(
    idat.reduce((total, item) => total + item.length, 0),
  );
  let cursor = 0;
  for (const item of idat) {
    compressed.set(item, cursor);
    cursor += item.length;
  }
  const filtered = unzlibSync(compressed);
  const stride = width * 4;
  if (filtered.length !== (stride + 1) * height) return;
  const pixels = new Uint8Array(stride * height);
  for (let y = 0; y < height; y++) {
    const rowStart = y * (stride + 1);
    const filter = filtered[rowStart]!;
    for (let x = 0; x < stride; x++) {
      const raw = filtered[rowStart + 1 + x]!;
      const left = x >= 4 ? pixels[y * stride + x - 4]! : 0;
      const up = y ? pixels[(y - 1) * stride + x]! : 0;
      const upperLeft = y && x >= 4 ? pixels[(y - 1) * stride + x - 4]! : 0;
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
      if (predictor < 0) return;
      pixels[y * stride + x] = (raw + predictor) & 0xff;
    }
  }
  return { width, height, pixels };
}

function encode(
  width: number,
  height: number,
  pixels: Uint8Array,
  channels: 3 | 4,
): Uint8Array {
  const stride = width * channels;
  const scanlines = new Uint8Array((stride + 1) * height);
  for (let y = 0; y < height; y++)
    scanlines.set(
      pixels.subarray(y * stride, (y + 1) * stride),
      y * (stride + 1) + 1,
    );
  const header = new Uint8Array(13);
  const headerView = new DataView(header.buffer);
  headerView.setUint32(0, width);
  headerView.setUint32(4, height);
  header.set([8, channels === 3 ? 2 : 6, 0, 0, 0], 8);
  const chunks = [
    chunk('IHDR', header),
    chunk('IDAT', zlibSync(scanlines)),
    chunk('IEND', new Uint8Array()),
  ];
  const output = new Uint8Array(
    SIGNATURE.length + chunks.reduce((total, item) => total + item.length, 0),
  );
  output.set(SIGNATURE);
  let cursor = SIGNATURE.length;
  for (const item of chunks) {
    output.set(item, cursor);
    cursor += item.length;
  }
  return output;
}

/** Encodes validated RGBA pixels into IconKit's deterministic internal PNG form. */
export function encodeRgbaPng(
  width: number,
  height: number,
  pixels: Uint8Array,
): ValidationResult<Uint8Array> {
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width < 1 ||
    height < 1 ||
    pixels.length !== width * height * 4
  )
    return failure();
  try {
    return {
      valid: true,
      value: encode(width, height, pixels, 4),
      diagnostics: [],
    };
  } catch {
    return failure();
  }
}

/** Converts an 8-bit RGBA PNG to an RGB PNG after verifying every pixel is opaque. */
export function removeOpaquePngAlpha(
  bytes: Uint8Array,
): ValidationResult<Uint8Array> {
  try {
    const image = decodeRgba(bytes);
    if (!image) return failure();
    const rgb = new Uint8Array(image.width * image.height * 3);
    for (
      let source = 0, target = 0;
      source < image.pixels.length;
      source += 4
    ) {
      if (image.pixels[source + 3] !== 255) return failure();
      rgb.set(image.pixels.subarray(source, source + 3), target);
      target += 3;
    }
    return {
      valid: true,
      value: encode(image.width, image.height, rgb, 3),
      diagnostics: [],
    };
  } catch {
    return failure();
  }
}

/** Creates a white RGBA silhouette from an internally rendered PNG alpha mask. */
export function createMonochromePng(
  bytes: Uint8Array,
): ValidationResult<MonochromePng> {
  try {
    const image = decodeRgba(bytes);
    if (!image) return failure();
    const pixels = new Uint8Array(image.pixels.length);
    let minX = image.width;
    let minY = image.height;
    let maxX = -1;
    let maxY = -1;
    for (let y = 0; y < image.height; y++)
      for (let x = 0; x < image.width; x++) {
        const offset = (y * image.width + x) * 4;
        const alpha = image.pixels[offset + 3]!;
        pixels.set([255, 255, 255, alpha], offset);
        if (alpha) {
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        }
      }
    if (maxX < 0) return failure();
    let solidRectangle = true;
    for (let y = minY; y <= maxY && solidRectangle; y++)
      for (let x = minX; x <= maxX; x++)
        if (image.pixels[(y * image.width + x) * 4 + 3] !== 255) {
          solidRectangle = false;
          break;
        }
    return {
      valid: true,
      value: {
        bytes: encode(image.width, image.height, pixels, 4),
        solidRectangle,
      },
      diagnostics: [],
    };
  } catch {
    return failure();
  }
}
