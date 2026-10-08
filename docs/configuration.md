# IconKit configuration reference

IconKit configuration is portable design data. Filesystem output paths and
overwrite policy are CLI concerns and are deliberately excluded.

```json
{
  "$schema": "https://iconkit.dev/schemas/iconkit.config.schema.json",
  "version": 1,
  "source": {
    "kind": "file",
    "path": "source/input.svg",
    "format": "svg"
  },
  "canvas": {
    "padding": 0.12,
    "background": { "type": "transparent" },
    "shape": { "type": "square" }
  },
  "targets": ["web-favicon", "pwa", "ios-app-icon", "chrome-extension"],
  "vectorOutput": "when-vector-safe"
}
```

## Fields

- `version` must be `1`.
- `source.path` is a non-empty, safe relative path. Supported formats are
  `svg` and `png`. A 64-character `sha256` may be included to detect source
  drift.
- `canvas.padding` is a normalized inset from `0` through `0.4`.
- `canvas.background` is `transparent`, `solid` with a `#RRGGBB` color, or
  `linear-gradient` with `from`, `to`, and an integer angle from 0 through 359.
- `canvas.shape` is `square`, `circle`, or `rounded-square` with a normalized
  `cornerRadius` from `0` through `0.5`.
- `targets` contains one or more distinct supported preset IDs.
- `vectorOutput` is `when-vector-safe` or `never`. SVG source can add
  `iconkit.svg`; PNG remains raster-only.

Catalog configs use the pinned offline Lucide subset:

```json
{
  "kind": "catalog-icon",
  "catalog": "lucide",
  "catalogVersion": "1.50.0",
  "id": "lucide:camera"
}
```

Catalog IDs are available through `listCatalogIcons()` and in the web search
picker. A catalog config needs no separate source file. Generated bundles carry
the applicable third-party notice.

The JSON Schema is at
[`schemas/iconkit.config.schema.json`](../schemas/iconkit.config.schema.json).
