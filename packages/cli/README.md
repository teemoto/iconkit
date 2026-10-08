# @icon-kit/cli

Generate reproducible favicon, PWA, and Chrome extension assets from an SVG or
PNG source. The CLI performs all generation locally through `@icon-kit/core`.

## Generate

```sh
iconkit generate --source logo.svg --out assets --zip
iconkit generate --source logo.png --preset web-favicon,pwa --out public
iconkit generate --config iconkit.config.json --out assets
```

Saved configs may reference either a file or a bundled Lucide icon. Catalog
configs generate offline without a separate source file.

Existing generated files are refused by default. Pass `--overwrite` only when
you intend to replace them. The writer rejects traversal, case collisions,
symbolic-link parents, and attempts to replace the input file.

Every output directory contains the original source, a portable
`iconkit.config.json`, and `iconkit.manifest.json`. `--zip` adds
`iconkit.zip`. Running the saved config recreates byte-identical archive
contents when the source and runtime are unchanged.

## Other commands

```sh
iconkit init --source logo.svg
iconkit validate --config iconkit.config.json
iconkit presets
iconkit presets --json
```

`--json` produces machine-readable command results. Exit code `0` means
success, `1` means input/validation/output failure, and `2` means invalid CLI
usage.

Run `iconkit --help` for the complete option list. See the repository
[configuration reference](../../docs/configuration.md) and
[preset reference](../../docs/presets.md) for details.
