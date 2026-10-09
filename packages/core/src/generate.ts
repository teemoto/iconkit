import registry from '../../../presets/initial.json' with { type: 'json' };
import type {
  Canvas,
  Diagnostic,
  GeneratedFile,
  IconKitConfig,
  PresetDefinition,
  PresetId,
  SourceFormat,
  ValidationResult,
} from './index.js';
import { validateConfig } from './config.js';
import { inspectSvg, type SvgAsset } from './svg.js';
import { decodePng } from './png.js';
import { composeSvg } from './compose-svg.js';
import { computeContainFitLayout } from './layout.js';
import { renderSvgBackground } from './background.js';
import { renderSvgCanvasClip } from './shape.js';
import { renderSvgToPng } from './png-renderer.js';
import { encodeIco } from './ico.js';
import { createZipBundle } from './zip-bundle.js';
import {
  createGeneratedFileManifest,
  serializeGeneratedFileManifest,
} from './generated-file-manifest.js';
import {
  getCatalogIcon,
  LUCIDE_CATALOG_VERSION,
  LUCIDE_NOTICE,
} from './catalog.js';
import { serializeIosAppIconContents } from './ios-app-icon-preset.js';
import {
  addPngSrgbChunk,
  createMonochromePng,
  encodeRgbaPng,
  removeOpaquePngAlpha,
} from './opaque-png.js';
import {
  ANDROID_APP_ICON_PRESET,
  ANDROID_PLAY_ICON_MAX_BYTES,
  ANDROID_SAFE_PADDING,
  serializeAndroidAdaptiveIconXml,
} from './android-app-icon-preset.js';

export interface SourceAsset {
  readonly format: SourceFormat;
  readonly bytes: Uint8Array;
  readonly name?: string;
}
export interface GenerateBundleRequest {
  readonly config: IconKitConfig;
  readonly source?: SourceAsset;
  readonly includeZip?: boolean;
}
export interface GeneratePresetRequest extends GenerateBundleRequest {
  readonly presetId: PresetId;
}
export interface RenderAssetRequest extends GenerateBundleRequest {
  readonly width: number;
  readonly height: number;
  readonly format?: 'png' | 'svg';
  readonly maskable?: boolean;
}
export interface RenderResult {
  readonly bytes: Uint8Array;
  readonly format: 'png' | 'svg';
  readonly width: number;
  readonly height: number;
}
export interface GeneratedBundle {
  readonly files: readonly GeneratedFile[];
  readonly manifest: GeneratedFile;
  readonly config: GeneratedFile;
  readonly zip?: Uint8Array;
}

export function listPresets(): readonly PresetDefinition[] {
  return structuredClone([
    ...registry.presets,
    ANDROID_APP_ICON_PRESET,
  ]) as PresetDefinition[];
}
function failure(
  code: string,
  message: string,
  suggestion: string,
): ValidationResult<never> {
  return {
    valid: false,
    diagnostics: [{ severity: 'error', code, message, suggestion }],
  };
}
export async function hashBytes(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    Uint8Array.from(bytes).buffer,
  );
  return Array.from(new Uint8Array(digest), (value) =>
    value.toString(16).padStart(2, '0'),
  ).join('');
}
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([key, item]) => [key, canonical(item)]),
    );
  return value;
}
export function serializeConfig(config: IconKitConfig): Uint8Array {
  return new TextEncoder().encode(
    `${JSON.stringify(canonical(config), null, 2)}\n`,
  );
}

