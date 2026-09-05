import type { Background, Diagnostic, ValidationResult } from './index.js';

const COLOR = /^#[0-9a-f]{6}$/i;
const GRADIENT_ID = 'iconkit-background';

export interface SvgBackground {
  /** SVG definitions required by the background, if any. */
  readonly defs: string;
  /** SVG content drawn behind the source artwork. */
  readonly content: string;
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

function formatNumber(value: number): string {
  const rounded = Math.round(value * 1_000_000) / 1_000_000;
  return Object.is(rounded, -0) ? '0' : String(rounded);
}

function validColor(color: string): boolean {
  return COLOR.test(color);
}

/**
 * Produces deterministic SVG background markup for the canonical unit square.
 * Gradient coordinates are calculated from the approved clockwise-from-up angle.
 */
export function renderSvgBackground(
  background: Background,
): ValidationResult<SvgBackground> {
  if (background.type === 'transparent') {
    return { valid: true, value: { defs: '', content: '' }, diagnostics: [] };
  }

  if (background.type === 'solid') {
    if (!validColor(background.color)) {
      return error(
        'Solid canvas colors must be opaque #RRGGBB values.',
        'Use a six-digit hexadecimal color, such as #2563EB.',
      );
    }
    return {
      valid: true,
      value: {
        defs: '',
        content: `<rect width="1" height="1" fill="${background.color}"/>`,
      },
      diagnostics: [],
    };
  }

  if (
    !validColor(background.from) ||
    !validColor(background.to) ||
    !Number.isInteger(background.angle) ||
    background.angle < 0 ||
    background.angle > 359
  ) {
    return error(
      'Linear gradients require two opaque #RRGGBB colors and an angle from 0 through 359.',
      'Use two six-digit hexadecimal colors and a whole-number angle.',
    );
  }

  const radians = (background.angle * Math.PI) / 180;
  const directionX = Math.sin(radians);
  const directionY = -Math.cos(radians);
  const distance = 0.5 / Math.max(Math.abs(directionX), Math.abs(directionY));
  const x1 = 0.5 - directionX * distance;
  const y1 = 0.5 - directionY * distance;
  const x2 = 0.5 + directionX * distance;
  const y2 = 0.5 + directionY * distance;

  return {
    valid: true,
    value: {
      defs: `<linearGradient id="${GRADIENT_ID}" x1="${formatNumber(x1)}" y1="${formatNumber(y1)}" x2="${formatNumber(x2)}" y2="${formatNumber(y2)}"><stop offset="0" stop-color="${background.from}"/><stop offset="1" stop-color="${background.to}"/></linearGradient>`,
      content: `<rect width="1" height="1" fill="url(#${GRADIENT_ID})"/>`,
    },
    diagnostics: [],
  };
}
