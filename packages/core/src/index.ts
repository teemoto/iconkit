/** Public, platform-neutral types for IconKit's generation engine. */

export type AssetFormat = 'ico' | 'json' | 'png' | 'svg' | 'txt';

export interface Dimension {
  readonly width: number;
  readonly height: number;
}

export interface GeneratedFile {
  readonly path: string;
  readonly format: AssetFormat;
  readonly dimensions: readonly Dimension[];
  readonly bytes: Uint8Array;
  readonly sha256: string;
  readonly presetId?: string;
  readonly presetVersion?: number;
}

export type DiagnosticSeverity = 'error' | 'info' | 'warning';

export interface Diagnostic {
  readonly severity: DiagnosticSeverity;
  readonly code: string;
  readonly message: string;
  readonly path?: readonly (string | number)[];
  readonly suggestion?: string;
  readonly details?: Readonly<Record<string, string | number | boolean>>;
}

export interface ValidationResult<T> {
  readonly value?: T;
  readonly diagnostics: readonly Diagnostic[];
  readonly valid: boolean;
}

export type SourceFormat = 'png' | 'svg';
export type PresetId =
  'chrome-extension' | 'ios-app-icon' | 'pwa' | 'web-favicon';
export type VectorOutput = 'never' | 'when-vector-safe';

export interface FileSource {
  readonly kind: 'file';
  readonly path: string;
  readonly format: SourceFormat;
  readonly sha256?: string;
}

export interface CatalogIconSource {
  readonly kind: 'catalog-icon';
  readonly catalog: 'lucide';
  readonly catalogVersion: string;
  readonly id: string;
}

export type IconSource = CatalogIconSource | FileSource;

export type Background =
  | { readonly type: 'transparent' }
  | { readonly type: 'solid'; readonly color: string }
  | {
      readonly type: 'linear-gradient';
      readonly from: string;
      readonly to: string;
      readonly angle: number;
    };

export type CanvasShape =
  | { readonly type: 'square' }
  | { readonly type: 'circle' }
  | { readonly type: 'rounded-square'; readonly cornerRadius: number };

export interface Canvas {
  readonly padding: number;
  readonly background: Background;
  readonly shape: CanvasShape;
  readonly iconColor?: string;
}

export interface IconKitConfig {
  readonly version: 1;
  readonly source: IconSource;
  readonly canvas: Canvas;
  readonly targets: readonly PresetId[];
  readonly vectorOutput?: VectorOutput;
}

export interface PresetOutput {
  readonly outputDirectory: string;
  readonly filename: string;
  readonly format: Exclude<AssetFormat, 'json'>;
  readonly dimensions: readonly Dimension[];
  readonly options?: Readonly<Record<string, string | number | boolean>>;
}

export interface PresetDefinition {
  readonly id: PresetId;
  readonly version: number;
  readonly title: string;
  readonly description: string;
  readonly outputs: readonly PresetOutput[];
  readonly options?: Readonly<Record<string, string | number | boolean>>;
}

export { decodePng, initializePngDecoder, inspectPng } from './png.js';
export type { DecodedRaster, PngMetadata, RasterDecoder } from './png.js';
export { inspectSvg } from './svg.js';
export type { SvgAsset, SvgMetadata } from './svg.js';
export {
  getCatalogIcon,
  listCatalogIcons,
  LUCIDE_CATALOG_VERSION,
  LUCIDE_NOTICE,
  normalizeCatalogIcon,
  searchCatalogIcons,
} from './catalog.js';
export type {
  CatalogIcon,
  CatalogIconInput,
  CatalogIconSummary,
} from './catalog.js';
export { computeContainFitLayout, toPixelRect } from './layout.js';
export type { CanonicalLayout, NormalizedRect, PixelRect } from './layout.js';
export { renderSvgBackground } from './background.js';
export type { SvgBackground } from './background.js';
export { renderSvgCanvasClip } from './shape.js';
export type { SvgCanvasClip } from './shape.js';
export { composeSvg } from './compose-svg.js';
export type { SvgComposition } from './compose-svg.js';
export { initializeSvgRasterizer, renderSvgToPng } from './png-renderer.js';
export type { RenderedPng } from './png-renderer.js';
export { removeOpaquePngAlpha } from './opaque-png.js';
export { encodeIco } from './ico.js';
export type { IcoImage } from './ico.js';
export { assessVectorOutput } from './vector-output.js';
export type { VectorOutputDecision } from './vector-output.js';
export { generateFaviconPreset } from './favicon-preset.js';
export { generatePwaPreset } from './pwa-preset.js';
export type { PwaPresetOptions } from './pwa-preset.js';
export { generateChromeExtensionPreset } from './chrome-extension-preset.js';
export type { ChromeExtensionPreset } from './chrome-extension-preset.js';
export {
  IOS_APP_ICON_SLOTS,
  serializeIosAppIconContents,
} from './ios-app-icon-preset.js';
export { planOutputWrite } from './output-plan.js';
export type { OutputWriteOptions, OutputWritePlan } from './output-plan.js';
export {
  createGeneratedFileManifest,
  serializeGeneratedFileManifest,
} from './generated-file-manifest.js';
export type {
  GeneratedFileManifest,
  GeneratedFileManifestEntry,
} from './generated-file-manifest.js';
export { createZipBundle } from './zip-bundle.js';
export type { ZipBundle } from './zip-bundle.js';
export { validateConfig, PRESET_IDS } from './config.js';
export {
  generateBundle,
  generatePreset,
  renderAsset,
  listPresets,
  serializeConfig,
  hashBytes,
} from './generate.js';
export type {
  SourceAsset,
  GenerateBundleRequest,
  GeneratePresetRequest,
  RenderAssetRequest,
  RenderResult,
  GeneratedBundle,
} from './generate.js';
