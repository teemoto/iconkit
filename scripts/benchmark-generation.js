import { readFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import { generateBundle } from '../packages/core/dist/index.js';
import { initializeNode } from '../packages/core/node.js';

await initializeNode();
const bytes = new Uint8Array(
  await readFile(new URL('../fixtures/svg/simple.svg', import.meta.url)),
);
const config = {
  version: 1,
  source: { kind: 'file', path: 'simple.svg', format: 'svg' },
  canvas: {
    padding: 0.12,
    background: { type: 'transparent' },
    shape: { type: 'square' },
  },
  targets: ['web-favicon', 'pwa', 'ios-app-icon', 'chrome-extension'],
};

await generateBundle({
  config,
  source: { format: 'svg', bytes },
  includeZip: true,
});
const samples = [];
for (let index = 0; index < 5; index += 1) {
  const start = performance.now();
  const result = await generateBundle({
    config,
    source: { format: 'svg', bytes },
    includeZip: true,
  });
  if (!result.valid) throw new Error('Benchmark generation failed.');
  samples.push(performance.now() - start);
}
samples.sort((left, right) => left - right);
console.log(
  JSON.stringify({
    scenario: 'all-presets-svg-with-zip',
    runs: samples.length,
    medianMs: Math.round(samples[Math.floor(samples.length / 2)] * 10) / 10,
    minMs: Math.round(samples[0] * 10) / 10,
    maxMs: Math.round(samples.at(-1) * 10) / 10,
  }),
);
