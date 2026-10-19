# GitHub Actions recipe

IconKit can validate a checked-in config and generate a downloadable asset
bundle in CI. Keep the config and its referenced SVG or PNG source in the
repository, and pin the CLI to an exact published version so a dependency
update cannot change generated output unexpectedly.

Save this workflow as `.github/workflows/iconkit-assets.yml`:

```yaml
name: Generate IconKit assets

on:
  workflow_dispatch:
  push:
    paths:
      - '.github/workflows/iconkit-assets.yml'
      - 'brand/logo.svg'
      - 'iconkit.config.json'

permissions:
  contents: read

env:
  # Replace X.Y.Z with the exact IconKit CLI version reviewed by your project.
  ICONKIT_CLI_VERSION: 'X.Y.Z'

jobs:
  generate:
    runs-on: ubuntu-latest
    timeout-minutes: 10

    steps:
      - name: Check out repository
        uses: actions/checkout@v7

      - name: Set up Node.js
        uses: actions/setup-node@v7
        with:
          node-version: '24.11.1'

      - name: Enable Corepack
        run: corepack enable

      - name: Validate IconKit config
        run: >-
          corepack pnpm dlx "@icon-kit/cli@${ICONKIT_CLI_VERSION}"
          validate --config iconkit.config.json

      - name: Generate asset bundle
        run: >-
          corepack pnpm dlx "@icon-kit/cli@${ICONKIT_CLI_VERSION}"
          generate --config iconkit.config.json
          --out iconkit-output --zip

      - name: Upload generated assets
        uses: actions/upload-artifact@v7
        with:
          name: iconkit-assets
          path: iconkit-output/
          if-no-files-found: error
```

The config resolves a file source relative to the config file, so a config at
the repository root with `"path": "brand/logo.svg"` uses the path shown in the
workflow. Adjust both path filters when your files live elsewhere. Catalog-icon
configs need no source-file path.

The job fails when config validation or generation fails. On success, the
artifact contains the generated files, portable config, manifest, source copy
for file configs, and `iconkit.zip`.

This recipe creates a CI artifact. IconKit does not yet provide a `--check`
mode for comparing checked-in generated assets; that remains planned work.
