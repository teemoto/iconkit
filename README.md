# IconKit

An open-source brand asset generator for developers.

IconKit turns an existing logo or a simple icon-based composition into production-ready assets for websites, PWAs, mobile apps, and browser extensions.

## Status

Planning and MVP definition are in progress. The initial product will provide a web interface and CLI backed by the same generation engine.

## Development

IconKit uses Node.js `24.11.1` and pnpm through Corepack. With [nvm](https://github.com/nvm-sh/nvm), install and select the pinned runtime, then install dependencies from the repository root:

```sh
nvm install
corepack enable
corepack pnpm install
```

If you do not use nvm, install Node.js `24.11.1` before enabling Corepack:

```sh
corepack enable
corepack pnpm install
```

## Planning Documents

- [MVP product requirements](outputs/iconkit-mvp-prd.md)
- [Phased requirements roadmap](outputs/iconkit-phased-requirements.md)

## Intended Packages

- `@icon-kit/cli`: primary CLI package, exposing the `iconkit` command
- `@icon-kit/core`: shared generation engine
- `@icon-kit/web`: web application

## License

[MIT](LICENSE)
