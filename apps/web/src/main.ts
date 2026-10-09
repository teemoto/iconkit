import './style.css';
import {
  generateBundle,
  getCatalogIcon,
  hashBytes,
  initializePngDecoder,
  initializeSvgRasterizer,
  inspectPng,
  inspectSvg,
  listCatalogIcons,
  listPresets,
  LUCIDE_CATALOG_VERSION,
  renderAsset,
  serializeConfig,
  validateConfig,
  type Diagnostic,
  type GeneratedBundle,
  type IconKitConfig,
  type PresetId,
  type SourceFormat,
} from '@icon-kit/core';
import resvgUrl from '@icon-kit/core/wasm/resvg.wasm?url';
import pngUrl from '@icon-kit/core/wasm/png.wasm?url';

const element = <T extends HTMLElement>(id: string) =>
  document.getElementById(id) as T;
const sourceInput = element<HTMLInputElement>('source');
const configInput = element<HTMLInputElement>('import-config');
const background = element<HTMLSelectElement>('background');
const colorFrom = element<HTMLInputElement>('color-from');
const colorTo = element<HTMLInputElement>('color-to');
const angle = element<HTMLInputElement>('angle');
const padding = element<HTMLInputElement>('padding');
const shape = element<HTMLSelectElement>('shape');
const radius = element<HTMLInputElement>('radius');
const iconColor = element<HTMLInputElement>('icon-color');
const safeGuide = element<HTMLInputElement>('safe-guide');
const catalogSearch = element<HTMLInputElement>('catalog-search');
const catalogGrid = element<HTMLDivElement>('catalog-grid');
const download = element<HTMLButtonElement>('download');
const downloadConfig = element<HTMLButtonElement>('download-config');
const status = element<HTMLDivElement>('status');
const diagnostics = element<HTMLUListElement>('diagnostics');
const heroImage = element<HTMLImageElement>('hero-image');
const tabImage = element<HTMLImageElement>('tab-image');
const homeImage = element<HTMLImageElement>('home-image');
const extensionImage = element<HTMLImageElement>('extension-image');
const emptyPreview = element<HTMLDivElement>('empty-preview');
const dropzone = element<HTMLLabelElement>('dropzone');
const presetContainer = element<HTMLDivElement>('presets');
const urls = new Set<string>();
let file: File | undefined;
let catalogId: string | undefined;
let loadedConfig: IconKitConfig | undefined;
let latestBundle: GeneratedBundle | undefined;
let generation = 0;
const ready = Promise.all([
  fetch(resvgUrl)
    .then((response) => response.arrayBuffer())
    .then(initializeSvgRasterizer),
  fetch(pngUrl)
    .then((response) => response.arrayBuffer())
    .then(initializePngDecoder),
]).then(() => undefined);

const presetSizes: Record<PresetId, string> = {
  'web-favicon': '5 files',
  pwa: '4 files',
  'ios-app-icon': '14 files',
  'android-app-icon': '28 files',
  'chrome-extension': '4 files',
};
for (const preset of listPresets()) {
  const label = document.createElement('label');
  label.innerHTML = `<input type="checkbox" value="${preset.id}" checked><span>${preset.title}</span><small>${presetSizes[preset.id]}</small>`;
  presetContainer.append(label);
}

const catalog = listCatalogIcons();
function showCatalogMeta(id: string): void {
  const icon = getCatalogIcon(id);
  const container = element<HTMLElement>('source-meta');
  if (!icon) {
    container.textContent = id;
    return;
  }
  const source = document.createElement('a');
  source.href = icon.sourceUrl;
  source.target = '_blank';
  source.rel = 'noreferrer';
  source.textContent = 'source · ISC';
  container.replaceChildren(
    `${icon.title} · Lucide ${icon.catalogVersion} · `,
    source,
  );
}

function renderCatalog(query = ''): void {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const matches = catalog
    .filter((icon) => {
      const values = [icon.id, icon.title.toLowerCase(), ...icon.tags];
      return terms.every((term) =>
        values.some((value) => value.includes(term)),
      );
    })
    .slice(0, 40);
  catalogGrid.replaceChildren(
    ...matches.map((icon) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'catalog-icon';
      button.title = icon.title;
      button.setAttribute('role', 'option');
      button.setAttribute('aria-label', icon.title);
      button.setAttribute('aria-selected', String(icon.id === catalogId));
      button.innerHTML = icon.svg;
      button.addEventListener('click', () => {
        catalogId = icon.id;
        file = undefined;
        sourceInput.value = '';
        loadedConfig = undefined;
        showCatalogMeta(icon.id);
        renderCatalog(catalogSearch.value);
        void update();
      });
      return button;
    }),
  );
}
renderCatalog();

