import { describe, expect, it } from 'vitest';
import { assessVectorOutput } from '../../src/index.js';

const canvas = {
  padding: 0.12,
  background: { type: 'transparent' as const },
  shape: { type: 'square' as const },
};
const svg =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><path fill="currentColor" d="M0 0h1v1H0z"/></svg>';

describe('assessVectorOutput', () => {
  it('allows a validated SVG source and representable canvas', () => {
    expect(assessVectorOutput('svg', canvas, svg)).toMatchObject({
      valid: true,
      value: { available: true },
      diagnostics: [],
    });
  });

  it('reports raster sources as intentionally vector-unavailable', () => {
    expect(assessVectorOutput('png', canvas)).toMatchObject({
      valid: true,
      value: { available: false, reason: 'raster-source' },
      diagnostics: [{ severity: 'info', code: 'VECTOR_EXPORT_UNAVAILABLE' }],
    });
  });

  it('preserves unsafe SVG diagnostics', () => {
    const result = assessVectorOutput(
      'svg',
      canvas,
      '<svg viewBox="0 0 1 1"><script/></svg>',
    );
    expect(result.diagnostics[0]?.code).toBe('SVG_UNSUPPORTED_FEATURE');
  });

  it('rejects non-representable canvas input', () => {
    const result = assessVectorOutput(
      'svg',
      { ...canvas, iconColor: '#fff' },
      svg,
    );
    expect(result.diagnostics[0]?.code).toBe('CANVAS_INVALID_STYLE');
  });
});
