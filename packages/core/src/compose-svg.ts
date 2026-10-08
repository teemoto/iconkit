import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
import type { Canvas, Diagnostic, ValidationResult } from './index.js';
import { renderSvgBackground } from './background.js';
import { computeContainFitLayout } from './layout.js';
import { renderSvgCanvasClip } from './shape.js';
import { inspectSvg, type SvgAsset } from './svg.js';

const COLOR = /^#[0-9a-f]{6}$/i;
const SOURCE_ID_PREFIX = 'iconkit-source-';

export interface SvgComposition {
  readonly svg: string;
  readonly layout: NonNullable<
    ReturnType<typeof computeContainFitLayout>['value']
  >;
}

function error(message: string, suggestion: string): ValidationResult<never> {
  const diagnostic: Diagnostic = {
    severity: 'error',
    code: 'CANVAS_INVALID_STYLE',
    message,
    suggestion,
  };
  return { valid: false, diagnostics: [diagnostic] };
}

function formatNumber(value: number): string {
  return String(Math.round(value * 1_000_000) / 1_000_000);
}

function prefixSourceIds(svg: string): string {
  const document = new DOMParser().parseFromString(svg, 'image/svg+xml');
  const root = document.documentElement;
  if (!root) return '';
  const elements = [root, ...Array.from(root.getElementsByTagName('*'))];
  const ids = new Map<string, string>();

  for (const element of elements) {
    const id = element.getAttribute('id');
    if (id) ids.set(id, `${SOURCE_ID_PREFIX}${id}`);
  }
  for (const element of elements) {
    for (const attribute of Array.from(element.attributes)) {
      if (attribute.name === 'id') {
        const replacement = ids.get(attribute.value);
        if (replacement) element.setAttribute('id', replacement);
        continue;
      }

      let value = attribute.value.replace(
        /url\(\s*['"]?#([A-Za-z_][\w:.-]*)['"]?\s*\)/g,
        (match, id: string) => {
          const replacement = ids.get(id);
          return replacement ? `url(#${replacement})` : match;
        },
      );
      if (attribute.name === 'href' || attribute.name === 'xlink:href') {
        const replacement = ids.get(value.slice(1));
        if (replacement && value.startsWith('#')) value = `#${replacement}`;
      }
      if (value !== attribute.value)
        element.setAttribute(attribute.name, value);
    }
  }

  const serializer = new XMLSerializer();
  // Preserve inherited presentation attributes on the source root.
  const group = document.createElement('g');
  for (const attribute of Array.from(root.attributes)) {
    if (
      ![
        'viewBox',
        'width',
        'height',
        'x',
        'y',
        'xmlns',
        'xmlns:xlink',
        'preserveAspectRatio',
      ].includes(attribute.name)
    )
      group.setAttribute(attribute.name, attribute.value);
  }
  for (const node of Array.from(root.childNodes))
    group.appendChild(node.cloneNode(true));
  return serializer.serializeToString(group);
}

/**
 * Composes an accepted SVG source into IconKit's canonical unit square. The
 * output remains vector-safe because every source and canvas operation is SVG.
 */
export function composeSvg(
  source: SvgAsset,
  canvas: Canvas,
): ValidationResult<SvgComposition> {
  const inspected = inspectSvg(source.svg);
  if (!inspected.valid || !inspected.value) {
    return { valid: false, diagnostics: inspected.diagnostics };
  }

  const layout = computeContainFitLayout(inspected.value, canvas.padding);
  if (!layout.valid || !layout.value) {
    return { valid: false, diagnostics: layout.diagnostics };
  }
  const background = renderSvgBackground(canvas.background);
  if (!background.valid || !background.value) {
    return { valid: false, diagnostics: background.diagnostics };
  }
  const clip = renderSvgCanvasClip(canvas.shape);
  if (!clip.valid || !clip.value) {
    return { valid: false, diagnostics: clip.diagnostics };
  }
  if (canvas.iconColor && !COLOR.test(canvas.iconColor)) {
    return error(
      'Icon color overrides must be opaque #RRGGBB values.',
      'Use a six-digit hexadecimal color, such as #2563EB.',
    );
  }

  const artwork = layout.value.artwork;
  const viewBox = inspected.value.viewBox ?? [
    0,
    0,
    inspected.value.width,
    inspected.value.height,
  ];
  const scale = artwork.width / viewBox[2];
  const translateX = artwork.x - viewBox[0] * scale;
  const translateY = artwork.y - viewBox[1] * scale;
  const sourceMarkup = prefixSourceIds(source.svg);
  const color = canvas.iconColor ? ` color="${canvas.iconColor}"` : '';
  const defs = `${background.value.defs}${clip.value.defs}`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1">${defs ? `<defs>${defs}</defs>` : ''}${clip.value.contentOpen}${background.value.content}<g transform="translate(${formatNumber(translateX)} ${formatNumber(translateY)}) scale(${formatNumber(scale)})"${color}>${sourceMarkup}</g>${clip.value.contentClose}</svg>`;

  return { valid: true, value: { svg, layout: layout.value }, diagnostics: [] };
}
