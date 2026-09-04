# Core Test Layout

- `unit/`: pure validation, layout, color, preset-resolution, and diagnostic tests.
- `integration/`: source ingestion through generated preset/bundle tests using the shared fixture corpus.
- `fixtures/`: package-local expected outputs only; reusable input files remain in the repository-level `fixtures/` directory.

Tests must import `@icon-kit/core` public exports rather than internal source paths whenever the behavior is part of the package contract.
