import { describe, expect, it } from 'vitest';
import { renderSvgCanvasClip } from '../../src/index.js';

describe('renderSvgCanvasClip', () => {
  it('does not add a clip for a square canvas', () => {
    expect(renderSvgCanvasClip({ type: 'square' }).value).toEqual({
      defs: '',
      contentOpen: '',
      contentClose: '',
    });
  });

  it('clips a circle to the canonical unit square', () => {
    expect(renderSvgCanvasClip({ type: 'circle' }).value).toEqual({
      defs: '<clipPath id="iconkit-canvas-clip"><circle cx="0.5" cy="0.5" r="0.5"/></clipPath>',
      contentOpen: '<g clip-path="url(#iconkit-canvas-clip)">',
      contentClose: '</g>',
    });
  });

  it('clips a rounded square using its normalized corner radius', () => {
    expect(
      renderSvgCanvasClip({ type: 'rounded-square', cornerRadius: 0.2 }).value
        ?.defs,
    ).toBe(
      '<clipPath id="iconkit-canvas-clip"><rect width="1" height="1" rx="0.2"/></clipPath>',
    );
  });

  it('treats a zero-radius rounded square as an unclipped square', () => {
    expect(
      renderSvgCanvasClip({ type: 'rounded-square', cornerRadius: 0 }).value,
    ).toEqual({
      defs: '',
      contentOpen: '',
      contentClose: '',
    });
  });

  it.each([-0.01, 0.51, Number.NaN])(
    'rejects invalid corner radius %s',
    (cornerRadius) => {
      expect(
        renderSvgCanvasClip({ type: 'rounded-square', cornerRadius })
          .diagnostics[0]?.code,
      ).toBe('CANVAS_INVALID_STYLE');
    },
  );
});
