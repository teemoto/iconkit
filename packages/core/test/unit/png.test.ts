import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { inspectPng } from '../../src/index.js';

function fixture(name: string): Uint8Array {
  return Buffer.from(
    readFileSync(`../../fixtures/png/${name}`, 'utf8').trim(),
    'base64',
  );
}

describe('inspectPng', () => {
  it('reads transparent PNG metadata', () => {
    const result = inspectPng(fixture('transparent-1x1.png.base64'));
    expect(result.valid).toBe(true);
    expect(result.value).toMatchObject({ width: 1, height: 1, hasAlpha: true });
  });

  it('rejects corrupt PNG bytes', () => {
    expect(inspectPng(fixture('corrupt.png.base64')).diagnostics[0]?.code).toBe(
      'PNG_INVALID',
    );
  });
});
