import type {
  Canvas,
  Diagnostic,
  SourceFormat,
  ValidationResult,
} from './index.js';
import { renderSvgBackground } from './background.js';
import { renderSvgCanvasClip } from './shape.js';
import { inspectSvg } from './svg.js';

export interface VectorOutputDecision {
  readonly available: boolean;
  readonly reason?: string;
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

/**
 * Determines whether an additional SVG artifact can faithfully represent the
 * requested source and canvas. PNG sources always remain raster-only.
 */
export function assessVectorOutput(
  format: SourceFormat,
  canvas: Canvas,
  svg?: string,
): ValidationResult<VectorOutputDecision> {
  if (format === 'png') {
    const diagnostic: Diagnostic = {
      severity: 'info',
      code: 'VECTOR_EXPORT_UNAVAILABLE',
      message: 'A PNG source cannot be emitted as a vector-safe SVG.',
      suggestion: 'Use an SVG source to include an additional SVG artifact.',
    };
    return {
      valid: true,
      value: { available: false, reason: 'raster-source' },
      diagnostics: [diagnostic],
    };
  }

  if (!svg) {
    return error(
      'SVG source bytes are required to assess vector output.',
      'Supply the validated SVG source before requesting an SVG artifact.',
    );
  }
  const inspected = inspectSvg(svg);
  if (!inspected.valid)
    return { valid: false, diagnostics: inspected.diagnostics };

  const background = renderSvgBackground(canvas.background);
  if (!background.valid)
    return { valid: false, diagnostics: background.diagnostics };
  const clip = renderSvgCanvasClip(canvas.shape);
  if (!clip.valid) return { valid: false, diagnostics: clip.diagnostics };

  if (canvas.iconColor && !/^#[0-9a-f]{6}$/i.test(canvas.iconColor)) {
    return error(
      'Icon color overrides must be opaque #RRGGBB values.',
      'Use a six-digit hexadecimal color, such as #2563EB.',
    );
  }

  return { valid: true, value: { available: true }, diagnostics: [] };
}
