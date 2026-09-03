# IconKit Core API Contract

## Status

- Product: IconKit
- Decision type: Public shared-engine API
- Status: Proposed — requires approval before implementation
- Date: September 3, 2026

## Purpose

`@icon-kit/core` is the deterministic, platform-neutral generation engine. It owns validation, source ingestion, composition, preset resolution, generated-file metadata, and ZIP bytes. It does not read arbitrary filesystem paths, access the network, render UI, write files, or initiate downloads.

The CLI and web application provide the adapters around this API:

- The CLI reads source files, calls core, and writes returned files to a user-selected directory.
- The web app obtains upload/catalog bytes, calls core, and offers returned files or ZIP bytes for download.

## Public API

```ts
export function validateConfig(input: unknown): ValidationResult<IconKitConfig>;

export async function renderAsset(
  request: RenderAssetRequest,
): Promise<RenderResult>;

export async function generatePreset(
  request: GeneratePresetRequest,
): Promise<GeneratedPreset>;

export async function generateBundle(
  request: GenerateBundleRequest,
): Promise<GeneratedBundle>;
```

All public functions are ESM exports. Inputs and results are plain data plus `Uint8Array`; they are serializable at the adapter boundary except for byte payloads. No public API mutates its input.

## Shared Types

```ts
export interface ValidationResult<T> {
  readonly value?: T;
  readonly diagnostics: readonly Diagnostic[];
  readonly valid: boolean;
}

export interface SourceAsset {
  readonly format: 'png' | 'svg';
  readonly bytes: Uint8Array;
  readonly name?: string;
}

export interface CatalogAsset {
  readonly catalog: 'lucide';
  readonly catalogVersion: string;
  readonly id: string;
  readonly svg: string;
}

export interface RenderAssetRequest {
  readonly config: IconKitConfig;
  readonly source: SourceAsset | CatalogAsset;
  readonly width: number;
  readonly height: number;
  readonly presetOutput?: PresetOutput;
}

export interface RenderResult {
  readonly bytes?: Uint8Array;
  readonly format: 'png' | 'svg';
  readonly width: number;
  readonly height: number;
  readonly diagnostics: readonly Diagnostic[];
}

export interface GeneratePresetRequest {
  readonly config: IconKitConfig;
  readonly source: SourceAsset | CatalogAsset;
  readonly presetId: PresetId;
}

export interface GeneratedFile {
  readonly path: string;
  readonly format: 'png' | 'ico' | 'svg' | 'json';
  readonly dimensions: readonly Dimension[];
  readonly bytes: Uint8Array;
  readonly sha256: string;
  readonly presetId?: PresetId;
  readonly presetVersion?: number;
}

export interface GeneratedPreset {
  readonly presetId: PresetId;
  readonly presetVersion: number;
  readonly files: readonly GeneratedFile[];
  readonly diagnostics: readonly Diagnostic[];
}

export interface GenerateBundleRequest {
  readonly config: IconKitConfig;
  readonly source: SourceAsset | CatalogAsset;
  readonly presetIds?: readonly PresetId[];
  readonly includeZip?: boolean;
}

export interface GeneratedBundle {
  readonly files: readonly GeneratedFile[];
  readonly manifest: GeneratedFile;
  readonly config: GeneratedFile;
  readonly zip?: GeneratedFile;
  readonly diagnostics: readonly Diagnostic[];
}
```

`PresetId`, `PresetOutput`, `Dimension`, `IconKitConfig`, and `Diagnostic` are public named types. The latter receives its detailed contract in the diagnostics task.

## Function Behavior

### `validateConfig`

- Accepts unknown JSON-compatible input.
- Validates the versioned config schema and cross-field semantic rules that JSON Schema cannot express.
- Returns a normalized `IconKitConfig` only when no error-severity diagnostic exists.
- Does not read a source path, load catalog data, or render.

### `renderAsset`

- Renders one requested PNG or vector-safe SVG at exact dimensions.
- Applies the canonical canvas rules and any preset-specific behavior, such as the PWA maskable safe area.
- Returns diagnostics instead of throwing for user-correctable input or render conditions.
- Produces normalized output bytes with no time-varying metadata.

### `generatePreset`

- Resolves one approved preset from the registry.
- Calls `renderAsset` for every declared output and assembles ICO files where required.
- Returns all file bytes and metadata without writing to disk.
- Does not silently overwrite or merge an existing bundle.

### `generateBundle`

- Generates the requested presets, defaulting to `config.targets`.
- Rejects duplicate output paths before returning any success result.
- Adds `iconkit.config.json` and `iconkit.manifest.json` to the returned files.
- When `includeZip` is true, creates a deterministic ZIP whose entry order is lexicographic and whose file timestamps are fixed.

## Error Boundary

- Public functions throw only for programmer misuse or an unrecoverable internal engine failure.
- User-controlled data produces `Diagnostic` values with stable codes, affected paths, and suggested fixes.
- A result containing error-severity diagnostics has no successful rendered byte payload for the affected unit.
- Adapters choose presentation and process exit codes; they must not reinterpret core validation rules.

## Acceptance Criteria

This API contract is approved when the project owner confirms:

1. Core is byte-oriented and has no direct filesystem, network, UI, or download responsibility.
2. `validateConfig`, `renderAsset`, `generatePreset`, and `generateBundle` are the stable public entry points.
3. File bytes plus hashes and preset-version metadata are sufficient for reproducible CLI and web output.
4. Diagnostics, rather than user-input exceptions, are the normal recoverable-error channel.

On approval, this contract drives the `@icon-kit/core` exports map, types, tests, and the CLI/web adapter boundaries.
