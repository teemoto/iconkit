# Manual alpha validation — October 17, 2026

Last updated: October 18, 2026

## Scope

This pass exercised the web composer in installed Chrome and in Playwright's
Chromium 151, Firefox 153, and WebKit 26.5 engines. It also ran the CLI
reproduction, collision, overwrite, and ZIP-content checks from the manual test
plan.

## Passed

- Sample generation produced 59 downloadable bundle entries and rendered the
  main, favicon, PWA, extension, iOS, and Android previews.
- Solid and gradient backgrounds, padding, canvas shape, safe-area guides, and
  all four Android launcher masks updated successfully.
- SVG and PNG file inputs generated successfully in Chromium, Firefox, and
  WebKit.
- Catalog search and keyboard selection recreated the Camera icon with its
  Lucide 1.50.0 source metadata.
- Browser ZIP and config downloads completed in all three engines. The catalog
  ZIP contained `THIRD_PARTY_NOTICES.txt`, the manifest, the iOS asset catalog,
  and the Android Play listing icon.
- Saved catalog configs recreated immediately. Saved file configs requested
  their source, accepted the original source, and rejected a changed source.
- Oversized files, malformed SVG, corrupt PNG, and an empty preset selection
  produced clear error states without a browser console error.
- Chromium and Firefox had no page-level horizontal overflow at 320, 640, 768,
  or 1605 CSS pixels. The 640px pass represents a 1280px viewport at 200% zoom.
- Keyboard focus used a visible 2px outline.
- The CLI generated two byte-identical ZIPs from a source and its saved config,
  refused a collision by default, and succeeded with `--overwrite`.

## Findings

### 1. WebKit overflows at 320px

**Severity:** medium

**Status:** resolved locally

WebKit reported a 361px document width in a 320px viewport. Chromium and
Firefox remained at 320px. The visually hidden `#source` and `#import-config`
file inputs retain intrinsic scroll widths in WebKit because they are reduced
to 1px and made transparent without being clipped.

Adding the standard visually-hidden rules (`margin: -1px`, `overflow: hidden`,
`clip`, `clip-path`, and `white-space: nowrap`) reduced WebKit's document width
from 361px to 320px. The file controls remain keyboard focusable through their
visible labels.

### 2. The icon catalog adds over 40 sequential tab stops

**Severity:** medium

**Status:** resolved locally

With an empty search, moving from the catalog search field to the Background
control required 42 tab presses in Chromium and 43 in Firefox. Every rendered
catalog option participates in the page tab order. Focus is visible and the
options work with Enter, but the sequence makes later controls expensive to
reach.

The catalog now uses one active tab stop. Left/Right and Up/Down move through
the grid, Home and End jump to its boundaries, Enter or Space selects, and Tab
moves to the next control. Filtered and empty result sets preserve the expected
focus order. Chromium, Firefox, and WebKit pass the interaction checks without
console errors.

## Follow-up validation

Perform one visible browser spot check at native 200% zoom before the alpha
release.
