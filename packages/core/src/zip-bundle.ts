import { zipSync } from 'fflate';
import type { Diagnostic, GeneratedFile, ValidationResult } from './index.js';
import {
  createGeneratedFileManifest,
  serializeGeneratedFileManifest,
  type GeneratedFileManifest,
} from './generated-file-manifest.js';

const MANIFEST_PATH = 'iconkit.manifest.json';
// ZIP stores local DOS date fields, so construct the earliest valid value in
// local calendar time instead of allowing a UTC timestamp to underflow west of UTC.
const ZIP_EPOCH = new Date(1980, 0, 1, 0, 0, 0);

export interface ZipBundle {
  readonly bytes: Uint8Array;
  readonly manifest: GeneratedFileManifest;
}

function error(message: string, suggestion: string): ValidationResult<never> {
  const diagnostic: Diagnostic = {
    severity: 'error',
    code: 'OUTPUT_COLLISION',
    message,
    suggestion,
  };
  return { valid: false, diagnostics: [diagnostic] };
}

/** Creates a reproducible ZIP bundle containing generated files and its manifest. */
export function createZipBundle(
  files: readonly GeneratedFile[],
): ValidationResult<ZipBundle> {
  if (files.some((file) => file.path.toLowerCase() === MANIFEST_PATH)) {
    return error(
      'A generated file conflicts with IconKit’s reserved manifest path.',
      'Choose an output path other than iconkit.manifest.json.',
    );
  }

  const manifest = createGeneratedFileManifest(files);
  if (!manifest.valid || !manifest.value) {
    return { valid: false, diagnostics: manifest.diagnostics };
  }

  const entries: Record<string, Uint8Array> = Object.create(null);
  for (const file of [...files].sort((left, right) =>
    left.path.localeCompare(right.path, 'en-US'),
  )) {
    entries[file.path] = file.bytes;
  }
  entries[MANIFEST_PATH] = serializeGeneratedFileManifest(manifest.value);

  return {
    valid: true,
    value: {
      bytes: zipSync(entries, { level: 9, mtime: ZIP_EPOCH }),
      manifest: manifest.value,
    },
    diagnostics: [],
  };
}
