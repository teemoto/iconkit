# IconKit Android Asset Contract

## Status

- Product: IconKit
- Decision type: Android launcher-icon preset contract
- Status: Implemented; Android project validation pending
- Date: October 8, 2026
- Planned preset ID: `android-app-icon`
- Planned preset version: `1`

## Objective

Generate a drop-in Android launcher-icon resource tree from the existing
IconKit source and canvas configuration. The result must support adaptive icons
on Android 8.0 and later, themed icons where the launcher supports them, legacy
launchers on Android 7.1 and earlier, and the separate Google Play listing
icon.

The preset will not flatten the adaptive icon into one bitmap. Android requires
separate foreground and background layers so launchers can apply device masks
and motion effects.

## Source Mapping

The version-1 IconKit config already contains enough information for the first
Android preset:

- `source` becomes the adaptive foreground artwork.
- `canvas.iconColor` continues to recolor eligible catalog or
  `currentColor` artwork.
- `canvas.background` becomes the full-bleed adaptive background layer.
- `canvas.padding` controls artwork inset, subject to Android's safe area.
- `canvas.shape` applies only to the legacy `ic_launcher` output. Android
  supplies the mask for adaptive, round, and Play Store icons.

No Android-only config fields will be added in preset version 1.

## Output Tree

All paths are relative to the selected IconKit output directory.

```text
android/
├── app/src/main/res/
│   ├── mipmap-mdpi/
│   │   ├── ic_launcher.png
│   │   ├── ic_launcher_round.png
│   │   ├── ic_launcher_foreground.png
│   │   ├── ic_launcher_background.png
│   │   └── ic_launcher_monochrome.png
│   ├── mipmap-hdpi/                 # same five resources
│   ├── mipmap-xhdpi/                # same five resources
│   ├── mipmap-xxhdpi/               # same five resources
│   ├── mipmap-xxxhdpi/              # same five resources
│   └── mipmap-anydpi-v26/
│       ├── ic_launcher.xml
│       └── ic_launcher_round.xml
└── play-store-icon.png
```

The preset produces 28 files: 25 density-specific PNG resources, two adaptive
icon XML resources, and one Google Play listing PNG.

## Density Matrix

| Density | Scale | Legacy and round | Adaptive layers |
| ------- | ----: | ---------------: | --------------: |
| mdpi    |    1× |        48 × 48px |     108 × 108px |
| hdpi    |  1.5× |        72 × 72px |     162 × 162px |
| xhdpi   |    2× |        96 × 96px |     216 × 216px |
| xxhdpi  |    3× |      144 × 144px |     324 × 324px |
| xxxhdpi |    4× |      192 × 192px |     432 × 432px |

The adaptive sizes represent Android's 108dp layer canvas at each supported
density. The legacy sizes represent the standard 48dp launcher icon.

## Adaptive Layer Rules

### Foreground

- Render the source on a transparent 108dp square layer.
- Preserve source colors unless `canvas.iconColor` legitimately applies.
- Keep the complete artwork inside the centered 66 × 66dp guaranteed safe
  zone. This requires an effective normalized padding of at least `21 / 108`,
  approximately `0.194444`.
- If the requested padding is smaller, increase it for Android adaptive layers
  and emit `ANDROID_ADAPTIVE_SAFE_AREA_ADJUSTED`.
- Do not add an outline mask, rounded corners, or a drop shadow around the icon.

### Background

- Fill the complete 108dp layer using the configured solid color or gradient.
- If the configured background is transparent, substitute opaque white and
  emit `ANDROID_OPAQUE_BACKGROUND_APPLIED`.
- Export an opaque PNG at every density.

### Monochrome

- Derive a single-color white silhouette from the foreground artwork's alpha
  mask on a transparent layer.
- Use the same safe-area adjustment as the foreground.
- Do not include background pixels, gradients, shadows, or precomposed masks.
- Include the resource in the `<monochrome>` element so launchers can tint it
  for themed icons.
