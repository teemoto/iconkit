import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { inspectSvg } from '../../src/index.js';

function fixture(name: string): string {
  return readFileSync(`../../fixtures/svg/${name}`, 'utf8');
}

describe('inspectSvg', () => {
  it('accepts static SVG and preserves the original source', () => {
    const svg = fixture('simple.svg');
    expect(inspectSvg(svg)).toMatchObject({
      valid: true,
      value: { svg, width: 100, height: 100, viewBox: [0, 0, 100, 100] },
    });
  });

  it.each([
    ['malformed.svg', 'SVG_INVALID_XML'],
    ['external-resource.svg', 'SVG_EXTERNAL_RESOURCE'],
    ['script.svg', 'SVG_UNSUPPORTED_FEATURE'],
  ])('rejects %s with %s', (name, code) => {
    expect(inspectSvg(fixture(name)).diagnostics[0]?.code).toBe(code);
  });

  it.each([
    ['wide.svg', 200, 100],
    ['tall.svg', 100, 200],
  ])('retains bounded non-square dimensions from %s', (name, width, height) => {
    expect(inspectSvg(fixture(name)).value).toMatchObject({ width, height });
  });

  it.each([
    [
      '<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0"/></svg>',
      'SVG_UNBOUNDED_VIEWPORT',
    ],
    [
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><filter id="blur"/></svg>',
      'SVG_UNSUPPORTED_FEATURE',
    ],
    [
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><path clip-path="url(#missing)"/></svg>',
      'SVG_EXTERNAL_RESOURCE',
    ],
  ])('rejects unsafe SVG input with %s', (svg, code) => {
    expect(inspectSvg(svg).diagnostics[0]?.code).toBe(code);
  });
});
