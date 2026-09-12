import type {
  Canvas,
  Diagnostic,
  GeneratedFile,
  ValidationResult,
} from './index.js';
import { composeSvg } from './compose-svg.js';
import { renderSvgToPng } from './png-renderer.js';
import { inspectSvg, type SvgAsset } from './svg.js';

const OUTPUT_DIRECTORY = 'pwa/icons';
const SIZES = [192, 512] as const;

export interface PwaPresetOptions {
  readonly includeMaskable?: boolean;
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

function maskablePadding(source: SvgAsset): number {
  const aspect = Math.max(
    source.width / source.height,
    source.height / source.width,
  );
  const largestSafeSide = 0.8 / Math.sqrt(1 + 1 / aspect ** 2);
  return (1 - largestSafeSide) / 2;
}

async function renderFile(
  svg: string,
  filename: string,
  size: number,
): Promise<ValidationResult<GeneratedFile>> {
  const rendered = renderSvgToPng(svg, size);
  if (!rendered.valid || !rendered.value) {
    return { valid: false, diagnostics: rendered.diagnostics };
  }
  try {
    return {
      valid: true,
      value: {
        path: `${OUTPUT_DIRECTORY}/${filename}`,
        format: 'png',
        dimensions: [{ width: size, height: size }],
        bytes: rendered.value.bytes,
        sha256: await sha256(rendered.value.bytes),
        presetId: 'pwa',
        presetVersion: 1,
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

/** Generates standard and, by default, maskable PWA icons from an SVG source. */
export async function generatePwaPreset(
  source: SvgAsset,
  canvas: Canvas,
  options: PwaPresetOptions = {},
): Promise<ValidationResult<readonly GeneratedFile[]>> {
  const inspected = inspectSvg(source.svg);
  if (!inspected.valid || !inspected.value) {
    return { valid: false, diagnostics: inspected.diagnostics };
  }

  const standard = composeSvg(inspected.value, canvas);
  if (!standard.valid || !standard.value) {
    return { valid: false, diagnostics: standard.diagnostics };
  }

  const includeMaskable = options.includeMaskable ?? true;
  const diagnostics: Diagnostic[] = [];
  let maskableSvg = standard.value.svg;
  if (includeMaskable) {
    const requiredPadding = maskablePadding(inspected.value);
    const padding = Math.max(canvas.padding, requiredPadding);
    const maskable = composeSvg(inspected.value, { ...canvas, padding });
    if (!maskable.valid || !maskable.value) {
      return { valid: false, diagnostics: maskable.diagnostics };
    }
    maskableSvg = maskable.value.svg;
    if (padding > canvas.padding) {
      diagnostics.push({
        severity: 'warning',
        code: 'PWA_MASKABLE_SAFE_AREA_ADJUSTED',
        message:
          'Maskable PWA icons use increased padding to keep artwork in the guaranteed safe zone.',
        suggestion: 'Review the maskable output preview before publishing.',
        details: { requestedPadding: canvas.padding, appliedPadding: padding },
      });
    }
  }

  const outputRequests = [
    ...SIZES.map((size) => ({
      svg: standard.value!.svg,
      filename: `icon-${size}.png`,
      size,
    })),
    ...(includeMaskable
      ? SIZES.map((size) => ({
          svg: maskableSvg,
          filename: `icon-maskable-${size}.png`,
          size,
        }))
      : []),
  ];
  const files: GeneratedFile[] = [];
  for (const request of outputRequests) {
    const rendered = await renderFile(
      request.svg,
      request.filename,
      request.size,
    );
    if (!rendered.valid || !rendered.value) {
      return { valid: false, diagnostics: rendered.diagnostics };
    }
    files.push(rendered.value);
  }

  return { valid: true, value: files, diagnostics };
}
