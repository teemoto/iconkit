# Changelog

Notable changes to the public IconKit packages are recorded here.

## 0.1.0-alpha.1 — 2026-10-26

This release validates tokenless npm publishing for both public packages.

### Changed

- Release publishing now authenticates through npm trusted publishing and
  short-lived GitHub OIDC credentials.
- Registry verification retries while npm processes newly published packages.
- The long-running CLI generation integration test has an explicit CI timeout.

## 0.1.0-alpha.0 — 2026-10-25

The first functional alpha replaces the original CLI placeholder.

### Added

- Deterministic SVG and PNG ingestion, composition, rendering, and ZIP
  generation through `@icon-kit/core`.
- Web favicon, PWA, iOS app icon, Android adaptive icon, and Chrome extension
  presets.
- A curated offline catalog of 170 Lucide 1.50.0 icons with required
  attribution.
- CLI `generate`, `init`, `validate`, and `presets` commands with portable
  configs, JSON reports, collision protection, and explicit overwrite
  behavior.
- A local browser composer with file and catalog workflows, platform previews,
  config export, and ZIP downloads.
- Consumer checks for packed npm tarballs and generated Android resources.

### Security and compatibility

- SVG input is parsed through a fail-closed static allowlist; scripts, external
  resources, animation, fonts, and unsupported filters are rejected.
- PNG dimensions and decoded pixel area are bounded before rendering.
- Generated paths reject traversal, case-insensitive collisions, and symbolic
  link parents.
- Public config and preset contracts start at version 1. Alpha package APIs may
  still change before the stable release.
