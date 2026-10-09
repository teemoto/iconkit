import type { PresetDefinition, PresetOutput } from './index.js';

export type AndroidDensity = 'hdpi' | 'mdpi' | 'xhdpi' | 'xxhdpi' | 'xxxhdpi';

export interface AndroidDensityDefinition {
  readonly id: AndroidDensity;
  readonly legacySize: number;
  readonly adaptiveSize: number;
}

export const ANDROID_DENSITIES: readonly AndroidDensityDefinition[] = [
  { id: 'mdpi', legacySize: 48, adaptiveSize: 108 },
  { id: 'hdpi', legacySize: 72, adaptiveSize: 162 },
  { id: 'xhdpi', legacySize: 96, adaptiveSize: 216 },
  { id: 'xxhdpi', legacySize: 144, adaptiveSize: 324 },
  { id: 'xxxhdpi', legacySize: 192, adaptiveSize: 432 },
];

export const ANDROID_SAFE_PADDING = 21 / 108;
export const ANDROID_PLAY_ICON_MAX_BYTES = 1024 * 1024;

const roles = [
  ['legacy', 'ic_launcher.png'],
  ['round', 'ic_launcher_round.png'],
  ['foreground', 'ic_launcher_foreground.png'],
  ['background', 'ic_launcher_background.png'],
  ['monochrome', 'ic_launcher_monochrome.png'],
] as const;

const outputs: PresetOutput[] = ANDROID_DENSITIES.flatMap((density) =>
  roles.map(([role, filename]) => {
    const size =
      role === 'legacy' || role === 'round'
        ? density.legacySize
        : density.adaptiveSize;
    return {
      outputDirectory: `android/app/src/main/res/mipmap-${density.id}`,
      filename,
      format: 'png' as const,
      dimensions: [{ width: size, height: size }],
      options: { androidRole: role, density: density.id },
    };
  }),
);
outputs.push({
  outputDirectory: 'android',
  filename: 'play-store-icon.png',
  format: 'png',
  dimensions: [{ width: 512, height: 512 }],
  options: { androidRole: 'play' },
});

export const ANDROID_APP_ICON_PRESET: PresetDefinition = {
  id: 'android-app-icon',
  version: 1,
  title: 'Android app icon',
  description:
    'Adaptive, themed, legacy, round, and Google Play launcher-icon assets.',
  outputs,
};

/** Serializes an Android adaptive-icon resource with stable formatting. */
export function serializeAndroidAdaptiveIconXml(): Uint8Array {
  return new TextEncoder().encode(`<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@mipmap/ic_launcher_background" />
    <foreground android:drawable="@mipmap/ic_launcher_foreground" />
    <monochrome android:drawable="@mipmap/ic_launcher_monochrome" />
</adaptive-icon>
`);
}
