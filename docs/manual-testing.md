# Manual alpha test plan

## Web composer

1. Run `corepack pnpm dev` and open `http://127.0.0.1:5173`.
2. Choose an SVG and a PNG. Confirm the filename, dimensions, transparency
   status, and file size appear.
3. Change background type, colors, padding, shape, and corner radius. Confirm
   the 512 px, browser-tab, home-screen, and extension-toolbar previews update.
4. Enable the maskable safe-area guide and confirm the dashed circle overlays
   the preview without appearing in downloaded output.
5. Search the icon library, select an icon, change its color, and generate a
   ZIP. Confirm the ZIP contains `THIRD_PARTY_NOTICES.txt`.
6. Save both file-source and catalog configs. Reload them and confirm catalog
   configs render immediately while file configs ask for their source file.
7. Use only the keyboard to reach upload, search, icon buttons, all controls,
   preset checkboxes, and download buttons. Confirm focus is always visible.
8. Test at 320 px, 768 px, and desktop widths, plus 200% browser zoom. Confirm
   there is no horizontal overflow or clipped control text.
9. Try an oversized file, malformed SVG, corrupt PNG, mismatched saved source,
   and no selected preset. Confirm each failure is explained without losing the
   current controls.
10. Select the iOS preset with a rounded shape and transparent background.
    Confirm the generated home-screen preview is square and opaque, both iOS
    adjustments are explained, and `ios/AppIcon.appiconset/Contents.json`
    references every generated PNG.

## CLI

```sh
corepack pnpm start -- generate --source fixtures/svg/simple.svg --out /tmp/iconkit-manual --zip
corepack pnpm start -- generate --config /tmp/iconkit-manual/iconkit.config.json --out /tmp/iconkit-copy --zip
cmp /tmp/iconkit-manual/iconkit.zip /tmp/iconkit-copy/iconkit.zip
```

The two ZIP files should be byte-identical. Repeat generation into the first
directory to confirm collision refusal, then repeat with `--overwrite`.

Create or save a catalog config in the web app and run:

```sh
corepack pnpm start -- generate --config camera.iconkit.json --out /tmp/iconkit-camera --zip
```

Confirm generation succeeds without a source argument.

## Release checks

```sh
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
corepack pnpm test:pack
corepack pnpm benchmark
corepack pnpm format:check
```
