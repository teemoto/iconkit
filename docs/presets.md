# Presets and generated output

IconKit alpha provides five version-1 presets. Paths are relative to the
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

## iOS app icon (`ios-app-icon`)

The preset creates `ios/AppIcon.appiconset` with 13 unique PNG files covering
the required iPhone, iPad, and 1024 px App Store slots. Its `Contents.json`
maps those files into an Xcode asset catalog. Drag the generated app-icon set
into `Assets.xcassets`, or replace an existing `AppIcon.appiconset`.

iOS applies its own corner mask and does not accept transparent app icons.
IconKit therefore renders this preset on a square canvas. It substitutes a
white background when the shared config requests transparency and reports both
adjustments as generation warnings.

## Android app icon (`android-app-icon`)

The preset creates a drop-in `android/app/src/main/res` tree with adaptive
foreground, background, and monochrome layers at all five Android density
buckets. It also includes legacy and round launcher PNGs, two adaptive-icon XML
resources, and `android/play-store-icon.png` for the Google Play listing. The
complete preset contains 28 files.

Adaptive artwork is kept inside Android's guaranteed 66/108 safe area. IconKit
increases insufficient padding and reports the adjustment. Adaptive background
and Play outputs receive a white background when the shared config requests
transparency. Android supplies final launcher masks, so the shared canvas shape
does not pre-mask adaptive or Play output.

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

The implemented Android output contract is documented in
[`outputs/iconkit-android-asset-contract.md`](../outputs/iconkit-android-asset-contract.md).
