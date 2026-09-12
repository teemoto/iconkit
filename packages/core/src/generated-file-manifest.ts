import type { AssetFormat, GeneratedFile, ValidationResult } from './index.js';
import { planOutputWrite } from './output-plan.js';

export interface GeneratedFileManifestEntry {
  readonly path: string;
  readonly format: AssetFormat;
  readonly dimensions: readonly {
    readonly width: number;
    readonly height: number;
  }[];
  readonly sha256: string;
  readonly presetId?: string;
  readonly presetVersion?: number;
}

export interface GeneratedFileManifest {
  readonly version: 1;
  readonly files: readonly GeneratedFileManifestEntry[];
}

/** Produces a path-sorted, reproducible manifest without host-specific metadata. */
export function createGeneratedFileManifest(
  files: readonly GeneratedFile[],
): ValidationResult<GeneratedFileManifest> {
  const plan = planOutputWrite(files);
  if (!plan.valid || !plan.value) {
    return { valid: false, diagnostics: plan.diagnostics };
  }

  return {
    valid: true,
    value: {
      version: 1,
      files: [...plan.value.files]
        .sort((left, right) => left.path.localeCompare(right.path, 'en-US'))
        .map(
          ({ path, format, dimensions, sha256, presetId, presetVersion }) => ({
            path,
            format,
            dimensions,
            sha256,
            ...(presetId ? { presetId } : {}),
            ...(presetVersion === undefined ? {} : { presetVersion }),
          }),
        ),
    },
    diagnostics: [],
  };
}

/** Serializes a canonical manifest with a trailing newline for friendly diffs. */
export function serializeGeneratedFileManifest(
  manifest: GeneratedFileManifest,
): Uint8Array {
  return new TextEncoder().encode(`${JSON.stringify(manifest, null, 2)}\n`);
}
