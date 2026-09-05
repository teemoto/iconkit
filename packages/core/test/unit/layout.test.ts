import { describe, expect, it } from 'vitest';
import { computeContainFitLayout, toPixelRect } from '../../src/index.js';

describe('computeContainFitLayout', () => {
  it('centers a wide source without stretching it', () => {
    const result = computeContainFitLayout({ width: 200, height: 100 }, 0.12);
    expect(result).toMatchObject({
      valid: true,
      value: {
        safeArea: { x: 0.12, y: 0.12, width: 0.76, height: 0.76 },
        artwork: { x: 0.12, y: 0.31, width: 0.76, height: 0.38 },
      },
    });
  });

  it('centers a tall source without stretching it', () => {
    const result = computeContainFitLayout({ width: 100, height: 200 }, 0.12);
    expect(result.value?.artwork).toEqual({
      x: 0.31,
      y: 0.12,
      width: 0.38,
      height: 0.76,
    });
  });

  it('keeps square artwork within the complete safe area', () => {
    expect(
      computeContainFitLayout({ width: 100, height: 100 }, 0).value?.artwork,
    ).toEqual({
      x: 0,
      y: 0,
      width: 1,
      height: 1,
    });
  });

  it('maps the same normalized bounds to every output size', () => {
    expect(
      toPixelRect({ x: 0.12, y: 0.31, width: 0.76, height: 0.38 }, 100),
    ).toEqual({
      x: 12,
      y: 31,
      width: 76,
      height: 38,
    });
  });

  it.each([
    [{ width: 0, height: 100 }, 0.12],
    [{ width: 100, height: 100 }, -0.01],
    [{ width: 100, height: 100 }, 0.41],
  ])('rejects invalid source geometry and padding', (source, padding) => {
    expect(computeContainFitLayout(source, padding).diagnostics[0]?.code).toBe(
      'LAYOUT_INVALID_INPUT',
    );
  });
});
