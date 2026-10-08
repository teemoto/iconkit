import { describe, expect, it } from 'vitest';
import {
  getCatalogIcon,
  listCatalogIcons,
  LUCIDE_CATALOG_VERSION,
  normalizeCatalogIcon,
  searchCatalogIcons,
  type CatalogIconInput,
} from '../../src/index.js';

const camera: CatalogIconInput = {
  catalog: 'lucide',
  catalogVersion: '0.468.0',
  id: 'lucide:camera',
  title: '  Camera  ',
  tags: ['media', ' Camera ', 'media'],
  license: 'ISC',
  sourceUrl: 'https://lucide.dev/icons/camera',
  svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="currentColor" d="M0 0h24v24H0z"/></svg>',
};

describe('normalizeCatalogIcon', () => {
  it('normalizes pinned catalog metadata and validates its SVG', () => {
    expect(normalizeCatalogIcon(camera)).toMatchObject({
      valid: true,
      value: {
        title: 'Camera',
        tags: ['camera', 'media'],
        id: 'lucide:camera',
      },
    });
  });

  it.each([
    [{ ...camera, id: 'camera' }, 'CATALOG_INVALID_ICON'],
    [
      { ...camera, sourceUrl: 'http://lucide.dev/icons/camera' },
      'CATALOG_INVALID_ICON',
    ],
    [
      { ...camera, svg: '<svg viewBox="0 0 1 1"><script/></svg>' },
      'SVG_UNSUPPORTED_FEATURE',
    ],
    [
      { ...camera, svg: '<svg viewBox="0 0 1 1"><path d="M0 0"/></svg>' },
      'CATALOG_INVALID_ICON',
    ],
  ] as const)('rejects invalid catalog input with %s', (input, code) => {
    expect(normalizeCatalogIcon(input).diagnostics[0]?.code).toBe(code);
  });
});

describe('bundled Lucide catalog', () => {
  it('ships a normalized, version-pinned curated subset', () => {
    const icons = listCatalogIcons();
    expect(LUCIDE_CATALOG_VERSION).toBe('1.50.0');
    expect(icons).toHaveLength(170);
    expect(new Set(icons.map((icon) => icon.id)).size).toBe(icons.length);
    expect(getCatalogIcon('lucide:camera')).toMatchObject({
      title: 'Camera',
      license: 'ISC',
    });
  });

  it('searches titles, IDs, and tags deterministically', () => {
    expect(searchCatalogIcons('camera', 3)[0]?.id).toBe('lucide:camera');
    expect(searchCatalogIcons('shopping').map((icon) => icon.id)).toEqual([
      'lucide:shopping-bag',
      'lucide:shopping-cart',
    ]);
    expect(searchCatalogIcons('camera', 3)).toEqual(
      searchCatalogIcons('CAMERA', 3),
    );
  });
});
