/** Public, platform-neutral types for IconKit's generation engine. */

export type AssetFormat = 'ico' | 'json' | 'png' | 'svg';

export interface Dimension {
  readonly width: number;
  readonly height: number;
}

export interface GeneratedFile {
  readonly path: string;
  readonly format: AssetFormat;
  readonly dimensions: readonly Dimension[];
  readonly bytes: Uint8Array;
  readonly sha256: string;
  readonly presetId?: string;
  readonly presetVersion?: number;
}

export type DiagnosticSeverity = 'error' | 'info' | 'warning';

export interface Diagnostic {
  readonly severity: DiagnosticSeverity;
  readonly code: string;
  readonly message: string;
  readonly path?: readonly (string | number)[];
  readonly suggestion?: string;
  readonly details?: Readonly<Record<string, string | number | boolean>>;
}

export interface ValidationResult<T> {
  readonly value?: T;
  readonly diagnostics: readonly Diagnostic[];
  readonly valid: boolean;
}
