import type { Diagnostic, ValidationResult } from './index.js';

const PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10] as const;
const MAX_PIXELS = 16_777_216;
const MAX_DIMENSION = 4096;

export interface PngMetadata {
  readonly width: number;
  readonly height: number;
  readonly bitDepth: number;
  readonly colorType: number;
  readonly hasAlpha: boolean;
}

export interface RasterDecoder {
  inspectPng(bytes: Uint8Array): ValidationResult<PngMetadata>;
}

function error(
  code: string,
  message: string,
  suggestion: string,
): ValidationResult<never> {
  const diagnostic: Diagnostic = {
    severity: 'error',
    code,
    message,
    suggestion,
  };
  return { valid: false, diagnostics: [diagnostic] };
}

export function inspectPng(bytes: Uint8Array): ValidationResult<PngMetadata> {
  if (
    bytes.length < 33 ||
    !PNG_SIGNATURE.every((value, index) => bytes[index] === value)
  ) {
    return error(
      'PNG_INVALID',
      'The PNG signature is invalid.',
      'Re-export the image as a standard PNG.',
    );
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const chunkLength = view.getUint32(8);
  const chunkType = String.fromCharCode(...bytes.slice(12, 16));

  if (chunkLength !== 13 || chunkType !== 'IHDR') {
    return error(
      'PNG_INVALID',
      'The PNG does not contain a valid IHDR header.',
      'Re-export the image as a standard PNG.',
    );
  }

  const width = view.getUint32(16);
  const height = view.getUint32(20);
  const bitDepth = bytes[24]!;
  const colorType = bytes[25]!;

  if (
    width === 0 ||
    height === 0 ||
    width > MAX_DIMENSION ||
    height > MAX_DIMENSION ||
    width * height > MAX_PIXELS
  ) {
    return error(
      'INPUT_RASTER_TOO_LARGE',
      'The PNG exceeds IconKit’s raster decode limit.',
      'Resize the source to 4096×4096 pixels or smaller.',
    );
  }

  return {
    valid: true,
    value: {
      width,
      height,
      bitDepth,
      colorType,
      hasAlpha: colorType === 4 || colorType === 6,
    },
    diagnostics: [],
  };
}
