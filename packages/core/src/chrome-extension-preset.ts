import type {
  Canvas,
  Diagnostic,
  GeneratedFile,
  ValidationResult,
} from './index.js';
import { composeSvg } from './compose-svg.js';
import { renderSvgToPng } from './png-renderer.js';
import { inspectSvg, type SvgAsset } from './svg.js';

const OUTPUT_DIRECTORY = 'chrome-extension/icons';
const SIZES = [16, 32, 48, 128] as const;

export interface ChromeExtensionPreset {
  readonly files: readonly GeneratedFile[];
  /** Values suitable for the `icons` field in a Chrome extension manifest. */
  readonly manifestIcons: Readonly<Record<(typeof SIZES)[number], string>>;
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

async function sha256(bytes: Uint8Array): Promise<string> {
  const input = new Uint8Array(bytes.length);
  input.set(bytes);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', input);
  return Array.from(new Uint8Array(digest), (value) =>
    value.toString(16).padStart(2, '0'),
  ).join('');
}

/** Generates the four approved Chrome extension PNG sizes and manifest mapping. */
export async function generateChromeExtensionPreset(
  source: SvgAsset,
  canvas: Canvas,
): Promise<ValidationResult<ChromeExtensionPreset>> {
  const inspected = inspectSvg(source.svg);
  if (!inspected.valid || !inspected.value) {
    return { valid: false, diagnostics: inspected.diagnostics };
  }
  const composition = composeSvg(inspected.value, canvas);
  if (!composition.valid || !composition.value) {
    return { valid: false, diagnostics: composition.diagnostics };
  }

  try {
    const files: GeneratedFile[] = [];
    const manifestIcons: Partial<Record<(typeof SIZES)[number], string>> = {};
    for (const size of SIZES) {
      const rendered = renderSvgToPng(composition.value.svg, size);
      if (!rendered.valid || !rendered.value) {
        return { valid: false, diagnostics: rendered.diagnostics };
      }
      const path = `${OUTPUT_DIRECTORY}/icon-${size}.png`;
      files.push({
        path,
        format: 'png',
        dimensions: [{ width: size, height: size }],
        bytes: rendered.value.bytes,
        sha256: await sha256(rendered.value.bytes),
        presetId: 'chrome-extension',
        presetVersion: 1,
      });
      manifestIcons[size] = path;
    }

    return {
      valid: true,
      value: {
        files,
        manifestIcons: manifestIcons as ChromeExtensionPreset['manifestIcons'],
      },
      diagnostics: [],
    };
  } catch {
    return error(
      'HASH_UNAVAILABLE',
      'IconKit could not create output file hashes.',
      'Use an environment with Web Crypto support.',
    );
  }
}
