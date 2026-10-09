# @icon-kit/web

IconKit's local browser composer. It accepts SVG or PNG input, previews the
actual generated 512 px, favicon, PWA, and iOS outputs, and downloads a
reproducible asset ZIP or saved configuration. Android assets can be selected
and exported; dedicated Android mask previews are planned as the next UI task.

Users can also search 170 bundled Lucide icons, recolor them, preview the PWA
maskable safe area and extension toolbar, and reproduce the same catalog config
through the CLI.

The app has no backend and does not upload source artwork. Rendering and ZIP
creation happen in the browser through the same `@icon-kit/core` APIs used by
the CLI.

From the repository root:

```sh
corepack pnpm dev
corepack pnpm --filter @icon-kit/web build
```

Saved configs can be loaded in the app. Because browsers cannot silently read
a path from a config, the user then chooses the matching source file. Core
verifies a saved source hash when present.
