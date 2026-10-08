import type { Diagnostic, GeneratedFile, ValidationResult } from './index.js';

export interface OutputWriteOptions {
  /** Relative paths already present in the host-selected output directory. */
  readonly existingPaths?: readonly string[];
  /** Existing generated paths may be replaced only when this is explicitly true. */
  readonly overwrite?: boolean;
}

export interface OutputWritePlan {
  readonly files: readonly GeneratedFile[];
  readonly overwrite: boolean;
}

function error(
  code: string,
  message: string,
  suggestion: string,
  details?: Diagnostic['details'],
): ValidationResult<never> {
  const diagnostic: Diagnostic = {
    severity: 'error',
    code,
    message,
    suggestion,
    ...(details ? { details } : {}),
  };
  return { valid: false, diagnostics: [diagnostic] };
}

function isSafeRelativePath(path: string): boolean {
  return (
    path.length > 0 &&
    !path.startsWith('/') &&
    !path.includes('\\') &&
    !path.includes(':') &&
    !Array.from(path).some((character) => character.charCodeAt(0) < 32) &&
    !path
      .split('/')
      .some((segment) => segment === '' || segment === '.' || segment === '..')
  );
}

/**
 * Validates a proposed host write without performing filesystem I/O. This keeps
 * collision and overwrite behavior identical for CLI and browser adapters.
 */
export function planOutputWrite(
  files: readonly GeneratedFile[],
  options: OutputWriteOptions = {},
): ValidationResult<OutputWritePlan> {
  const seen = new Set<string>();
  const seenFolded = new Set<string>();
  for (const file of files) {
    if (!isSafeRelativePath(file.path)) {
      return error(
        'OUTPUT_PATH_INVALID',
        'Generated output paths must be safe relative paths.',
        'Use a path without leading slashes, backslashes, or parent-directory segments.',
        { path: file.path },
      );
    }
    const folded = file.path.toLocaleLowerCase('en-US');
    if (seen.has(file.path) || seenFolded.has(folded)) {
      return error(
        'OUTPUT_COLLISION',
        'Generated files contain colliding output paths.',
        'Choose presets or filenames that produce unique paths.',
        { path: file.path },
      );
    }
    seen.add(file.path);
    seenFolded.add(folded);
  }

  const existing = new Set(
    (options.existingPaths ?? []).map((path) =>
      path.toLocaleLowerCase('en-US'),
    ),
  );
  const conflict = files.find((file) =>
    existing.has(file.path.toLocaleLowerCase('en-US')),
  );
  if (conflict && !options.overwrite) {
    return error(
      'OUTPUT_EXISTS',
      'An output file already exists in the selected destination.',
      'Choose a new directory or explicitly enable overwrite.',
      { path: conflict.path },
    );
  }

  return {
    valid: true,
    value: { files, overwrite: options.overwrite ?? false },
    diagnostics: [],
  };
}