function selectedPresets(): PresetId[] {
  return Array.from(
    presetContainer.querySelectorAll<HTMLInputElement>('input:checked'),
  ).map((input) => input.value as PresetId);
}

function revokeUrls(): void {
  for (const url of urls) URL.revokeObjectURL(url);
  urls.clear();
}

function makeUrl(bytes: Uint8Array, type: string): string {
  const url = URL.createObjectURL(new Blob([Uint8Array.from(bytes)], { type }));
  urls.add(url);
  return url;
}

function save(bytes: Uint8Array, name: string, type: string): void {
  const anchor = document.createElement('a');
  anchor.href = makeUrl(bytes, type);
  anchor.download = name;
  anchor.click();
}

function showDiagnostics(items: readonly Diagnostic[]): void {
  diagnostics.replaceChildren(
    ...items.map((item) => {
      const li = document.createElement('li');
      li.textContent = item.message;
      return li;
    }),
  );
}

function canvasConfig(): IconKitConfig['canvas'] {
  const type = background.value;
  const backgroundValue: IconKitConfig['canvas']['background'] =
    type === 'solid'
      ? { type, color: colorFrom.value }
      : type === 'linear-gradient'
        ? {
            type,
            from: colorFrom.value,
            to: colorTo.value,
            angle: Number(angle.value),
          }
        : { type: 'transparent' };
  const shapeValue: IconKitConfig['canvas']['shape'] =
    shape.value === 'rounded-square'
      ? { type: 'rounded-square', cornerRadius: Number(radius.value) / 100 }
      : shape.value === 'circle'
        ? { type: 'circle' }
        : { type: 'square' };
  return {
    padding: Number(padding.value) / 100,
    background: backgroundValue,
    shape: shapeValue,
    ...(catalogId ? { iconColor: iconColor.value } : {}),
  };
}

function currentConfig(format: SourceFormat = 'svg'): IconKitConfig {
  if (catalogId)
    return {
      version: 1,
      source: {
        kind: 'catalog-icon',
        catalog: 'lucide',
        catalogVersion: LUCIDE_CATALOG_VERSION,
        id: catalogId,
      },
      canvas: canvasConfig(),
      targets: selectedPresets(),
      vectorOutput: 'when-vector-safe',
    };
  const savedHash =
    loadedConfig?.source.kind === 'file' &&
    loadedConfig.source.format === format &&
    loadedConfig.source.sha256
      ? { sha256: loadedConfig.source.sha256 }
      : {};
  return {
    version: 1,
    source: {
      kind: 'file',
      path: `source/input.${format}`,
      format,
      ...savedHash,
    },
    canvas: canvasConfig(),
    targets: selectedPresets(),
    vectorOutput: 'when-vector-safe',
  };
}

function applyConfig(config: IconKitConfig): void {
  loadedConfig = config;
  catalogId =
    config.source.kind === 'catalog-icon' ? config.source.id : undefined;
  file = undefined;
  sourceInput.value = '';
  padding.value = String(Math.round(config.canvas.padding * 100));
  background.value = config.canvas.background.type;
  if (config.canvas.background.type === 'solid')
    colorFrom.value = config.canvas.background.color;
  if (config.canvas.background.type === 'linear-gradient') {
    colorFrom.value = config.canvas.background.from;
    colorTo.value = config.canvas.background.to;
    angle.value = String(config.canvas.background.angle);
  }
  shape.value = config.canvas.shape.type;
  if (config.canvas.shape.type === 'rounded-square')
    radius.value = String(Math.round(config.canvas.shape.cornerRadius * 100));
  if (config.canvas.iconColor) iconColor.value = config.canvas.iconColor;
  for (const input of presetContainer.querySelectorAll<HTMLInputElement>(
    'input',
  ))
    input.checked = config.targets.includes(input.value as PresetId);
  syncControls();
  renderCatalog(catalogSearch.value);
}

function syncControls(): void {
  const gradient = background.value === 'linear-gradient';
  const transparent = background.value === 'transparent';
  element<HTMLElement>('color-fields').hidden = transparent;
  element<HTMLElement>('color-to-field').hidden = !gradient;
  element<HTMLElement>('angle-field').hidden = !gradient;
  element<HTMLElement>('radius-field').hidden =
    shape.value !== 'rounded-square';
  element<HTMLElement>('icon-color-field').hidden = !catalogId;
  element<HTMLElement>('color-help').textContent = catalogId
    ? 'Catalog icons can be recolored and remain vector-safe.'
    : 'Original artwork colors are preserved.';
  element<HTMLElement>('safe-area-guide').hidden =
    !safeGuide.checked || (!file && !catalogId);
  element<HTMLElement>('color-label').textContent = gradient
    ? 'Start color'
    : 'Background color';
  element<HTMLOutputElement>('padding-value').value = `${padding.value}%`;
  element<HTMLOutputElement>('radius-value').value = `${radius.value}%`;
  element<HTMLOutputElement>('angle-value').value = `${angle.value}°`;
}

