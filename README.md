# IconKit

IconKit is a local-first brand asset generator for developers. Give it an SVG
or PNG logo and it creates reproducible favicon, PWA, and Chrome extension
asset packs from one shared engine.

## Current status

The first end-to-end alpha is implemented:

- `@icon-kit/core` validates inputs, composes artwork, renders exact PNG and ICO
  outputs, generates manifests, and creates deterministic ZIP archives.
- `@icon-kit/cli` generates asset directories or ZIPs from a source file or a
  saved config.
- `@icon-kit/web` provides local browser previews and downloads. Source files
  stay in the browser and are not uploaded.

SVG, PNG, and a curated offline catalog of 170 Lucide icons are supported. The
alpha presets are `web-favicon`, `pwa`, `ios-app-icon`, and
`chrome-extension`. Android packaging remains follow-up work.

## Quick start

IconKit uses Node.js `24.11.1` and pnpm `11.22.0` through Corepack.

```sh
nvm install
corepack enable
corepack pnpm install
```

Generate all four asset groups:

```sh
corepack pnpm start -- generate --source fixtures/svg/simple.svg --out iconkit-output --zip
```

Run the browser app:

```sh
corepack pnpm dev
```

Run the complete quality gate:

```sh
corepack pnpm run lint
corepack pnpm run typecheck
corepack pnpm run test
corepack pnpm run build
corepack pnpm run format:check
```

## Documentation

- [CLI reference](packages/cli/README.md)
- [Core API](packages/core/README.md)
- [Web app](apps/web/README.md)
- [Configuration reference](docs/configuration.md)
- [Preset and output reference](docs/presets.md)
- [Manual test plan](docs/manual-testing.md)
- [Product requirements](outputs/iconkit-mvp-prd.md)
- [Phased roadmap](outputs/iconkit-phased-requirements.md)
- [Contributing](CONTRIBUTING.md)

## Workspace

- `packages/core`: portable validation, rendering, presets, and archives
- `packages/cli`: filesystem and terminal adapter
- `apps/web`: local browser composer, previews, and downloads

## License

[MIT](LICENSE)
