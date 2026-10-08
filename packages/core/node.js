import { readFile } from 'node:fs/promises';
import { initializePngDecoder, initializeSvgRasterizer } from './dist/index.js';
let initialization;
/** Loads packaged WASM for Node hosts. Browser hosts provide WASM URLs themselves. */
export function initializeNode() {
  initialization ??= Promise.all([
    readFile(new URL('./dist/wasm/resvg.wasm', import.meta.url)).then((bytes) =>
      initializeSvgRasterizer(Uint8Array.from(bytes).buffer),
    ),
    readFile(new URL('./dist/wasm/png.wasm', import.meta.url)).then((bytes) =>
      initializePngDecoder(Uint8Array.from(bytes).buffer),
    ),
  ]).catch((error) => {
    initialization = undefined;
    throw error;
  });
  return initialization;
}