interface Prepared {
  config: IconKitConfig;
  width: number;
  height: number;
  svg?: SvgAsset;
  dataUrl?: string;
  source?: SourceAsset;
}
async function prepare(
  request: GenerateBundleRequest,
): Promise<ValidationResult<Prepared>> {
  const validated = validateConfig(request.config);
  if (!validated.valid || !validated.value)
    return { valid: false, diagnostics: validated.diagnostics };
  const config = validated.value;
  if (config.source.kind === 'catalog-icon') {
    if (config.source.catalogVersion !== LUCIDE_CATALOG_VERSION)
      return failure(
        'CATALOG_VERSION_UNAVAILABLE',
        'This config references a different Lucide catalog version.',
        `Use catalog version ${LUCIDE_CATALOG_VERSION} or migrate the config.`,
      );
    const icon = getCatalogIcon(config.source.id);
    if (!icon)
      return failure(
        'CATALOG_ICON_UNKNOWN',
        'The selected catalog icon is not in this IconKit build.',
        'Choose an icon from the bundled catalog.',
      );
    const svg = inspectSvg(icon.svg);
    if (!svg.value) return { valid: false, diagnostics: svg.diagnostics };
    return {
      valid: true,
      value: {
        config,
        width: svg.value.width,
        height: svg.value.height,
        svg: svg.value,
      },
      diagnostics: [],
    };
  }
  const { source } = request;
  if (!source)
    return failure(
      'INPUT_SOURCE_REQUIRED',
      'File-source configs require source bytes.',
      'Provide the SVG or PNG file referenced by the config.',
    );
  if (source.bytes.length > 5 * 1024 * 1024)
    return failure(
      'INPUT_FILE_TOO_LARGE',
      'The source exceeds 5 MiB.',
      'Export a smaller source file.',
    );
  if (config.source.format !== source.format)
    return failure(
      'INPUT_FORMAT_MISMATCH',
      'Source bytes and config formats differ.',
      'Select the correct source format.',
    );
  if (
    config.source.sha256 &&
    config.source.sha256.toLowerCase() !== (await hashBytes(source.bytes))
  )
    return failure(
      'INPUT_HASH_MISMATCH',
      'The source has changed since this config was saved.',
      'Restore the original source or update the source hash.',
    );
  if (source.format === 'svg') {
    const svg = inspectSvg(new TextDecoder().decode(source.bytes));
    if (!svg.valid || !svg.value)
      return { valid: false, diagnostics: svg.diagnostics };
    return {
      valid: true,
      value: {
        config,
        width: svg.value.width,
        height: svg.value.height,
        svg: svg.value,
        source,
      },
      diagnostics: [],
    };
  }
  const raster = await decodePng(source.bytes);
  if (!raster.valid || !raster.value)
    return { valid: false, diagnostics: raster.diagnostics };
  const normalized = encodeRgbaPng(
    raster.value.width,
    raster.value.height,
    raster.value.pixels,
  );
  if (!normalized.value)
    return { valid: false, diagnostics: normalized.diagnostics };
  let binary = '';
  for (let i = 0; i < normalized.value.length; i += 8192)
    binary += String.fromCharCode(...normalized.value.subarray(i, i + 8192));
  return {
    valid: true,
    value: {
      config,
      width: raster.value.width,
      height: raster.value.height,
      dataUrl: `data:image/png;base64,${btoa(binary)}`,
      source,
    },
    diagnostics: [],
  };
}

