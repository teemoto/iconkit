import { copyFile, mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const destination = new URL('../dist/wasm/', import.meta.url);
await mkdir(destination, { recursive: true });
await copyFile(
  require.resolve('@resvg/resvg-wasm/index_bg.wasm'),
  new URL('resvg.wasm', destination),
);
await copyFile(
  require.resolve('@jsquash/png/codec/pkg/squoosh_png_bg.wasm'),
  new URL('png.wasm', destination),
);