- Emit a review warning for a fully opaque rectangular source because its alpha
  mask may not produce a useful themed icon.

### Adaptive XML

Both XML files reference the three generated layers:

```xml
<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@mipmap/ic_launcher_background" />
    <foreground android:drawable="@mipmap/ic_launcher_foreground" />
    <monochrome android:drawable="@mipmap/ic_launcher_monochrome" />
</adaptive-icon>
```

`ic_launcher_round.xml` intentionally uses the same layers. A launcher applies
the circular mask when the app manifest references it through
`android:roundIcon`.

## Legacy Launcher Rules

- Generate `ic_launcher.png` at 48dp for every density using the requested
  canvas shape and background.
- Generate `ic_launcher_round.png` from the same composition with a forced
  circular mask.
- Keep the artwork within the adaptive 66/108 safe-area ratio so switching
  between legacy and adaptive launchers does not cause a large visual jump.
- Legacy PNGs may contain transparent pixels outside their selected mask.

## Google Play Listing Icon

- Generate `android/play-store-icon.png` at 512 × 512px.
- Use a full square background without rounded corners or an outer drop shadow;
  Google Play applies those treatments.
- Encode a 32-bit PNG in sRGB and keep the file at or below 1024KB.
- Use the configured background, substituting opaque white with the same
  warning when transparency is requested.
- Keep the artwork on the same visual keyline used for the launcher outputs.

## Integration Contract

An Android app consumes the generated tree by copying
`android/app/src/main/res` into its application module. Its manifest should
reference:

```xml
<application
    android:icon="@mipmap/ic_launcher"
    android:roundIcon="@mipmap/ic_launcher_round" />
```

The Play listing icon is uploaded separately in Google Play Console and must
not be copied into `res/`.

## Diagnostics

| Code                                  | Severity | Trigger                                                                   |
| ------------------------------------- | -------- | ------------------------------------------------------------------------- |
| `ANDROID_ADAPTIVE_SAFE_AREA_ADJUSTED` | warning  | Requested padding places artwork outside the guaranteed safe zone.        |
| `ANDROID_OPAQUE_BACKGROUND_APPLIED`   | warning  | The shared canvas requests a transparent background.                      |
| `ANDROID_SHAPE_IGNORED`               | info     | A non-square shared shape is ignored for adaptive and Play outputs.       |
| `ANDROID_MONOCHROME_REVIEW_REQUIRED`  | warning  | The source alpha mask is fully opaque and may become a solid themed tile. |
| `ANDROID_PLAY_ICON_TOO_LARGE`         | error    | The 512px listing PNG exceeds 1024KB.                                     |

Duplicate diagnostics should appear once per generation, not once per density.

## Acceptance Criteria

Implementation of this contract is complete when:

1. All 28 files are generated from both SVG and PNG sources.
2. Every PNG has the exact dimensions in the density matrix.
3. Background PNGs are opaque; foreground and monochrome layers preserve
   transparency.
4. Foreground and monochrome artwork remain inside the 66 × 66dp safe zone.
5. Both XML files parse and reference resources present in the bundle.
6. The monochrome layer contains one RGB color plus transparency.
7. The Play listing icon meets its size, format, shape, and file-size rules.
8. Repeated generation remains byte-identical.
9. A generated resource tree builds in a minimal Android application and
   previews under circle, squircle, rounded-square, and square launcher masks.

## Official Basis

- [Android adaptive icons](https://developer.android.com/develop/ui/compose/system/icon_design_adaptive)
- [Create app icons in Android Studio](https://developer.android.com/studio/write/create-app-icons)
- [Google Play icon design specifications](https://developer.android.com/distribute/google-play/resources/icon-design-specifications)
- [AdaptiveIconDrawable API reference](https://developer.android.com/reference/android/graphics/drawable/AdaptiveIconDrawable)