async function update(): Promise<void> {
  syncControls();
  const run = ++generation;
  if (!file && !catalogId) {
    latestBundle = undefined;
    download.disabled = true;
    downloadConfig.disabled = true;
    element<HTMLElement>('file-count').textContent = '—';
    element<HTMLElement>('output-total').textContent = '';
    element<HTMLUListElement>('output-files').replaceChildren();
    status.textContent = 'Choose a source or try the sample to begin.';
    status.classList.remove('error');
    showDiagnostics([]);
    revokeUrls();
    for (const image of [heroImage, tabImage, homeImage, extensionImage])
      image.hidden = true;
    emptyPreview.hidden = false;
    return;
  }
  if (!selectedPresets().length) {
    status.textContent = 'Select at least one asset preset.';
    status.classList.add('error');
    download.disabled = true;
    return;
  }
  status.textContent = 'Generating your previews…';
  status.classList.remove('error');
  download.disabled = true;
  try {
    await ready;
    const format: SourceFormat =
      !file ||
      file.type.includes('svg') ||
      file.name.toLowerCase().endsWith('.svg')
        ? 'svg'
        : 'png';
    const source = file
      ? {
          format,
          bytes: new Uint8Array(await file.arrayBuffer()),
          name: file.name,
        }
      : undefined;
    const config = currentConfig(format);
    const [bundleResult, heroResult, tabResult] = await Promise.all([
      generateBundle({
        config,
        ...(source ? { source } : {}),
        includeZip: true,
      }),
      renderAsset({
        config,
        ...(source ? { source } : {}),
        width: 512,
        height: 512,
      }),
      renderAsset({
        config,
        ...(source ? { source } : {}),
        width: 16,
        height: 16,
      }),
    ]);
    if (run !== generation) return;
    if (!bundleResult.value || !heroResult.value || !tabResult.value) {
      const items = [
        ...bundleResult.diagnostics,
        ...heroResult.diagnostics,
        ...tabResult.diagnostics,
      ];
      showDiagnostics(items);
      status.textContent = items[0]?.message ?? 'Generation failed.';
      status.classList.add('error');
      return;
    }
    latestBundle = bundleResult.value;
    revokeUrls();
    heroImage.src = makeUrl(heroResult.value.bytes, 'image/png');
    tabImage.src = makeUrl(tabResult.value.bytes, 'image/png');
    const home =
      bundleResult.value.files.find(
        (item) => item.path === 'ios/AppIcon.appiconset/AppIcon-180.png',
      ) ??
      bundleResult.value.files.find(
        (item) => item.path === 'pwa/icons/icon-192.png',
      ) ??
      heroResult.value;
    homeImage.src = makeUrl(home.bytes, 'image/png');
    const extension =
      bundleResult.value.files.find(
        (item) => item.path === 'chrome-extension/icons/icon-16.png',
      ) ?? tabResult.value;
    extensionImage.src = makeUrl(extension.bytes, 'image/png');
    for (const image of [heroImage, tabImage, homeImage, extensionImage])
      image.hidden = false;
    emptyPreview.hidden = true;
    const files = bundleResult.value.files;
    element<HTMLElement>('file-count').textContent = `${files.length} files`;
    element<HTMLElement>('output-total').textContent = `${files.length} files`;
    element<HTMLUListElement>('output-files').replaceChildren(
      ...files.map((item) => {
        const li = document.createElement('li');
        li.textContent = item.path;
        return li;
      }),
    );
    showDiagnostics(bundleResult.diagnostics);
    status.textContent = 'Your asset kit is ready.';
    download.disabled = false;
    downloadConfig.disabled = false;
    loadedConfig = config;
  } catch (error) {
    if (run !== generation) return;
    status.textContent =
      error instanceof Error ? error.message : 'Generation failed.';
    status.classList.add('error');
  }
}

