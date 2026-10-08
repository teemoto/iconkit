import type { PresetOutput } from './index.js';

interface AppIconSlot {
  readonly idiom: 'iphone' | 'ipad' | 'ios-marketing';
  readonly size: string;
  readonly scale: '1x' | '2x' | '3x';
  readonly pixels: number;
}

export const IOS_APP_ICON_SLOTS: readonly AppIconSlot[] = [
  { idiom: 'iphone', size: '20x20', scale: '2x', pixels: 40 },
  { idiom: 'iphone', size: '20x20', scale: '3x', pixels: 60 },
  { idiom: 'iphone', size: '29x29', scale: '2x', pixels: 58 },
  { idiom: 'iphone', size: '29x29', scale: '3x', pixels: 87 },
  { idiom: 'iphone', size: '40x40', scale: '2x', pixels: 80 },
  { idiom: 'iphone', size: '40x40', scale: '3x', pixels: 120 },
  { idiom: 'iphone', size: '60x60', scale: '2x', pixels: 120 },
  { idiom: 'iphone', size: '60x60', scale: '3x', pixels: 180 },
  { idiom: 'ipad', size: '20x20', scale: '1x', pixels: 20 },
  { idiom: 'ipad', size: '20x20', scale: '2x', pixels: 40 },
  { idiom: 'ipad', size: '29x29', scale: '1x', pixels: 29 },
  { idiom: 'ipad', size: '29x29', scale: '2x', pixels: 58 },
  { idiom: 'ipad', size: '40x40', scale: '1x', pixels: 40 },
  { idiom: 'ipad', size: '40x40', scale: '2x', pixels: 80 },
  { idiom: 'ipad', size: '76x76', scale: '1x', pixels: 76 },
  { idiom: 'ipad', size: '76x76', scale: '2x', pixels: 152 },
  { idiom: 'ipad', size: '83.5x83.5', scale: '2x', pixels: 167 },
  { idiom: 'ios-marketing', size: '1024x1024', scale: '1x', pixels: 1024 },
];

/** Serializes the Xcode AppIcon asset-catalog metadata for the generated PNGs. */
export function serializeIosAppIconContents(
  outputs: readonly PresetOutput[],
): Uint8Array {
  const filenames = new Map(
    outputs.map((output) => [output.dimensions[0]!.width, output.filename]),
  );
  return new TextEncoder().encode(
    `${JSON.stringify(
      {
        images: IOS_APP_ICON_SLOTS.map(({ idiom, size, scale, pixels }) => ({
          filename: filenames.get(pixels),
          idiom,
          scale,
          size,
        })),
        info: { author: 'iconkit', version: 1 },
      },
      null,
      2,
    )}\n`,
  );
}
