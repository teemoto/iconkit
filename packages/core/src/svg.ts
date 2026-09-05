import { DOMParser, type Element } from '@xmldom/xmldom';
import type { Diagnostic, ValidationResult } from './index.js';

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_DIMENSION = 4096;
const MAX_PIXELS = 16_777_216;

const ALLOWED_ELEMENTS = new Set([
  'svg',
  'g',
  'defs',
  'path',
  'rect',
  'circle',
  'ellipse',
  'line',
  'polyline',
  'polygon',
  'clipPath',
  'mask',
  'linearGradient',
  'radialGradient',
  'stop',
  'title',
  'desc',
]);

const ALLOWED_ATTRIBUTES = new Set([
  'id',
  'viewBox',
  'width',
  'height',
  'x',
  'y',
  'x1',
  'x2',
  'y1',
  'y2',
  'cx',
  'cy',
  'r',
  'rx',
  'ry',
  'd',
  'points',
  'transform',
  'fill',
  'color',
  'fill-opacity',
  'fill-rule',
  'stroke',
  'stroke-opacity',
  'stroke-width',
  'stroke-linecap',
  'stroke-linejoin',
  'stroke-miterlimit',
  'stroke-dasharray',
  'stroke-dashoffset',
  'opacity',
  'clip-path',
  'clip-rule',
  'mask',
  'gradientUnits',
  'gradientTransform',
  'offset',
  'stop-color',
  'stop-opacity',
  'preserveAspectRatio',
  'xmlns',
  'xmlns:xlink',
  'href',
  'xlink:href',
]);

export interface SvgMetadata {
  readonly width: number;
  readonly height: number;
  readonly viewBox?: readonly [number, number, number, number];
}

export interface SvgAsset extends SvgMetadata {
  readonly svg: string;
}

function error(
  code: string,
  message: string,
  suggestion: string,
): ValidationResult<never> {
  const diagnostic: Diagnostic = {
    severity: 'error',
    code,
    message,
    suggestion,
  };
  return { valid: false, diagnostics: [diagnostic] };
}

function parseLength(value: string | null): number | undefined {
  if (!value || !/^(?:\d+(?:\.\d+)?|\.\d+)$/.test(value.trim())) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function parseViewBox(
  value: string | null,
): readonly [number, number, number, number] | undefined {
  if (!value) return undefined;

  const parts = value
    .trim()
    .split(/[\s,]+/)
    .map(Number);
  if (
    parts.length !== 4 ||
    parts.some((part) => !Number.isFinite(part)) ||
    parts[2]! <= 0 ||
    parts[3]! <= 0
  ) {
    return undefined;
  }

  return [parts[0]!, parts[1]!, parts[2]!, parts[3]!];
}

function localReference(value: string): string | undefined {
  const direct = value.trim().match(/^#([A-Za-z_][\w:.-]*)$/);
  if (direct) return direct[1];

  const url = value.match(/^url\(\s*['"]?#([A-Za-z_][\w:.-]*)['"]?\s*\)$/);
  return url?.[1];
}

function hasExternalReference(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed === '' || localReference(trimmed)) return false;

  return (
    /(?:^|\s)(?:https?:|data:|file:|ftp:|\/\/)/i.test(trimmed) ||
    /url\(\s*['"]?(?!#)/i.test(trimmed)
  );
}

/**
 * Validates a static SVG safe subset and returns the original source unchanged.
 * Rendering code receives only SVGs that have passed this boundary.
 */
export function inspectSvg(svg: string): ValidationResult<SvgAsset> {
  if (new TextEncoder().encode(svg).byteLength > MAX_BYTES) {
    return error(
      'INPUT_FILE_TOO_LARGE',
      'The SVG exceeds IconKit’s 5 MiB source limit.',
      'Export a smaller source file.',
    );
  }

  const parseErrors: string[] = [];
  let document;
  try {
    document = new DOMParser({
      onError: (_level, message) => parseErrors.push(message),
    }).parseFromString(svg, 'image/svg+xml');
  } catch {
    return error(
      'SVG_INVALID_XML',
      'The SVG is not well-formed XML.',
      'Re-export the SVG from the source tool.',
    );
  }

  if (
    parseErrors.length > 0 ||
    document.documentElement?.nodeName === 'parsererror'
  ) {
    return error(
      'SVG_INVALID_XML',
      'The SVG is not well-formed XML.',
      'Re-export the SVG from the source tool.',
    );
  }

  const root = document.documentElement;
  if (!root || root.tagName !== 'svg') {
    return error(
      'SVG_UNSUPPORTED_FEATURE',
      'The source must contain an SVG root element.',
      'Export the artwork as a standalone SVG.',
    );
  }

  const ids = new Set<string>();
  const references: string[] = [];
  const nodes = [root, ...Array.from(root.getElementsByTagName('*'))];

  for (const node of nodes) {
    const element: Element = node;
    for (const attribute of Array.from(element.attributes)) {
      if (
        !attribute.name.startsWith('xmlns') &&
        hasExternalReference(attribute.value)
      ) {
        return error(
          'SVG_EXTERNAL_RESOURCE',
          'The SVG references a resource outside the document.',
          'Embed or convert the artwork to standalone paths, then re-export.',
        );
      }
    }

    const name = element.tagName;
    if (!ALLOWED_ELEMENTS.has(name)) {
      return error(
        'SVG_UNSUPPORTED_FEATURE',
        `The SVG uses unsupported <${name}> content.`,
        'Flatten or outline the unsupported feature, then re-export.',
      );
    }

    for (const attribute of Array.from(element.attributes)) {
      const { name: attributeName, value } = attribute;
      if (
        attributeName.startsWith('on') ||
        attributeName === 'style' ||
        attributeName === 'filter' ||
        !ALLOWED_ATTRIBUTES.has(attributeName)
      ) {
        return error(
          'SVG_UNSUPPORTED_FEATURE',
          `The SVG uses unsupported attribute ${attributeName}.`,
          'Flatten or outline the unsupported feature, then re-export.',
        );
      }
      if (attributeName === 'id') ids.add(value);
      if (
        attributeName === 'href' ||
        attributeName === 'xlink:href' ||
        value.includes('url(')
      ) {
        const reference = localReference(value);
        if (reference) references.push(reference);
      }
    }
  }

  if (references.some((reference) => !ids.has(reference))) {
    return error(
      'SVG_EXTERNAL_RESOURCE',
      'The SVG references a resource outside the document.',
      'Embed or convert the artwork to standalone paths, then re-export.',
    );
  }

  const viewBox = parseViewBox(root.getAttribute('viewBox'));
  const width = viewBox?.[2] ?? parseLength(root.getAttribute('width'));
  const height = viewBox?.[3] ?? parseLength(root.getAttribute('height'));
  if (!width || !height) {
    return error(
      'SVG_UNBOUNDED_VIEWPORT',
      'The SVG has no finite width, height, or viewBox.',
      'Export with an explicit viewBox or numeric width and height.',
    );
  }
  if (
    width > MAX_DIMENSION ||
    height > MAX_DIMENSION ||
    width * height > MAX_PIXELS
  ) {
    return error(
      'INPUT_RASTER_TOO_LARGE',
      'The SVG viewport exceeds IconKit’s decode limit.',
      'Resize or simplify the source before upload.',
    );
  }

  return {
    valid: true,
    value: { svg, width, height, ...(viewBox ? { viewBox } : {}) },
    diagnostics: [],
  };
}
