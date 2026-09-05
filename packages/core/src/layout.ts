import type { Diagnostic, Dimension, ValidationResult } from './index.js';

const MAX_PADDING = 0.4;

export interface NormalizedRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface CanonicalLayout {
  /** Equal-inset square region in which source artwork may be placed. */
  readonly safeArea: NormalizedRect;
  /** Centered, contain-fit source bounds expressed in canonical canvas fractions. */
  readonly artwork: NormalizedRect;
}

export interface PixelRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

function error(message: string, suggestion: string): ValidationResult<never> {
  const diagnostic: Diagnostic = {
    severity: 'error',
    code: 'LAYOUT_INVALID_INPUT',
    message,
    suggestion,
  };
  return { valid: false, diagnostics: [diagnostic] };
}

/**
 * Computes source placement on IconKit's unit-square canvas. All output sizes
 * derive from these fractions so source placement never drifts by target size.
 */
export function computeContainFitLayout(
  source: Dimension,
  padding: number,
): ValidationResult<CanonicalLayout> {
  if (
    !Number.isFinite(source.width) ||
    !Number.isFinite(source.height) ||
    source.width <= 0 ||
    source.height <= 0
  ) {
    return error(
      'Source dimensions must be finite positive numbers.',
      'Provide the decoded source dimensions before computing layout.',
    );
  }
  if (!Number.isFinite(padding) || padding < 0 || padding > MAX_PADDING) {
    return error(
      'Padding must be a normalized value between 0 and 0.40.',
      'Use a padding value from 0 through 0.40.',
    );
  }

  const safeSize = 1 - padding * 2;
  const sourceAspect = source.width / source.height;
  const artwork =
    sourceAspect >= 1
      ? { width: safeSize, height: safeSize / sourceAspect }
      : { width: safeSize * sourceAspect, height: safeSize };

  return {
    valid: true,
    value: {
      safeArea: { x: padding, y: padding, width: safeSize, height: safeSize },
      artwork: {
        x: (1 - artwork.width) / 2,
        y: (1 - artwork.height) / 2,
        ...artwork,
      },
    },
    diagnostics: [],
  };
}

/** Converts normalized canonical geometry to an exact square target size. */
export function toPixelRect(rect: NormalizedRect, size: number): PixelRect {
  return {
    x: rect.x * size,
    y: rect.y * size,
    width: rect.width * size,
    height: rect.height * size,
  };
}
