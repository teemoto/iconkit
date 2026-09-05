import type { Diagnostic, ValidationResult } from './index.js';
import { inspectPng } from './png.js';

const ICO_HEADER_BYTES = 6;
const ICO_ENTRY_BYTES = 16;

export interface IcoImage {
  readonly bytes: Uint8Array;
}

function error(message: string, suggestion: string): ValidationResult<never> {
  const diagnostic: Diagnostic = {
    severity: 'error',
    code: 'ICO_INVALID_INPUT',
    message,
    suggestion,
  };
  return { valid: false, diagnostics: [diagnostic] };
}

/** Encodes square PNG images as a deterministic ICO file with PNG payloads. */
export function encodeIco(
  images: readonly IcoImage[],
): ValidationResult<Uint8Array> {
  if (images.length === 0 || images.length > 65_535) {
    return error(
      'An ICO file must contain at least one image.',
      'Provide one or more square PNG images.',
    );
  }

  const entries: { bytes: Uint8Array; size: number }[] = [];
  const seenSizes = new Set<number>();
  for (const image of images) {
    const inspected = inspectPng(image.bytes);
    if (!inspected.valid || !inspected.value) {
      return error(
        'ICO images must be valid PNG files.',
        'Generate each ICO source image as a PNG first.',
      );
    }
    const { width, height } = inspected.value;
    if (width !== height || width > 256) {
      return error(
        'ICO images must be square and no larger than 256×256 pixels.',
        'Use square PNG sources from 1×1 through 256×256 pixels.',
      );
    }
    if (seenSizes.has(width)) {
      return error(
        'ICO images must use unique dimensions.',
        'Provide only one PNG for each square size.',
      );
    }
    seenSizes.add(width);
    entries.push({ bytes: image.bytes, size: width });
  }

  const sorted = entries.sort((left, right) => left.size - right.size);
  const payloadOffset = ICO_HEADER_BYTES + sorted.length * ICO_ENTRY_BYTES;
  const output = new Uint8Array(
    payloadOffset + sorted.reduce((sum, entry) => sum + entry.bytes.length, 0),
  );
  const view = new DataView(output.buffer);
  view.setUint16(0, 0, true);
  view.setUint16(2, 1, true);
  view.setUint16(4, sorted.length, true);

  let offset = payloadOffset;
  for (const [index, entry] of sorted.entries()) {
    const entryOffset = ICO_HEADER_BYTES + index * ICO_ENTRY_BYTES;
    output[entryOffset] = entry.size === 256 ? 0 : entry.size;
    output[entryOffset + 1] = entry.size === 256 ? 0 : entry.size;
    output[entryOffset + 2] = 0;
    output[entryOffset + 3] = 0;
    view.setUint16(entryOffset + 4, 1, true);
    view.setUint16(entryOffset + 6, 32, true);
    view.setUint32(entryOffset + 8, entry.bytes.length, true);
    view.setUint32(entryOffset + 12, offset, true);
    output.set(entry.bytes, offset);
    offset += entry.bytes.length;
  }

  return { valid: true, value: output, diagnostics: [] };
}
