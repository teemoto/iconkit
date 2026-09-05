import type { Diagnostic, ValidationResult } from './index.js';
import { inspectSvg } from './svg.js';

const CATALOG_ID = /^lucide:[a-z0-9]+(?:-[a-z0-9]+)*$/;

export interface CatalogIconInput {
  readonly catalog: 'lucide';
  readonly catalogVersion: string;
  readonly id: string;
  readonly title: string;
  readonly tags: readonly string[];
  readonly license: string;
  readonly sourceUrl: string;
  readonly svg: string;
}

export interface CatalogIcon extends Omit<CatalogIconInput, 'tags' | 'title'> {
  readonly title: string;
  readonly tags: readonly string[];
}

function error(message: string, suggestion: string): ValidationResult<never> {
  const diagnostic: Diagnostic = {
    severity: 'error',
    code: 'CATALOG_INVALID_ICON',
    message,
    suggestion,
  };
  return { valid: false, diagnostics: [diagnostic] };
}

function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

function normalizeTags(tags: readonly string[]): readonly string[] {
  return [
    ...new Set(
      tags.map((tag) => normalizeText(tag).toLowerCase()).filter(Boolean),
    ),
  ].sort();
}

function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Normalizes a pinned catalog record and subjects its SVG to the same safety
 * checks as an uploaded source. Catalog data is static, but it is never trusted
 * as an exception to the source-ingestion policy.
 */
export function normalizeCatalogIcon(
  input: CatalogIconInput,
): ValidationResult<CatalogIcon> {
  const catalogVersion = normalizeText(input.catalogVersion);
  const title = normalizeText(input.title);
  const tags = normalizeTags(input.tags);
  const license = normalizeText(input.license);
  const sourceUrl = input.sourceUrl.trim();

  if (!CATALOG_ID.test(input.id)) {
    return error(
      'A catalog icon must use a stable lucide:kebab-case ID.',
      'Use the pinned upstream identifier, such as lucide:camera.',
    );
  }
  if (
    !catalogVersion ||
    !title ||
    tags.length === 0 ||
    !license ||
    !isHttpsUrl(sourceUrl)
  ) {
    return error(
      'A catalog icon is missing required pinned metadata.',
      'Provide its version, title, tags, license identifier, and HTTPS source URL.',
    );
  }

  const inspectedSvg = inspectSvg(input.svg);
  if (!inspectedSvg.valid || !inspectedSvg.value) {
    return { valid: false, diagnostics: inspectedSvg.diagnostics };
  }
  if (!/\bcurrentColor\b/.test(input.svg)) {
    return error(
      'A catalog icon must use the currentColor paint model.',
      'Normalize the icon to the approved monochrome currentColor SVG form.',
    );
  }

  return {
    valid: true,
    value: {
      catalog: 'lucide',
      catalogVersion,
      id: input.id,
      title,
      tags,
      license,
      sourceUrl,
      svg: input.svg,
    },
    diagnostics: [],
  };
}
