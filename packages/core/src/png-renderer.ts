import { Resvg, initWasm } from '@resvg/resvg-wasm';
import type { Diagnostic, ValidationResult } from './index.js';

const MAX_DIMENSION = 4096;
const MAX_PIXELS = 16_777_216;
let initialized = false;

export interface RenderedPng {
  readonly bytes: Uint8Array;
  readonly width: number;
  readonly height: number;
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

/** Initializes the shared WASM rasterizer with a host-provided module or bytes. */
export async function initializeSvgRasterizer(
  moduleOrPath: Parameters<typeof initWasm>[0],
): Promise<void> {
  if (initialized) return;
  await initWasm(moduleOrPath);
  initialized = true;
}

/** Renders a vector-safe SVG to an exact square PNG with no host-specific encoder metadata. */
export function renderSvgToPng(
  svg: string,
  size: number,
): ValidationResult<RenderedPng> {
  if (!initialized) {
    return error(
      'RASTERIZER_UNINITIALIZED',
      'The SVG rasterizer has not been initialized.',
      'Initialize the IconKit SVG rasterizer before generating PNG files.',
    );
  }
  if (
    !Number.isInteger(size) ||
    size <= 0 ||
    size > MAX_DIMENSION ||
    size * size > MAX_PIXELS
  ) {
    return error(
      'INPUT_RASTER_TOO_LARGE',
      'The requested PNG dimensions exceed IconKit’s raster limit.',
      'Use a whole-number square size no larger than 4096 pixels.',
    );
  }

  let renderer: InstanceType<typeof Resvg> | undefined;
  let image: ReturnType<InstanceType<typeof Resvg>['render']> | undefined;
  try {
    renderer = new Resvg(svg, { fitTo: { mode: 'width', value: size } });
    image = renderer.render();
    if (image.width !== size || image.height !== size) {
      return error(
        'PNG_RENDER_FAILED',
        'The SVG renderer did not produce the requested square dimensions.',
        'Use a vector-safe square IconKit composition.',
      );
    }
    return {
      valid: true,
      value: { bytes: image.asPng(), width: image.width, height: image.height },
      diagnostics: [],
    };
  } catch {
    return error(
      'PNG_RENDER_FAILED',
      'The SVG could not be rendered as a PNG.',
      'Use a validated vector-safe SVG source and composition.',
    );
  } finally {
    image?.free();
    renderer?.free();
  }
}
