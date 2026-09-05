import { describe, expect, it } from 'vitest';
import { composeSvg, inspectSvg } from '../../src/index.js';

const source = {
  svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100"><defs><linearGradient id="tone"><stop offset="0" stop-color="currentColor"/></linearGradient></defs><path fill="url(#tone)" d="M0 0h200v100H0z"/></svg>',
  width: 200,
  height: 100,
  viewBox: [0, 0, 200, 100] as const,
};

describe('composeSvg', () => {
  it('composes source, background, clip, and layout into a valid SVG', () => {
    const result = composeSvg(source, {
      padding: 0.12,
      background: { type: 'solid', color: '#2563EB' },
      shape: { type: 'circle' },
      iconColor: '#FFFFFF',
    });

    expect(result).toMatchObject({
      valid: true,
      value: { layout: { artwork: { x: 0.12, y: 0.31 } } },
    });
    expect(result.value?.svg).toContain('fill="#2563EB"');
    expect(result.value?.svg).toContain(
      'clip-path="url(#iconkit-canvas-clip)"',
    );
    expect(result.value?.svg).toContain(
      'transform="translate(0.12 0.31) scale(0.0038)" color="#FFFFFF"',
    );
    expect(result.value?.svg).toContain('id="iconkit-source-tone"');
    expect(result.value?.svg).toContain('fill="url(#iconkit-source-tone)"');
    expect(inspectSvg(result.value!.svg).valid).toBe(true);
  });

  it('retains a transparent square canvas without unnecessary definitions', () => {
    const result = composeSvg(
      {
        svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><path fill="currentColor" d="M0 0h1v1H0z"/></svg>',
        width: 1,
        height: 1,
        viewBox: [0, 0, 1, 1],
      },
      {
        padding: 0,
        background: { type: 'transparent' },
        shape: { type: 'square' },
      },
    );
    expect(result.value?.svg).not.toContain('<defs>');
  });

  it('rejects an invalid icon color', () => {
    const result = composeSvg(source, {
      padding: 0,
      background: { type: 'transparent' },
      shape: { type: 'square' },
      iconColor: '#fff',
    });
    expect(result.diagnostics[0]?.code).toBe('CANVAS_INVALID_STYLE');
  });
});
