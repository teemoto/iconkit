# IconKit MVP PRD

## Document Status

- Product: IconKit
- Type: MVP Product Requirements Document
- Status: Draft
- Date: July 28, 2026
- Model: Free and open-source

## Product Summary

IconKit is an open-source tool for developers who need production-ready icon and app asset packs without spending time on repetitive design-export work. A user can either upload an existing logo or compose a simple mark from an open-source icon plus visual styling controls, then generate correctly sized assets for web, PWA, mobile apps, and browser extensions.

The MVP should solve the practical asset-generation problem first. It should not attempt to become a general-purpose design suite.

## Problem Statement

Developers and small teams regularly lose time generating trivial but required brand assets such as favicons, PWA icons, app icons, and extension icons. Existing workflows are fragmented across design tools, export plugins, manual resizing, and platform-specific naming conventions. This work is repetitive, error-prone, and disproportionately annoying relative to its value.

## Goals

- Reduce asset setup time from hours to minutes.
- Support both existing-logo and no-logo starting points.
- Generate correct asset sizes and export structure for common developer targets.
- Make output reproducible through a config file and CLI.
- Keep the core product free, open-source, and easy to adopt.

## Non-Goals

- Full vector illustration or logo design suite.
- AI-generated logos in the MVP.
- Team collaboration, comments, or version history.
- Advanced typography or custom text-logo tooling.
- Deep plugin/integration ecosystem in the MVP.

## Target Users

- Indie hackers shipping web apps, mobile apps, or extensions
- Startup engineers building MVPs
- Agencies creating many small projects
- OSS maintainers who want polished packaging
- Designers/developers who need fast handoff-ready assets

## Primary User Jobs

1. I already have a logo and want every icon asset generated correctly.
2. I do not have a logo and want to compose a simple usable mark quickly.
3. I want previews so I can verify the icon works at small sizes.
4. I want to regenerate the same output later from the CLI or CI.

## User Stories

1. As a developer with an existing `svg` or `png`, I can upload it and export a packaged icon set for my target platforms.
2. As a developer without a logo, I can select an open-source icon, choose colors and a background treatment, and export a usable starter icon pack.
3. As a developer, I can preview my icon on realistic surfaces such as a browser tab and phone home screen before exporting.
4. As a developer, I can save or export a config file and reproduce the same output from the CLI.

## Core Value Proposition

- Existing logo in, full asset pack out.
- No logo, quick composition from open-source icon primitives.
- Shared engine across web UI and CLI for deterministic outputs.
- No design-suite overhead.

## MVP Scope

### Included

- Source input:
  - Upload `svg`
  - Upload `png`
- Simple icon composer:
  - Select from open-source icon library
  - Choose icon color
  - Choose solid background color
  - Choose gradient background
  - Adjust padding
  - Adjust corner radius / shape treatment
- Preset generation targets:
  - Website favicon assets
  - PWA icons
  - iOS app icon assets
  - Android app icon assets
  - Chrome extension icons
- Preview surfaces:
  - Browser tab / favicon preview
  - Mobile home screen preview
  - Extension toolbar preview
- Export:
  - `png`
  - `svg` when the source/composition remains vector-safe
  - `ico`
  - Zip bundle
  - Reusable config JSON
- CLI / npm package:
  - Generate from source asset
  - Generate from config file
  - Choose target presets
  - Output to specified folder

### Excluded

- AI generation
- Multi-layer editing
- Text/logo wordmark creation
- Team collaboration
- Figma and third-party integrations
- Batch multi-project workflows

## Functional Requirements

### Asset Input

- The system must accept `svg` and `png` uploads.
- The system must validate unsupported formats and provide a clear error.
- The system must preserve transparency where applicable.

### Composition

- The system must provide an icon library sourced from open-source assets with clear licensing treatment.
- The user must be able to choose icon color, background style, padding, and corner radius.
- The system must render a composed mark without requiring external design tools.

### Generation

- The system must generate all required sizes for each selected preset target.
- The system must apply correct filenames and folder structure for each target preset.
- The system must export vector output when possible and raster output when required.
- The system must support `ico` export for favicon use cases.

### Preview

- The system must provide small-size previews before export.
- The system must provide realistic target-surface previews for favicon, mobile, and extension contexts.

### Export And Reproducibility

- The system must export a zip bundle containing generated assets.
- The system must export a config file that captures the generation settings.
- The CLI must be able to consume the config file and reproduce the same output deterministically.

## Non-Functional Requirements

- The tool should allow a first successful export in under 5 minutes for a new user.
- The UI should make the common path obvious and should not feel like a complex design application.
- The generation engine should be deterministic for identical inputs and config.
- The project should remain self-hostable and usable locally due to its open-source model.
- The architecture should separate shared generation logic from the UI and CLI surfaces.

## Implemented Architecture Direction

- `@icon-kit/core`: rendering, presets, config schema, export pipeline
- `@icon-kit/cli`: command-line interface for local and CI usage
- `@icon-kit/web`: user interface for upload, composition, preview, and export

This structure is preferred over making the npm package a thin wrapper around the UI because it keeps the core logic reusable and testable.

## Success Metrics

- Time to first export
- Export completion rate
- Percentage of users who successfully generate from an existing logo
- Percentage of users who successfully use the simple composer
- CLI adoption rate
- Repeat generation from config

## Risks

- Scope creep into general-purpose design tooling
- Platform-specific asset rules changing over time
- Weak results for complex logos at very small sizes
- Licensing complexity for bundled icon sets
- Inconsistent rendering if the generation stack depends on fragile native tooling

## Open Questions

- Which icon libraries should ship in the MVP?
- Which exact platform presets should be included on day one versus shortly after?
- How much metadata or starter manifest code should export with the assets in the MVP?
- Should the hosted UI exist at launch, or should the first release be local-first?

## MVP Exit Criteria

The MVP is complete when:

1. A user can upload a `png` or `svg` and export a correct icon pack for at least web, PWA, iOS, Android, and Chrome extension targets.
2. A user without a logo can create a basic icon from the built-in icon library and export the same targets.
3. The product provides clear small-size previews before export.
4. The CLI reproduces the same output from a saved config file.
5. The project is documented well enough for open-source adoption.
