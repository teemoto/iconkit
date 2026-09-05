import type { CanvasShape, Diagnostic, ValidationResult } from './index.js';

const CLIP_ID = 'iconkit-canvas-clip';

export interface SvgCanvasClip {
  /** SVG definitions required to clip the canonical canvas, if any. */
  readonly defs: string;
  /** Opening group tag applied around every canvas layer, if clipping is required. */
  readonly contentOpen: string;
  readonly contentClose: string;
}

function error(message: string, suggestion: string): ValidationResult<never> {
  const diagnostic: Diagnostic = {
    severity: 'error',
    code: 'CANVAS_INVALID_STYLE',
    message,
    suggestion,
  };
  return { valid: false, diagnostics: [diagnostic] };
}

function clipped(definition: string): ValidationResult<SvgCanvasClip> {
  return {
    valid: true,
    value: {
      defs: `<clipPath id="${CLIP_ID}">${definition}</clipPath>`,
      contentOpen: `<g clip-path="url(#${CLIP_ID})">`,
      contentClose: '</g>',
    },
    diagnostics: [],
  };
}

/** Produces the one canonical canvas clip shared by background and artwork layers. */
export function renderSvgCanvasClip(
  shape: CanvasShape,
): ValidationResult<SvgCanvasClip> {
  if (shape.type === 'square') {
    return {
      valid: true,
      value: { defs: '', contentOpen: '', contentClose: '' },
      diagnostics: [],
    };
  }

  if (shape.type === 'circle') {
    return clipped('<circle cx="0.5" cy="0.5" r="0.5"/>');
  }

  if (
    !Number.isFinite(shape.cornerRadius) ||
    shape.cornerRadius < 0 ||
    shape.cornerRadius > 0.5
  ) {
    return error(
      'Rounded-square corner radius must be a normalized value from 0 through 0.50.',
      'Use a corner radius between 0 and 0.50.',
    );
  }

  if (shape.cornerRadius === 0) {
    return {
      valid: true,
      value: { defs: '', contentOpen: '', contentClose: '' },
      diagnostics: [],
    };
  }

  return clipped(`<rect width="1" height="1" rx="${shape.cornerRadius}"/>`);
}