function compose(
  source: Prepared,
  mode?:
    | 'android-foreground'
    | 'android-legacy'
    | 'android-play'
    | 'android-round'
    | 'ios'
    | 'maskable',
): ValidationResult<string> {
  let canvas: Canvas = source.config.canvas;
  const diagnostics: Diagnostic[] = [];
  if (mode === 'maskable') {
    const aspect = Math.max(
      source.width / source.height,
      source.height / source.width,
    );
    const padding = Math.max(
      canvas.padding,
      (1 - 0.8 / Math.sqrt(1 + 1 / aspect ** 2)) / 2,
    );
    if (padding > canvas.padding)
      diagnostics.push({
        severity: 'warning',
        code: 'PWA_MASKABLE_SAFE_AREA_ADJUSTED',
        message:
          'Maskable icons use extra padding to keep the artwork inside the safe area.',
        suggestion: 'Review the maskable preview.',
        details: { requestedPadding: canvas.padding, appliedPadding: padding },
      });
    canvas = { ...canvas, padding };
  }
  if (mode === 'ios') {
    if (canvas.background.type === 'transparent') {
      canvas = { ...canvas, background: { type: 'solid', color: '#FFFFFF' } };
      diagnostics.push({
        severity: 'warning',
        code: 'IOS_OPAQUE_BACKGROUND_APPLIED',
        message:
          'iOS app icons cannot contain transparency, so a white background was applied.',
        suggestion:
          'Choose a solid or gradient background to control the iOS result.',
      });
    }
    if (canvas.shape.type !== 'square') {
      canvas = { ...canvas, shape: { type: 'square' } };
      diagnostics.push({
        severity: 'warning',
        code: 'IOS_SQUARE_CANVAS_APPLIED',
        message:
          'iOS app icon artwork must fill a square canvas without a precomposed mask.',
        suggestion: 'iOS applies the final corner mask on the device.',
      });
    }
  }
  if (mode?.startsWith('android-')) {
    const padding = Math.max(canvas.padding, ANDROID_SAFE_PADDING);
    if (padding > canvas.padding)
      diagnostics.push({
        severity: 'warning',
        code: 'ANDROID_ADAPTIVE_SAFE_AREA_ADJUSTED',
        message:
          'Android artwork uses extra padding to remain inside the guaranteed adaptive-icon safe area.',
        suggestion: 'Review the Android launcher-mask previews.',
        details: { requestedPadding: canvas.padding, appliedPadding: padding },
      });
    canvas = { ...canvas, padding };
    if (mode === 'android-foreground')
      canvas = {
        ...canvas,
        background: { type: 'transparent' },
        shape: { type: 'square' },
      };
    if (mode === 'android-round')
      canvas = { ...canvas, shape: { type: 'circle' } };
    if (mode === 'android-play') {
      if (canvas.background.type === 'transparent') {
        canvas = { ...canvas, background: { type: 'solid', color: '#FFFFFF' } };
        diagnostics.push({
          severity: 'warning',
          code: 'ANDROID_OPAQUE_BACKGROUND_APPLIED',
          message:
            'Android adaptive and Play icons need a full background, so white was applied.',
          suggestion:
            'Choose a solid or gradient background to control the Android result.',
        });
      }
      if (canvas.shape.type !== 'square')
        diagnostics.push({
          severity: 'info',
          code: 'ANDROID_SHAPE_IGNORED',
          message:
            'Android applies launcher masks, so the shared canvas shape is ignored for adaptive and Play icons.',
          suggestion: 'Review the Android output under several launcher masks.',
        });
      canvas = { ...canvas, shape: { type: 'square' } };
    }
  }
  if (source.svg) {
    const result = composeSvg(source.svg, canvas);
    return result.value
      ? { valid: true, value: result.value.svg, diagnostics }
      : { valid: false, diagnostics: result.diagnostics };
  }
  const layout = computeContainFitLayout(source, canvas.padding);
  const background = renderSvgBackground(canvas.background);
  const clip = renderSvgCanvasClip(canvas.shape);
  if (!layout.value || !background.value || !clip.value)
    return {
      valid: false,
      diagnostics: [
        ...layout.diagnostics,
        ...background.diagnostics,
        ...clip.diagnostics,
      ],
    };
  const { x, y, width, height } = layout.value.artwork;
  // Only internally generated data URLs enter this markup. Uploaded SVGs never get this exception.
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 1 1"><defs>${background.value.defs}${clip.value.defs}</defs>${clip.value.contentOpen}${background.value.content}<image x="${x}" y="${y}" width="${width}" height="${height}" xlink:href="${source.dataUrl}"/>${clip.value.contentClose}</svg>`;
  return { valid: true, value: svg, diagnostics };
}

