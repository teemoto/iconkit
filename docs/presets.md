# Presets and generated output

IconKit alpha provides three version-1 presets. Paths are relative to the
selected output directory or ZIP root.

## Website favicon (`web-favicon`)

- `web/favicon/favicon.ico` with 16, 32, and 48 px PNG payloads
- `web/favicon/favicon-16x16.png`
- `web/favicon/favicon-32x32.png`
- `web/favicon/favicon-48x48.png`
- `web/favicon/apple-touch-icon.png` at 180 px

## Progressive web app (`pwa`)

- `pwa/icons/icon-192.png`
- `pwa/icons/icon-512.png`
- `pwa/icons/icon-maskable-192.png`
- `pwa/icons/icon-maskable-512.png`

Maskable files use a dedicated safe-area composition. IconKit emits a warning
when it increases the requested padding to protect the artwork.

## Chrome extension (`chrome-extension`)

- `chrome-extension/icons/icon-16.png`
- `chrome-extension/icons/icon-32.png`
- `chrome-extension/icons/icon-48.png`
- `chrome-extension/icons/icon-128.png`

## Bundle metadata

Every bundle includes:

- `source/input.svg` or `source/input.png`
- `iconkit.config.json`
- `iconkit.manifest.json`
- `iconkit.svg` when requested and the source remains vector-safe

Catalog bundles omit `source/input.*` because the pinned icon ID is the
reproducible source. They include `THIRD_PARTY_NOTICES.txt`.

The manifest records paths, formats, dimensions, SHA-256 digests, and preset
versions. It excludes timestamps and host paths. ZIP entry ordering,
compression settings, and timestamps are fixed.

Native iOS and Android asset catalogs remain deferred until IconKit implements
their complete platform packaging contracts.
