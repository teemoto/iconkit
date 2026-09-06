import type { Diagnostic, GeneratedFile, ValidationResult } from './index.js';
import { encodeIco } from './ico.js';
import { renderSvgToPng } from './png-renderer.js';

const FAVICON_SIZES = [16, 32, 48] as const;
const PNG_OUTPUTS = [
  { filename: 'favicon-16x16.png', size: 16 },
  { filename: 'favicon-32x32.png', size: 32 },
  { filename: 'favicon-48x48.png', size: 48 },
  { filename: 'apple-touch-icon.png', size: 180 },
] as const;
const OUTPUT_DIRECTORY = 'web/favicon';

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

async function sha256(bytes: Uint8Array): Promise<string> {
  const input = new Uint8Array(bytes.length);
  input.set(bytes);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', input);
  return Array.from(new Uint8Array(digest), (value) =>
    value.toString(16).padStart(2, '0'),
  ).join('');
}

async function file(
  path: string,
  format: GeneratedFile['format'],
  dimensions: GeneratedFile['dimensions'],
  bytes: Uint8Array,
): Promise<GeneratedFile> {
  return {
    path,
    format,
    dimensions,
    bytes,
    sha256: await sha256(bytes),
    presetId: 'web-favicon',
    presetVersion: 1,
  };
}

/** Generates every approved web-favicon artifact from a composed vector-safe SVG. */
export async function generateFaviconPreset(
  svg: string,
): Promise<ValidationResult<readonly GeneratedFile[]>> {
  const pngs = new Map<number, Uint8Array>();
  for (const size of [...FAVICON_SIZES, 180]) {
    const rendered = renderSvgToPng(svg, size);
    if (!rendered.valid || !rendered.value) {
      return { valid: false, diagnostics: rendered.diagnostics };
    }
    pngs.set(size, rendered.value.bytes);
  }

  const ico = encodeIco(
    FAVICON_SIZES.map((size) => ({ bytes: pngs.get(size)! })),
  );
  if (!ico.valid || !ico.value)
    return { valid: false, diagnostics: ico.diagnostics };

  try {
    const files = await Promise.all([
      file(
        `${OUTPUT_DIRECTORY}/favicon.ico`,
        'ico',
        FAVICON_SIZES.map((size) => ({ width: size, height: size })),
        ico.value,
      ),
      ...PNG_OUTPUTS.map(({ filename, size }) =>
        file(
          `${OUTPUT_DIRECTORY}/${filename}`,
          'png',
          [{ width: size, height: size }],
          pngs.get(size)!,
        ),
      ),
    ]);
    return { valid: true, value: files, diagnostics: [] };
  } catch {
    return error(
      'HASH_UNAVAILABLE',
      'IconKit could not create output file hashes.',
      'Use an environment with Web Crypto support.',
    );
  }
}
