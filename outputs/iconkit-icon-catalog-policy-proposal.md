# IconKit MVP Icon Catalog Policy Proposal

## Status

- Product: IconKit
- Decision type: Bundled icon catalog and licensing policy
- Status: Proposed — requires approval before implementation
- Date: September 3, 2026

## Recommendation

Ship a curated, version-pinned subset of **Lucide** icons as the only built-in MVP catalog. Start with roughly 250 broadly useful, non-brand, monochrome symbols and store their normalized SVG plus explicit metadata in `@icon-kit/core` fixtures/data. Do not expose the entire upstream catalog in the first release and do not ship third-party brand marks.

## Why Lucide

| Criterion              | Lucide                                                      | Tabler                                            | Heroicons                                                  |
| ---------------------- | ----------------------------------------------------------- | ------------------------------------------------- | ---------------------------------------------------------- |
| License                | ISC                                                         | MIT                                               | MIT                                                        |
| Upstream coverage      | Large, actively maintained general-purpose library          | Very large: over 6,000 icons                      | Smaller UI-oriented library                                |
| Rendering model        | Structured icon data, monochrome/current-color friendly     | 24×24, 2px-stroke SVGs; outline and filled styles | Multiple fixed style and size variants                     |
| Metadata and packaging | Tree-shakable icon-data package with name and node metadata | Source SVGs, aliases, and large broad catalog     | Source SVGs and framework components                       |
| MVP bundle fit         | Strong with a curated static subset                         | Strong icons, but too broad by default            | Good quality but less flexible as a general symbol catalog |

Lucide’s icon-data format is especially useful for IconKit because the catalog can be normalized into a renderer-owned source model rather than coupled to a framework component. The upstream package documents each icon as named node data and supports individual imports. [Lucide icon-data documentation](https://github.com/lucide-icons/lucide/blob/main/docs/guide/packages/icons.md)

Tabler is a strong future expansion candidate—it offers more than 6,000 MIT-licensed SVG icons—but that breadth would make catalog curation, search relevance, and first-load size worse before the product’s core rendering value is proven. [Tabler Icons](https://github.com/tabler/tabler-icons)

Heroicons remains compatible with the project’s goals but is optimized for UI development and is a less suitable default for a broad no-logo symbol composer. [Heroicons](https://github.com/tailwindlabs/heroicons)

## MVP Catalog Scope

- Target size: approximately 250 icons, reviewed before release.
- Include durable categories: arrows, commerce, communication, documents, education, finance, food, health, home, media, people, science, security, software, travel, and weather.
- Exclude trademarks, company logos, flags, political symbols, and any icon whose meaning is likely to create a licensing or impersonation concern.
- Preserve upstream ID, display name, tags, Lucide version, source URL, license identifier, and normalized SVG in the catalog record.
- Use kebab-case stable IDs such as `lucide:camera`; never use a display label as the programmatic identifier.
- Keep catalog icons monochrome and use the approved `currentColor` recoloring path.

## Licensing and Attribution Contract

- Pin an exact Lucide release when the catalog data is first generated.
- Vendor only the selected icon data and the applicable ISC license text, not a live dependency on the whole upstream package.
- Add a root `NOTICE` file naming Lucide, its pinned version, source repository, license, and the list or count of vendored icons.
- Include the same notice in generated bundle documentation when an output uses a catalog icon. The generated icon remains subject to the upstream license notice; the user should not be surprised by that condition.
- Preserve source metadata in `IconKitConfig` so a generated mark remains attributable and reproducible even if the built-in catalog later changes.
- Catalog updates are explicit versioned migrations: additions may be minor changes; removals or changed SVG data require a compatibility review.

## Bundle and Search Policy

- The web application lazy-loads a compact search index first, then icon SVG data by selected result/category. It does not put all SVG strings in the first application bundle.
- The CLI ships the same pinned catalog dataset through `@icon-kit/core`; it does not make network calls to look up icons.
- Search matches title, normalized tags, and curated synonyms. Search ranking is deterministic and stable for a given catalog version.

## Acceptance Criteria

This policy is approved when the project owner confirms:

1. Lucide is the only MVP catalog source and the catalog begins as a curated subset rather than the full upstream set.
2. The catalog excludes brands and other high-risk symbol categories.
3. Vendored data, `NOTICE`, generated-bundle attribution, and config metadata are required before catalog icons ship.
4. The web and CLI share the same exact pinned catalog version with no runtime network dependency.

On approval, this policy drives the catalog record schema, licensing files, core fixtures, web search data, CLI behavior, and future catalog-update procedure.
