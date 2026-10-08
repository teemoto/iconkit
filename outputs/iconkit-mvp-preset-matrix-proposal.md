# IconKit MVP Preset Matrix Proposal

## Status

- Product: IconKit
- Decision type: MVP preset contract
- Status: Approved and implemented
- Date: September 3, 2026

## Recommendation

The first core, CLI, and web alpha uses three independent generation presets:

1. `web-favicon`
2. `pwa`
3. `chrome-extension`

Treat native iOS and Android launcher assets as explicit follow-on presets. They remain part of the broader public MVP promise, but should not block the deterministic core/CLI alpha because both require platform-specific packaging rules beyond a simple resized bitmap.

This recommendation preserves the main developer value proposition—an existing logo to correctly structured web, PWA, and Chrome extension assets—while avoiding a misleading native-app export that omits the resources and metadata those platforms actually require.

## Approved-If-Accepted Output Contract

All paths below are relative to the requested output directory. Presets write to separate folders so combining presets in one bundle cannot overwrite files.

| Preset ID          | Files                                 | Format                           | Notes                                                                                          |
| ------------------ | ------------------------------------- | -------------------------------- | ---------------------------------------------------------------------------------------------- |
| `web-favicon`      | `web/favicon/favicon.ico`             | ICO with 16, 32, and 48px images | Broad browser compatibility and a conventional root-ready favicon artifact.                    |
|                    | `web/favicon/favicon-16x16.png`       | PNG, 16×16                       | Explicit tiny raster for HTML links and preview.                                               |
|                    | `web/favicon/favicon-32x32.png`       | PNG, 32×32                       | Common tab and high-density use.                                                               |
|                    | `web/favicon/favicon-48x48.png`       | PNG, 48×48                       | Included in the ICO source set and available independently.                                    |
|                    | `web/favicon/apple-touch-icon.png`    | PNG, 180×180                     | Website web-clip convenience output; it is not a native iOS app-asset catalog.                 |
| `pwa`              | `pwa/icons/icon-192.png`              | PNG, 192×192                     | Chromium installability baseline.                                                              |
|                    | `pwa/icons/icon-512.png`              | PNG, 512×512                     | Chromium installability baseline and high-resolution use.                                      |
|                    | `pwa/icons/icon-maskable-192.png`     | PNG, 192×192                     | Generated only when `maskable: true`; important content must remain in the maskable safe zone. |
|                    | `pwa/icons/icon-maskable-512.png`     | PNG, 512×512                     | Generated only when `maskable: true`; same composition rules as the 192px variant.             |
| `chrome-extension` | `chrome-extension/icons/icon-16.png`  | PNG, 16×16                       | Extension page/favicon and toolbar density support.                                            |
|                    | `chrome-extension/icons/icon-32.png`  | PNG, 32×32                       | Windows and high-density toolbar support.                                                      |
|                    | `chrome-extension/icons/icon-48.png`  | PNG, 48×48                       | Chrome extension management page.                                                              |
|                    | `chrome-extension/icons/icon-128.png` | PNG, 128×128                     | Installation and Chrome Web Store requirement.                                                 |

The asset bundle should also contain:

- `iconkit.config.json`: the portable, versioned source-and-composition config.
- `iconkit.manifest.json`: machine-readable record of each generated file, its preset version, format, dimensions, and relative path.

The first release does **not** emit a web manifest, HTML snippet, or Chrome `manifest.json`; those outputs require app-specific fields such as name, start URL, scope, and extension version. They belong in the planned integration phase.

## Source Basis

- Chromium requires at least 192×192 and 512×512 PWA icons. Its documentation also supports maskable icons through `purpose: "any maskable"`. [web.dev: Add a web app manifest](https://web.dev/articles/add-manifest)
- The web-app-manifest specification defines a maskable icon’s guaranteed safe zone as a centered circle with a radius equal to 40% of the icon size. [W3C Web Application Manifest](https://www.w3.org/TR/appmanifest/)
- Chrome extension documentation recommends PNG and shows the 16, 32, 48, and 128px icon set; 128px is needed for installation and the Chrome Web Store, while 48px supports the extensions management page. [Chrome extension icons](https://developer.chrome.com/docs/extensions/reference/manifest/icons)
- Apple documents `apple-touch-icon.png` as the conventional website web-clip filename. [Apple Safari web application configuration](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html)

## Explicit Deferrals

### Native iOS app assets

Defer a native `ios-app` preset until IconKit can generate a complete asset-catalog structure and verify it against current Xcode requirements. The `apple-touch-icon.png` above is intentionally a website convenience asset, not a substitute for an iOS app icon set.

### Native Android app assets

Defer a native `android-app` preset until the composition model supports Android’s adaptive-icon foreground and background layers plus the corresponding resource XML. Android’s current adaptive-icon guidance describes separate layers and device-dependent masks, so a flattened PNG bundle would be incomplete. [Android adaptive icons](https://developer.android.com/develop/ui/compose/system/icon_design_adaptive)

## Rendering Rules This Decision Implies

- Every preset output is square and uses contain-fit layout; source artwork is never stretched.
- Raster and multicolor source artwork retains its colors unless a future composition setting explicitly permits recoloring.
- The default PWA maskable variant uses a dedicated safe-area layout rather than merely renaming the regular PWA bitmap.
- PNG is the required raster output for the approved PWA and Chrome extension targets. SVG may be exported only as an additional vector-safe artifact, never instead of a required raster file.
- Each preset has a version from day one, so requirement changes can be introduced without silently changing a reproducible bundle.

## Acceptance Criteria

This decision is approved when the project owner confirms:

1. The three preset IDs and exact paths above are the M0/M1 contract.
2. `apple-touch-icon.png` is included with `web-favicon`.
3. PWA maskable variants are enabled by default and rendered with safe-area treatment.
4. Native iOS and Android presets are deferred until their packaging contracts are designed and verified.

On approval, this document becomes the source for `PresetDefinition` fixtures, CLI help, bundle tests, and generated-file manifests.
