import type { Diagnostic, IconKitConfig, ValidationResult } from './index.js';

export const PRESET_IDS = ['web-favicon', 'pwa', 'chrome-extension'] as const;

function hasControlCharacter(value: string): boolean {
  return Array.from(value).some((character) => character.charCodeAt(0) < 32);
}

/** Validates unknown JSON at the adapter boundary; never coerces input values. */
export function validateConfig(
  input: unknown,
): ValidationResult<IconKitConfig> {
  const diagnostics: Diagnostic[] = [];
  const fail = (path: string[], message: string) =>
    diagnostics.push({
      severity: 'error',
      code: 'CONFIG_INVALID',
      path,
      message,
      suggestion: 'Use the version-1 config reference and correct this field.',
    });
  const object = (
    value: unknown,
    path: string[],
    allowed: string[],
  ): Record<string, unknown> => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      fail(path, 'Expected an object.');
      return {};
    }
    const result = value as Record<string, unknown>;
    for (const key of Object.keys(result))
      if (!allowed.includes(key)) fail([...path, key], 'Unknown property.');
    return result;
  };
  const text = (value: unknown, path: string[]) => {
    if (typeof value !== 'string' || !value.trim())
      fail(path, 'Expected a non-empty string.');
  };
  const color = (value: unknown, path: string[]) => {
    if (typeof value !== 'string' || !/^#[a-f\d]{6}$/i.test(value))
      fail(path, 'Expected an opaque #RRGGBB color.');
  };
  const range = (value: unknown, path: string[], max: number) => {
    if (
      typeof value !== 'number' ||
      !Number.isFinite(value) ||
      value < 0 ||
      value > max
    )
      fail(path, `Expected a number from 0 to ${max}.`);
  };
  const config = object(
    input,
    [],
    ['$schema', 'version', 'source', 'canvas', 'targets', 'vectorOutput'],
  );
  if (config.version !== 1)
    fail(['version'], 'Only config version 1 is supported.');
  if (
    config.$schema !== undefined &&
    config.$schema !== 'https://iconkit.dev/schemas/iconkit.config.schema.json'
  )
    fail(['$schema'], 'Unrecognized schema URL.');
  const sourceValue = config.source as Record<string, unknown> | undefined;
  const catalog = sourceValue?.kind === 'catalog-icon';
  const source = object(
    config.source,
    ['source'],
    catalog
      ? ['kind', 'catalog', 'catalogVersion', 'id']
      : ['kind', 'path', 'format', 'sha256'],
  );
  if (catalog) {
    if (source.catalog !== 'lucide')
      fail(['source', 'catalog'], 'Only the Lucide catalog is supported.');
    text(source.catalogVersion, ['source', 'catalogVersion']);
    if (
      typeof source.id !== 'string' ||
      !/^lucide:[a-z0-9]+(?:-[a-z0-9]+)*$/.test(source.id)
    )
      fail(['source', 'id'], 'Expected a lucide:icon-name identifier.');
  } else {
    if (source.kind !== 'file')
      fail(['source', 'kind'], 'Expected file or catalog-icon.');
    text(source.path, ['source', 'path']);
    if (
      typeof source.path === 'string' &&
      (/^[a-z]:|^[/\\]/i.test(source.path) ||
        source.path.includes('\\') ||
        source.path
          .split('/')
          .some((part) => !part || part === '..' || part === '.') ||
        hasControlCharacter(source.path))
    )
      fail(
        ['source', 'path'],
        'Use a relative path without parent traversal or backslashes.',
      );
    if (source.format !== 'svg' && source.format !== 'png')
      fail(['source', 'format'], 'Expected svg or png.');
    if (
      source.sha256 !== undefined &&
      (typeof source.sha256 !== 'string' ||
        !/^[a-f\d]{64}$/i.test(source.sha256))
    )
      fail(['source', 'sha256'], 'Expected a SHA-256 hex digest.');
  }
  const canvas = object(
    config.canvas,
    ['canvas'],
    ['padding', 'background', 'shape', 'iconColor'],
  );
  range(canvas.padding, ['canvas', 'padding'], 0.4);
  if (canvas.iconColor !== undefined)
    color(canvas.iconColor, ['canvas', 'iconColor']);
  const bgType = (canvas.background as Record<string, unknown> | undefined)
    ?.type;
  const bg = object(
    canvas.background,
    ['canvas', 'background'],
    bgType === 'solid'
      ? ['type', 'color']
      : bgType === 'linear-gradient'
        ? ['type', 'from', 'to', 'angle']
        : ['type'],
  );
  if (bg.type === 'solid') color(bg.color, ['canvas', 'background', 'color']);
  else if (bg.type === 'linear-gradient') {
    color(bg.from, ['canvas', 'background', 'from']);
    color(bg.to, ['canvas', 'background', 'to']);
    range(bg.angle, ['canvas', 'background', 'angle'], 359);
    if (!Number.isInteger(bg.angle))
      fail(['canvas', 'background', 'angle'], 'Expected an integer angle.');
  } else if (bg.type !== 'transparent')
    fail(['canvas', 'background', 'type'], 'Unknown background type.');
  const shapeType = (canvas.shape as Record<string, unknown> | undefined)?.type;
  const shape = object(
    canvas.shape,
    ['canvas', 'shape'],
    shapeType === 'rounded-square' ? ['type', 'cornerRadius'] : ['type'],
  );
  if (shape.type === 'rounded-square')
    range(shape.cornerRadius, ['canvas', 'shape', 'cornerRadius'], 0.5);
  else if (shape.type !== 'square' && shape.type !== 'circle')
    fail(['canvas', 'shape', 'type'], 'Unknown shape.');
  if (
    !Array.isArray(config.targets) ||
    !config.targets.length ||
    config.targets.some((id) => !PRESET_IDS.includes(id)) ||
    new Set(config.targets).size !== config.targets.length
  )
    fail(['targets'], 'Select one or more distinct supported presets.');
  if (
    config.vectorOutput !== undefined &&
    config.vectorOutput !== 'never' &&
    config.vectorOutput !== 'when-vector-safe'
  )
    fail(['vectorOutput'], 'Expected never or when-vector-safe.');
  if (diagnostics.length) return { valid: false, diagnostics };
  return {
    valid: true,
    value: structuredClone(input) as IconKitConfig,
    diagnostics,
  };
}
