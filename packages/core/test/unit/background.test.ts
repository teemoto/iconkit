import { describe, expect, it } from 'vitest';
import { renderSvgBackground } from '../../src/index.js';

describe('renderSvgBackground', () => {
  it('emits no canvas markup for a transparent background', () => {
    expect(renderSvgBackground({ type: 'transparent' })).toMatchObject({
      valid: true,
      value: { defs: '', content: '' },
    });
  });

  it('renders a solid canvas rectangle', () => {
    expect(
      renderSvgBackground({ type: 'solid', color: '#2563EB' }).value,
    ).toEqual({
      defs: '',
      content: '<rect width="1" height="1" fill="#2563EB"/>',
    });
  });

  it('uses clockwise-from-up coordinates for a two-stop linear gradient', () => {
    expect(
      renderSvgBackground({
        type: 'linear-gradient',
        from: '#000000',
        to: '#FFFFFF',
        angle: 0,
      }).value,
    ).toEqual({
      defs: '<linearGradient id="iconkit-background" x1="0.5" y1="1" x2="0.5" y2="0"><stop offset="0" stop-color="#000000"/><stop offset="1" stop-color="#FFFFFF"/></linearGradient>',
      content: '<rect width="1" height="1" fill="url(#iconkit-background)"/>',
    });
  });

  it('covers diagonal gradients from edge to edge', () => {
    expect(
      renderSvgBackground({
        type: 'linear-gradient',
        from: '#000000',
        to: '#FFFFFF',
        angle: 45,
      }).value?.defs,
    ).toContain('x1="0" y1="1" x2="1" y2="0"');
  });

  it.each([
    { type: 'solid', color: '#fff' },
    { type: 'linear-gradient', from: '#000000', to: '#FFFFFF', angle: 360 },
  ] as const)('rejects unapproved color and gradient values', (background) => {
    expect(renderSvgBackground(background).diagnostics[0]?.code).toBe(
      'CANVAS_INVALID_STYLE',
    );
  });
});
