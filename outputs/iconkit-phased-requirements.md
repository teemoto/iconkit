# IconKit Phased Requirements

## Document Status

- Product: IconKit
- Type: Full requirements and phased roadmap
- Status: Draft
- Date: July 28, 2026

## Product Definition

IconKit is a free and open-source brand asset compiler for developers. It turns either an existing logo or a quickly composed icon-based mark into production-ready asset packs for websites, PWAs, mobile apps, desktop apps, and browser extensions.

The product should be built as a shared core engine with two delivery surfaces:

- Web UI for visual composition and preview
- CLI/npm package for automation, local workflows, and CI

## Product Principles

- Solve repetitive asset-generation pain before adding creativity tooling.
- Keep the common path simple and fast.
- Use one shared generation engine across UI and CLI.
- Preserve vector outputs when possible and emit raster outputs where required.
- Keep AI optional and deferred until the non-AI workflow is already strong.
- Stay open-source and usable without paid dependencies.

## Phase 0: Foundation

### Objective

Build the shared technical base so later UI and CLI features do not fork behavior or duplicate logic.

### Requirements

- Shared core package for:
  - source ingestion
  - canvas composition model
  - asset-size preset registry
  - export pipeline
  - config schema and parsing
- Input support:
  - `svg`
  - `png`
- Output support:
  - `png`
  - `svg` when composition remains vector-safe
  - `ico`
- Deterministic generation from identical config and source inputs
- Preset definitions for:
  - website favicon
  - PWA
  - iOS
  - Android
  - Chrome extension
- Test fixtures for output correctness
- Licensing framework for any bundled open-source icon libraries
- Clear package boundaries:
  - `@iconkit/core`
  - `iconkit`
  - `@iconkit/web`

### Deliverables

- Working core engine
- Initial preset registry
- Config file schema
- Automated tests for generation correctness

## Phase 1: MVP

### Objective

Ship the smallest version that fully solves the everyday asset-generation problem.

### Requirements

- Upload existing logo:
  - `svg`
  - `png`
- Simple mark composer:
  - choose icon from bundled open-source libraries
  - choose icon color
  - choose solid background color
  - choose gradient background
  - adjust padding
  - adjust corner radius or shape style
- Preset targets:
  - website favicon bundle
  - PWA icons
  - iOS app icons
  - Android app icons
  - Chrome extension icons
- Preview surfaces:
  - browser tab
  - mobile home screen
  - extension toolbar
- Export:
  - zip bundle
  - config JSON
  - direct file output in CLI
- CLI features:
  - generate from source input
  - generate from config file
  - select target presets
  - specify output directory
- Documentation:
  - quickstart
  - config reference
  - target preset reference
  - contribution and licensing notes

### Success Criteria

- New user can export a valid asset pack in under 5 minutes
- User can reproduce exports from config in CLI
- Existing-logo workflow works without external design tools
- No-logo workflow produces a usable starter identity

### Explicitly Deferred

- AI generation
- layer editor
- wordmark/text tools
- collaboration
- Figma and external integrations
- batch processing

## Phase 2: Advanced Composition

### Objective

Enable more polished and flexible logo composition without becoming a full design editor.

### Requirements

- Multi-layer composition support
- Layer operations:
  - reorder
  - show/hide
  - duplicate
  - lock
- Additional layer types:
  - background layer
  - primary icon layer
  - accent or badge layer
  - ring or border layer
  - shadow or depth layer
- Expanded style presets:
  - flat
  - outlined
  - duotone
  - soft gradient
  - glossy/glass-like
- Better vector preservation rules for multi-layer exports
- Additional export polish controls:
  - alignment nudging
  - safe-area controls
  - shadow intensity

### Deliverables

- Layer panel in UI
- Layer-aware config schema
- Updated renderer and export rules

## Phase 3: Smart Optimization And Dev Integrations

### Objective

Improve output quality at small sizes and deepen developer workflow integration.

### Requirements

- Tiny-size optimization preview
- Simplify-for-small-sizes mode
- Automatic padding / safe-area heuristics
- Contrast and legibility checks
- Preset warnings for likely cropping or unreadable icons
- Generated helper outputs:
  - HTML favicon snippet
  - PWA manifest icon snippet
  - starter asset mapping docs
- Framework guidance or helpers for:
  - Next.js
  - Vite
  - React
  - Electron
- Batch generation support from folders or multiple configs
- CI examples:
  - GitHub Actions
  - local script recipes

### Deliverables

- Quality-check subsystem
- Integration docs and examples
- Batch-friendly CLI enhancements

## Phase 4: AI-Assisted Creation

### Objective

Help users without a starting visual identity explore logo directions faster, while keeping deterministic asset generation separate from AI ideation.

### Requirements

- Prompt-based logo exploration
- Style suggestions based on project type or keywords
- Palette suggestions
- Variations generated from a selected symbol
- AI-assisted simplification suggestions for small sizes
- Clear separation between:
  - AI-generated candidate concept
  - deterministic export pipeline
- Ability to take AI-generated output and continue editing in the standard IconKit flow

### Constraints

- AI should be optional, not required
- AI should not block local or open-source usage of the core asset pipeline
- AI outputs should be editable and exportable through the same standard system

## Cross-Phase Requirements

### Open Source And Distribution

- Source code must be publicly available
- Local-first usage should remain possible
- Donation/support links may exist, but core functionality should remain free
- Dependencies should be chosen with long-term OSS maintainability in mind

### Architecture

- UI and CLI must rely on the same generation engine
- Config schema must remain stable and versioned
- Rendering behavior should be consistent across supported environments
- Preset definitions should be modular and easy to update

### Asset Fidelity

- Preserve source transparency where applicable
- Preserve vector information whenever possible
- Emit raster formats where platform requirements demand them
- Ensure outputs remain legible at small sizes

### Licensing

- Bundled icon sets must have compatible licenses
- Any required attribution should be documented clearly
- Exported assets should not impose unexpected licensing confusion on users

### Documentation

- Installation docs for CLI and self-hosted UI
- Quickstart for common tasks
- Config examples
- Preset coverage reference
- Contribution guide for adding new presets and targets

## Future Ideas Backlog

- Desktop app icon coverage for macOS and Windows expansion
- Firefox and Safari-specific extension/browser assets
- Template gallery for common product styles
- Shared community preset packs
- Optional hosted demo instance
- Figma plugin
- Direct framework adapters
- Design token export for brand colors
- Import from existing manifest/app config files

## Phase Ordering Rationale

- Phase 0 prevents architectural drift.
- Phase 1 proves the core value proposition.
- Phase 2 expands creative flexibility once the utility baseline works.
- Phase 3 strengthens quality and developer workflow adoption.
- Phase 4 adds AI without making it a dependency for the product's success.