function composeAndroidBackground(source: Prepared): ValidationResult<string> {
  const diagnostics: Diagnostic[] = [];
  let background = source.config.canvas.background;
  if (background.type === 'transparent') {
    background = { type: 'solid', color: '#FFFFFF' };
    diagnostics.push({
      severity: 'warning',
      code: 'ANDROID_OPAQUE_BACKGROUND_APPLIED',
      message:
        'Android adaptive and Play icons need a full background, so white was applied.',
      suggestion:
        'Choose a solid or gradient background to control the Android result.',
    });
  }
  const rendered = renderSvgBackground(background);
  if (!rendered.value)
    return { valid: false, diagnostics: rendered.diagnostics };
  return {
    valid: true,
    value: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><defs>${rendered.value.defs}</defs>${rendered.value.content}</svg>`,
    diagnostics,
  };
}

function uniqueDiagnostics(items: readonly Diagnostic[]): Diagnostic[] {
  return items.filter(
    (item, index) =>
      items.findIndex((other) => other.code === item.code) === index,
  );
}

async function generatedFile(
  path: string,
  format: GeneratedFile['format'],
  dimensions: GeneratedFile['dimensions'],
  bytes: Uint8Array,
  preset: PresetDefinition,
): Promise<GeneratedFile> {
  return {
    path,
    format,
    dimensions,
    bytes,
    sha256: await hashBytes(bytes),
    presetId: preset.id,
    presetVersion: preset.version,
  };
}

async function generateAndroidPreset(
  source: Prepared,
  preset: PresetDefinition,
): Promise<ValidationResult<readonly GeneratedFile[]>> {
  const diagnostics: Diagnostic[] = [];
  const files: GeneratedFile[] = [];
  const foregroundBySize = new Map<number, Uint8Array>();
  const compositions = new Map<string, string>();
  const composition = (role: string): ValidationResult<string> => {
    const cached = compositions.get(role);
    if (cached) return { valid: true, value: cached, diagnostics: [] };
    const result =
      role === 'background'
        ? composeAndroidBackground(source)
        : compose(
            source,
            `android-${role}` as
              | 'android-foreground'
              | 'android-legacy'
              | 'android-play'
              | 'android-round',
          );
    if (result.value) compositions.set(role, result.value);
    diagnostics.push(...result.diagnostics);
    return result;
  };
  for (const output of preset.outputs) {
    const role = String(output.options?.androidRole);
    const size = output.dimensions[0]!.width;
    let bytes: Uint8Array;
    if (role === 'monochrome') {
      let foreground = foregroundBySize.get(size);
      if (!foreground) {
        const svg = composition('foreground');
        if (!svg.value) return { valid: false, diagnostics: svg.diagnostics };
        const rendered = renderSvgToPng(svg.value, size);
        if (!rendered.value)
          return { valid: false, diagnostics: rendered.diagnostics };
        foreground = rendered.value.bytes;
        foregroundBySize.set(size, foreground);
      }
      const monochrome = createMonochromePng(foreground);
      if (!monochrome.value)
        return { valid: false, diagnostics: monochrome.diagnostics };
      bytes = monochrome.value.bytes;
      if (monochrome.value.solidRectangle)
        diagnostics.push({
          severity: 'warning',
          code: 'ANDROID_MONOCHROME_REVIEW_REQUIRED',
          message:
            'The source alpha mask forms a solid rectangle and may produce a solid themed icon.',
          suggestion:
            'Review the themed preview or use artwork with a transparent silhouette.',
        });
    } else {
      const svg = composition(role);
      if (!svg.value) return { valid: false, diagnostics: svg.diagnostics };
      const rendered = renderSvgToPng(svg.value, size);
      if (!rendered.value)
        return { valid: false, diagnostics: rendered.diagnostics };
      bytes = rendered.value.bytes;
      if (role === 'foreground') foregroundBySize.set(size, bytes);
      if (role === 'play') {
        const srgb = addPngSrgbChunk(bytes);
        if (!srgb.value) return { valid: false, diagnostics: srgb.diagnostics };
        bytes = srgb.value;
        if (bytes.length > ANDROID_PLAY_ICON_MAX_BYTES)
          return failure(
            'ANDROID_PLAY_ICON_TOO_LARGE',
            'The Google Play listing icon exceeds 1024KB.',
            'Simplify the artwork or gradient before exporting.',
          );
      }
    }
    files.push(
      await generatedFile(
        `${output.outputDirectory}/${output.filename}`,
        output.format,
        output.dimensions,
        bytes,
        preset,
      ),
    );
  }
  const xml = serializeAndroidAdaptiveIconXml();
  for (const filename of ['ic_launcher.xml', 'ic_launcher_round.xml'])
    files.push(
      await generatedFile(
        `android/app/src/main/res/mipmap-anydpi-v26/${filename}`,
        'xml',
        [],
        xml,
        preset,
      ),
    );
  return {
    valid: true,
    value: files,
    diagnostics: uniqueDiagnostics(diagnostics),
  };
}

export async function renderAsset(
  request: RenderAssetRequest,
): Promise<ValidationResult<RenderResult>> {
  if (
    !Number.isInteger(request.width) ||
    request.width < 1 ||
    request.width > 4096 ||
    request.width !== request.height
  )
    return failure(
      'RENDER_INVALID_SIZE',
      'Output must be square, from 1 to 4096 pixels.',
      'Use equal whole-number width and height.',
    );
  const prepared = await prepare(request);
  if (!prepared.value)
    return { valid: false, diagnostics: prepared.diagnostics };
  const composed = compose(
    prepared.value,
    request.maskable ? 'maskable' : undefined,
  );
  if (!composed.value)
    return { valid: false, diagnostics: composed.diagnostics };
  const format = request.format ?? 'png';
  if (format === 'svg' && !prepared.value.svg)
    return failure(
      'VECTOR_EXPORT_UNAVAILABLE',
      'PNG sources cannot produce vector output.',
      'Select PNG output or use an SVG source.',
    );
  const rendered =
    format === 'svg'
      ? {
          bytes: new TextEncoder().encode(
            composed.value.replace(
              'viewBox="0 0 1 1"',
              `width="${request.width}" height="${request.height}" viewBox="0 0 1 1"`,
            ),
          ),
        }
      : renderSvgToPng(composed.value, request.width);
  const bytes = 'bytes' in rendered ? rendered.bytes : rendered.value?.bytes;
  if (!bytes)
    return {
      valid: false,
      diagnostics: 'diagnostics' in rendered ? rendered.diagnostics : [],
    };
  return {
    valid: true,
    value: { bytes, format, width: request.width, height: request.height },
    diagnostics: composed.diagnostics,
  };
}

async function generatePrepared(
  source: Prepared,
  presetId: PresetId,
): Promise<ValidationResult<readonly GeneratedFile[]>> {
  const preset = listPresets().find((item) => item.id === presetId);
  if (!preset)
    return failure(
      'PRESET_UNKNOWN',
      'Unknown preset.',
      'Use iconkit presets to list supported targets.',
    );
  if (presetId === 'android-app-icon')
    return generateAndroidPreset(source, preset);
  const files: GeneratedFile[] = [];
  const diagnostics: Diagnostic[] = [];
  const cache = new Map<string, Uint8Array>();
  for (const output of preset.outputs) {
    const maskable = output.options?.purpose === 'maskable';
    const mode =
      presetId === 'ios-app-icon' ? 'ios' : maskable ? 'maskable' : undefined;
    const composition = compose(source, mode);
    if (!composition.value)
      return { valid: false, diagnostics: composition.diagnostics };
    diagnostics.push(...composition.diagnostics);
    const images: { bytes: Uint8Array }[] = [];
    for (const dimension of output.dimensions) {
      const key = `${mode ?? 'standard'}:${dimension.width}`;
      let bytes = cache.get(key);
      if (!bytes) {
        const rendered = renderSvgToPng(composition.value, dimension.width);
        if (!rendered.value)
          return { valid: false, diagnostics: rendered.diagnostics };
        if (presetId === 'ios-app-icon') {
          const opaque = removeOpaquePngAlpha(rendered.value.bytes);
          if (!opaque.value)
            return { valid: false, diagnostics: opaque.diagnostics };
          bytes = opaque.value;
        } else bytes = rendered.value.bytes;
        cache.set(key, bytes);
      }
      images.push({ bytes });
    }
    const encoded =
      output.format === 'ico'
        ? encodeIco(images)
        : { value: images[0]!.bytes, diagnostics: [] };
    if (!encoded.value)
      return { valid: false, diagnostics: encoded.diagnostics };
    files.push({
      path: `${output.outputDirectory}/${output.filename}`,
      format: output.format,
      dimensions: output.dimensions,
      bytes: encoded.value,
      sha256: await hashBytes(encoded.value),
      presetId,
      presetVersion: preset.version,
    });
  }
  if (presetId === 'ios-app-icon') {
    const bytes = serializeIosAppIconContents(preset.outputs);
    files.push({
      path: 'ios/AppIcon.appiconset/Contents.json',
      format: 'json',
      dimensions: [],
      bytes,
      sha256: await hashBytes(bytes),
      presetId,
      presetVersion: preset.version,
    });
  }
  return {
    valid: true,
    value: files,
    diagnostics: uniqueDiagnostics(diagnostics),
  };
}

export async function generatePreset(
  request: GeneratePresetRequest,
): Promise<ValidationResult<readonly GeneratedFile[]>> {
  const source = await prepare(request);
  return source.value
    ? generatePrepared(source.value, request.presetId)
    : { valid: false, diagnostics: source.diagnostics };
}

export async function generateBundle(
  request: GenerateBundleRequest,
): Promise<ValidationResult<GeneratedBundle>> {
  const prepared = await prepare(request);
  if (!prepared.value)
    return { valid: false, diagnostics: prepared.diagnostics };
  const files: GeneratedFile[] = [];
  const diagnostics: Diagnostic[] = [];
  for (const id of prepared.value.config.targets) {
    const result = await generatePrepared(prepared.value, id);
    if (!result.value) return { valid: false, diagnostics: result.diagnostics };
    files.push(...result.value);
    diagnostics.push(...result.diagnostics);
  }
  const makeFile = async (
    path: string,
    format: GeneratedFile['format'],
    bytes: Uint8Array,
  ): Promise<GeneratedFile> => ({
    path,
    format,
    bytes,
    dimensions: [],
    sha256: await hashBytes(bytes),
  });
  if (request.config.vectorOutput !== 'never') {
    if (prepared.value.svg) {
      const composition = compose(prepared.value);
      if (!composition.value)
        return { valid: false, diagnostics: composition.diagnostics };
      files.push(
        await makeFile(
          'iconkit.svg',
          'svg',
          new TextEncoder().encode(composition.value),
        ),
      );
    } else
      diagnostics.push({
        severity: 'info',
        code: 'VECTOR_EXPORT_UNAVAILABLE',
        message: 'PNG sources remain raster-only.',
        suggestion: 'Use an SVG source for additional vector output.',
      });
  }
  let portableConfig = prepared.value.config;
  if (prepared.value.source) {
    const sourcePath = `source/input.${prepared.value.source.format}`;
    files.push(
      await makeFile(
        sourcePath,
        prepared.value.source.format,
        prepared.value.source.bytes,
      ),
    );
    portableConfig = {
      ...prepared.value.config,
      source: {
        kind: 'file',
        path: sourcePath,
        format: prepared.value.source.format,
        sha256: await hashBytes(prepared.value.source.bytes),
      },
    };
  } else {
    files.push(
      await makeFile(
        'THIRD_PARTY_NOTICES.txt',
        'txt',
        new TextEncoder().encode(LUCIDE_NOTICE),
      ),
    );
  }
  const config = await makeFile(
    'iconkit.config.json',
    'json',
    serializeConfig(portableConfig),
  );
  files.push(config);
  const manifestResult = createGeneratedFileManifest(files);
  if (!manifestResult.value)
    return { valid: false, diagnostics: manifestResult.diagnostics };
  const manifest = await makeFile(
    'iconkit.manifest.json',
    'json',
    serializeGeneratedFileManifest(manifestResult.value),
  );
  let zip: Uint8Array | undefined;
  if (request.includeZip) {
    const archived = createZipBundle(files);
    if (!archived.value)
      return { valid: false, diagnostics: archived.diagnostics };
    zip = archived.value.bytes;
  }
  return {
    valid: true,
    value: {
      files: [...files, manifest],
      config,
      manifest,
      ...(zip ? { zip } : {}),
    },
    diagnostics,
  };
}
