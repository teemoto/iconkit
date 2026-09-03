# Contributing to IconKit

Thanks for helping make IconKit a reliable open-source asset generator for developers.

## Before You Start

- Search existing issues and pull requests before opening a new one.
- Open an issue first for substantial changes, new presets, new dependencies, or changes to public configuration and output behavior.
- Keep the MVP focused on deterministic asset generation. AI features, advanced layers, wordmarks, collaboration, and third-party integrations are intentionally deferred.
- Follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## Development Setup

IconKit uses the Node.js version in `.nvmrc` and pnpm through Corepack.

```sh
nvm install
corepack enable
corepack pnpm install
```

Run the full quality suite before opening a pull request:

```sh
corepack pnpm run lint
corepack pnpm run typecheck
corepack pnpm run test
corepack pnpm run build
corepack pnpm run format:check
```

## Project Boundaries

The project is organized as a workspace:

- `packages/core` contains portable configuration, validation, rendering, presets, and export behavior.
- `packages/cli` contains the `iconkit` command and must call public core APIs rather than duplicate generation logic.
- `apps/web` contains the browser composer, previews, and downloads, and must also use public core APIs.

Keep source ingestion secure and deterministic. SVG inputs are untrusted; do not introduce execution, external-resource loading, path traversal, or non-reproducible output.

## Pull Requests

- Make each pull request focused and explain the user-facing effect.
- Add or update tests for behavior changes.
- Update documentation when commands, config, presets, output structure, or compatibility change.
- Preserve compatibility for saved configuration when practical. If a breaking change is necessary, explain its migration path.
- Use clear, imperative commit messages, such as `feat: add PWA preset` or `fix: preserve PNG transparency`.

## Presets and Asset Sources

Changes to target presets must identify the platform source for dimensions, filenames, and required metadata. Bundled icon assets must have a compatible license and clear attribution requirements before they are added.

## Security Issues

Do not report vulnerabilities in public issues. Follow the private reporting instructions in [SECURITY.md](SECURITY.md).
