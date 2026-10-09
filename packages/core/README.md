# @icon-kit/core

The deterministic, platform-neutral IconKit generation engine. It validates
versioned configs and untrusted SVG/PNG input, renders web and native preset
assets, and returns bytes without reading files, writing files, or accessing
the network.

## Public workflow

```ts
import {
  generateBundle,
  initializePngDecoder,
  initializeSvgRasterizer,
  validateConfig,
} from '@icon-kit/core';
```

Browser adapters initialize the two decoders with WASM URLs. Node adapters may
instead call `initializeNode` from `@icon-kit/core/node` after building or
installing the package.

The stable high-level functions are:

- `validateConfig(input)`
- `renderAsset(request)`
- `generatePreset(request)`
- `generateBundle(request)`
- `listPresets()`
- `listCatalogIcons()` and `searchCatalogIcons()`

Recoverable input problems are returned as diagnostics. Successful generated
files include their relative path, dimensions, format, SHA-256 digest, bytes,
and preset version. ZIP timestamps and entry ordering are fixed for
reproducibility.

The bundled catalog contains 170 curated Lucide 1.50.0 icons. Catalog configs
resolve without network access and include `THIRD_PARTY_NOTICES.txt` in the
generated bundle.

Lower-level ingestion, layout, composition, rasterization, ICO, manifest, ZIP,
and output-planning functions remain exported for adapters and tests.

See the repository [configuration reference](../../docs/configuration.md) and
[preset reference](../../docs/presets.md).
