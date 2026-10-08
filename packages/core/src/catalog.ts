import type { Diagnostic, ValidationResult } from './index.js';
import { inspectSvg } from './svg.js';
import {
  LUCIDE_CATALOG,
  LUCIDE_CATALOG_VERSION,
} from './data/lucide-catalog.js';

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

export interface CatalogIconSummary {
  readonly id: string;
  readonly title: string;
  readonly tags: readonly string[];
  readonly svg: string;
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

const catalog = LUCIDE_CATALOG.map((record) => {
  const normalized = normalizeCatalogIcon(record);
  if (!normalized.value) {
    throw new Error(`Invalid bundled catalog icon: ${record.id}`);
  }
  return normalized.value;
});
const byId = new Map(catalog.map((icon) => [icon.id, icon]));

export { LUCIDE_CATALOG_VERSION };

export const LUCIDE_NOTICE = `Lucide Icons ${LUCIDE_CATALOG_VERSION}\nCopyright (c) 2026 Lucide Icons and Contributors\nLicensed under the ISC License. https://github.com/lucide-icons/lucide\n`;

/** Returns the pinned, curated catalog in stable title order. */
export function listCatalogIcons(): readonly CatalogIconSummary[] {
  return catalog.map(({ id, title, tags, svg }) => ({ id, title, tags, svg }));
}

/** Resolves a stable catalog ID without network access. */
export function getCatalogIcon(id: string): CatalogIcon | undefined {
  return byId.get(id);
}

/** Performs deterministic, case-insensitive matching over titles, IDs, and tags. */
export function searchCatalogIcons(
  query: string,
  limit = 40,
): readonly CatalogIconSummary[] {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const scored = catalog
    .map((icon) => {
      const name = icon.id.slice('lucide:'.length);
      const haystack = [name, icon.title.toLowerCase(), ...icon.tags];
      const matches = terms.every((term) =>
        haystack.some((value) => value.includes(term)),
      );
      if (!matches) return undefined;
      const score = terms.reduce(
        (total, term) =>
          total +
          (name === term
            ? 4
            : name.startsWith(term)
              ? 3
              : icon.title.toLowerCase().startsWith(term)
                ? 2
                : 1),
        0,
      );
      return { icon, score };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== undefined)
    .sort(
      (left, right) =>
        right.score - left.score ||
        left.icon.title.localeCompare(right.icon.title, 'en-US'),
    )
    .slice(0, Math.max(0, Math.min(limit, 100)));
  return scored.map(({ icon: { id, title, tags, svg } }) => ({
    id,
    title,
    tags,
    svg,
  }));
}
