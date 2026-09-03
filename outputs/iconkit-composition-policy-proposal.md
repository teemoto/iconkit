# IconKit MVP Composition Policy Proposal

## Status

- Product: IconKit
- Decision type: Single-mark composition and vector-preservation contract
- Status: Proposed — requires approval before implementation
- Date: September 3, 2026

## Recommendation

Use one normalized square canvas for every MVP composition. A source mark is centered with contain-fit layout inside a configurable safe area; a background and optional canvas mask are applied behind and around it. This supports fast, consistent output without introducing a multi-layer editor.

## Canonical Canvas Model

- Geometry is expressed as normalized fractions of a square canvas, never in target-pixel coordinates.
- Rendering begins from the same canonical composition for every output size.
- Source artwork is centered and contain-fit within the safe area; it is never stretched.
- The source has no position, rotation, or independent scale controls in the MVP. Those are layer-editor concerns deferred to Phase 2.

## Style Controls and Defaults

| Control                | Allowed values                                                 | Default                      | Notes                                                                                      |
| ---------------------- | -------------------------------------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------ |
| Padding                | `0` through `0.40` of canvas width                             | `0.12`                       | Equal inset on all sides; values are stored as decimals, not pixels.                       |
| Background             | `transparent`, `solid`, `linear-gradient`                      | `transparent`                | Background sits behind the source.                                                         |
| Solid background color | Opaque `#RRGGBB`                                               | N/A                          | Transparency belongs to the `transparent` background mode, not a partial-alpha color.      |
| Linear gradient        | Exactly two opaque `#RRGGBB` stops and angle `0`–`359` degrees | N/A                          | Angle is measured clockwise from upward. No radial, multi-stop, or image gradients in MVP. |
| Canvas shape           | `square`, `rounded-square`, `circle`                           | `square`                     | The shape clips the composed canvas, including its background and source.                  |
| Corner radius          | `0` through `0.50` of canvas width                             | `0.20` when `rounded-square` | Ignored for `square` and `circle`.                                                         |
| Icon color             | Opaque `#RRGGBB` or unset                                      | Unset                        | Available only for catalog icons and explicitly eligible monochrome SVGs.                  |

The web composer may offer curated color choices, but the saved config must use the values above so the CLI reproduces the same mark exactly.

## Shape and Safe-Area Rules

- `square` has no clipping.
- `rounded-square` clips the full canvas with a uniform corner radius.
- `circle` clips the full canvas to a centered circle.
- Padding is always calculated before the shape mask. Users are responsible for choosing enough padding for an uploaded mark; the web preview shows the actual generated small-size rasters.
- The PWA maskable variant applies the approved platform safe-area layout in addition to this composition. It is a preset-specific render variant, not another general canvas control.

## Color Rules

- PNG sources and multicolor SVG sources retain their original colors.
- Icon-color overrides apply to built-in catalog icons because their vector structure and license metadata are known.
- Uploaded SVG is eligible for recoloring only when it uses the explicitly supported `currentColor` paint model and otherwise remains inside the SVG safe subset.
- IconKit never guesses whether arbitrary hard-coded SVG fills represent a single-color logo. Recoloring such artwork requires a future explicit conversion action.

## Vector-Safe SVG Export

SVG is an additional source artifact, not a replacement for any target-required PNG or ICO file. A composition may emit SVG only when all of the following are true:

1. The source is an accepted SVG or a built-in catalog icon; PNG sources are never vector-safe.
2. The source uses only the approved static SVG subset.
3. The composition uses only transparent, solid, or two-stop linear-gradient background; square, rounded-square, and circle clipping; normalized contain-fit transforms; and an allowed icon-color override.
4. No raster image, filter, shadow, blur, unsupported CSS, or future layer effect is present.

When vector-safe, IconKit emits an SVG that contains the sanitized source and composition geometry. When not vector-safe, the SVG export is omitted and the generated-file manifest records the reason with `VECTOR_EXPORT_UNAVAILABLE`. Required preset PNG/ICO files are still generated normally.

## Out of Scope for MVP

- Multiple layers, accent badges, shadows, borders, rings, blend modes, and arbitrary transforms.
- Gradients with more than two stops, radial gradients, image textures, or partial-alpha gradient stops.
- Arbitrary SVG recoloring or automatic logo simplification.
- User-defined canvas aspect ratios.

## Fixture Coverage Required

The core fixture suite must cover transparent, solid, and gradient backgrounds; all three shape modes; padding boundaries; wide and tall source marks; eligible and ineligible recoloring; SVG-safe and raster-only outcomes; and the PWA maskable safe-area variant.

## Acceptance Criteria

This policy is approved when the project owner confirms:

1. The normalized square-canvas model and the listed control ranges/defaults are correct.
2. Single-mark composition remains deliberately limited; no MVP layer controls are needed.
3. The color and recoloring rules avoid guessing at uploaded logos.
4. The vector-safe conditions and omitted-SVG behavior are acceptable.

On approval, this document drives the `IconKitConfig` canvas schema, render-layout tests, web controls, CLI validation, and vector-export diagnostics.