async function acceptFile(next: File): Promise<void> {
  const name = next.name.toLowerCase();
  if (
    (!name.endsWith('.svg') && !name.endsWith('.png')) ||
    next.size > 5 * 1024 * 1024
  ) {
    status.textContent = 'Choose an SVG or PNG no larger than 5 MiB.';
    status.classList.add('error');
    return;
  }
  const bytes = new Uint8Array(await next.arrayBuffer());
  const format: SourceFormat = name.endsWith('.svg') ? 'svg' : 'png';
  const inspected =
    format === 'svg'
      ? inspectSvg(new TextDecoder().decode(bytes))
      : inspectPng(bytes);
  if (!inspected.value) {
    showDiagnostics(inspected.diagnostics);
    status.textContent =
      inspected.diagnostics[0]?.message ?? 'The source is invalid.';
    status.classList.add('error');
    return;
  }
  file = next;
  catalogId = undefined;
  renderCatalog(catalogSearch.value);
  const alpha =
    format === 'png' && 'hasAlpha' in inspected.value
      ? inspected.value.hasAlpha
        ? 'alpha channel'
        : 'opaque'
      : 'vector';
  element<HTMLElement>('source-meta').textContent =
    `${next.name} · ${inspected.value.width}×${inspected.value.height} · ${alpha} · ${(next.size / 1024).toFixed(1)} KiB`;
  await update();
}

function resetStyle(): void {
  background.value = 'solid';
  colorFrom.value = '#e66b43';
  colorTo.value = '#f6c27a';
  angle.value = '135';
  padding.value = '18';
  shape.value = 'rounded-square';
  radius.value = '22';
  iconColor.value = '#fff7e9';
  void update();
}

for (const input of [
  background,
  colorFrom,
  colorTo,
  angle,
  padding,
  shape,
  radius,
  iconColor,
])
  input.addEventListener('input', () => void update());
safeGuide.addEventListener('change', syncControls);
catalogSearch.addEventListener('input', () =>
  renderCatalog(catalogSearch.value),
);
presetContainer.addEventListener('change', () => void update());
sourceInput.addEventListener('change', () => {
  if (sourceInput.files?.[0]) void acceptFile(sourceInput.files[0]);
});
for (const event of ['dragenter', 'dragover'])
  dropzone.addEventListener(event, (current) => {
    current.preventDefault();
    dropzone.classList.add('dragging');
  });
for (const event of ['dragleave', 'drop'])
  dropzone.addEventListener(event, (current) => {
    current.preventDefault();
    dropzone.classList.remove('dragging');
  });
dropzone.addEventListener('drop', (event) => {
  const dropped = event.dataTransfer?.files[0];
  if (dropped) void acceptFile(dropped);
});
element<HTMLButtonElement>('clear').addEventListener('click', () => {
  file = undefined;
  catalogId = undefined;
  loadedConfig = undefined;
  sourceInput.value = '';
  element<HTMLElement>('source-meta').textContent = '';
  renderCatalog(catalogSearch.value);
  void update();
});
element<HTMLButtonElement>('reset').addEventListener('click', resetStyle);
element<HTMLButtonElement>('demo').addEventListener('click', () => {
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path fill="#fff7e9" d="M50 4 61 37 96 38 68 59 78 93 50 73 22 93 32 59 4 38 39 37Z"/><circle cx="50" cy="50" r="11" fill="#263d35"/></svg>';
  void acceptFile(
    new File([svg], 'iconkit-sample.svg', { type: 'image/svg+xml' }),
  );
});
configInput.addEventListener('change', async () => {
  const selected = configInput.files?.[0];
  if (!selected) return;
  try {
    const result = validateConfig(JSON.parse(await selected.text()));
    if (!result.value)
      throw new Error(result.diagnostics.map((item) => item.message).join(' '));
    applyConfig(result.value);
    status.textContent =
      result.value.source.kind === 'catalog-icon'
        ? 'Configuration loaded. Recreating the catalog icon now.'
        : 'Configuration loaded. Choose its source file to reproduce the kit.';
    status.classList.remove('error');
    if (result.value.source.kind === 'catalog-icon') {
      showCatalogMeta(result.value.source.id);
      void update();
    }
  } catch (error) {
    status.textContent =
      error instanceof Error
        ? error.message
        : 'The configuration could not be loaded.';
    status.classList.add('error');
  }
});
download.addEventListener('click', () => {
  if (latestBundle?.zip)
    save(latestBundle.zip, 'iconkit.zip', 'application/zip');
});
downloadConfig.addEventListener('click', async () => {
  if (!loadedConfig) return;
  if (catalogId) {
    save(
      serializeConfig(currentConfig()),
      'iconkit.config.json',
      'application/json',
    );
    return;
  }
  if (!file) return;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const format = file.name.toLowerCase().endsWith('.svg') ? 'svg' : 'png';
  const config: IconKitConfig = {
    ...loadedConfig,
    source: {
      kind: 'file',
      path: `source/input.${format}`,
      format,
      sha256: await hashBytes(bytes),
    },
  };
  save(serializeConfig(config), 'iconkit.config.json', 'application/json');
});

syncControls();
void update();
