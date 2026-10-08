# IconKit Diagnostics Contract

## Status

- Product: IconKit
- Decision type: Shared validation and generation diagnostics
- Status: Approved and implemented
- Date: September 3, 2026

## Model

```ts
export type DiagnosticSeverity = 'error' | 'warning' | 'info';

export interface Diagnostic {
  readonly severity: DiagnosticSeverity;
  readonly code: DiagnosticCode;
  readonly message: string;
  readonly path?: readonly (string | number)[];
  readonly suggestion?: string;
  readonly details?: Readonly<Record<string, string | number | boolean>>;
}
```

- `code` is stable and intended for automation, tests, CLI JSON output, and UI mapping.
- `message` is concise human-facing text with no adapter-specific formatting.
- `path` identifies the relevant config field or generated output as segments, for example `['canvas', 'padding']` or `['targets', 1]`.
- `suggestion` gives the user a direct next action when one exists.
- `details` contains safe structured context; it never includes source bytes, absolute paths, tokens, or stack traces.

An error blocks the relevant render or bundle. A warning permits generation but identifies a likely quality or compatibility concern. Info is non-blocking explanatory output.

## Initial Codes

| Code                         | Severity | Meaning                                                                                        |
| ---------------------------- | -------- | ---------------------------------------------------------------------------------------------- |
| `CONFIG_INVALID`             | error    | The config does not satisfy the schema or semantic contract.                                   |
| `CONFIG_VERSION_UNSUPPORTED` | error    | The config version has no supported migration.                                                 |
| `CONFIG_TARGET_UNKNOWN`      | error    | A requested target ID is not in the preset registry.                                           |
| `CONFIG_SOURCE_MISMATCH`     | error    | Supplied source bytes do not match the declared source format, path hash, or catalog metadata. |
| `INPUT_UNSUPPORTED_FORMAT`   | error    | Source is neither an accepted PNG nor SVG.                                                     |
| `INPUT_FILE_TOO_LARGE`       | error    | Encoded source exceeds the approved limit.                                                     |
| `INPUT_RASTER_TOO_LARGE`     | error    | Decoded dimensions or pixels exceed the approved limit.                                        |
| `PNG_INVALID`                | error    | PNG signature or decode failed.                                                                |
| `SVG_INVALID_XML`            | error    | SVG is not well-formed XML.                                                                    |
| `SVG_UNBOUNDED_VIEWPORT`     | error    | SVG lacks finite intrinsic dimensions or viewBox.                                              |
| `SVG_UNSUPPORTED_FEATURE`    | error    | SVG uses a rejected or unallowlisted feature.                                                  |
| `SVG_EXTERNAL_RESOURCE`      | error    | SVG references a resource outside the parsed document.                                         |
| `VECTOR_EXPORT_UNAVAILABLE`  | info     | Composition generated required rasters but cannot safely emit SVG.                             |
| `PRESET_OUTPUT_COLLISION`    | error    | Two requested outputs resolve to the same relative path.                                       |
| `PRESET_RENDER_FAILED`       | error    | A specific preset output could not render.                                                     |
| `PRESET_MASKABLE_SAFE_AREA`  | warning  | Important mark bounds extend outside the maskable safe area.                                   |
| `ICO_ENCODE_FAILED`          | error    | ICO assembly failed after raster rendering.                                                    |
| `BUNDLE_ZIP_FAILED`          | error    | Deterministic ZIP creation failed.                                                             |
| `OUTPUT_PATH_INVALID`        | error    | Adapter supplied an unsafe relative output path.                                               |

## Ordering and Determinism

Core returns diagnostics in deterministic order: config validation order first, source-ingestion order second, then requested preset order and output-path order. Adapters may group or localize messages but must preserve `code`, `severity`, and `path`.

## Adapter Responsibilities

- CLI human output shows errors and warnings in order; `--json` serializes diagnostics unchanged.
- CLI exits non-zero when any error diagnostic exists.
- Web maps `path` to form controls and announces messages accessibly; it does not invent a different validation rule.
- Internal stack traces may be logged by a host application but never appear in this public diagnostic model.

## Acceptance Criteria

This contract is approved when the project owner confirms:

1. `error`, `warning`, and `info` have the stated blocking semantics.
2. The listed codes cover the initial config, source, SVG, preset, and bundle boundaries.
3. Structured paths and safe details are sufficient for both CLI JSON and web field errors.
4. Diagnostics remain deterministic and adapters do not alter core validation meaning.

On approval, this contract drives core types, validation tests, CLI exit behavior, and web error presentation.
