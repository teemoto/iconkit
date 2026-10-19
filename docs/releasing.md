# Release process

IconKit publishes `@icon-kit/core` and `@icon-kit/cli` at the same version. The
browser application is private and is deployed separately. The first release
candidate is `0.1.0-alpha.0`, published under the npm `alpha` dist-tag so it
does not replace the stable `latest` channel.

An npm package name and version cannot be reused after publication. Review the
packed files and version metadata before authorizing the registry operation.

## Prepare

1. Set the same version in `packages/core/package.json` and
   `packages/cli/package.json`.
2. Move the release notes in `CHANGELOG.md` from `Unreleased` to the release
   date.
3. Run the full quality gate:

   ```sh
   corepack pnpm install --frozen-lockfile
   corepack pnpm run lint
   corepack pnpm run typecheck
   corepack pnpm run test
   corepack pnpm run test:android-consumer:structure
   corepack pnpm run build
   corepack pnpm run test:pack
   corepack pnpm run format:check
   corepack pnpm audit --prod --audit-level moderate
   ```

4. Create and inspect both release tarballs. Confirm that the CLI tarball
   depends on the matching core version.

   ```sh
   mkdir -p release-artifacts
   corepack pnpm --filter @icon-kit/core pack \
     --pack-destination release-artifacts
   corepack pnpm --filter @icon-kit/cli pack \
     --pack-destination release-artifacts
   tar -tf release-artifacts/icon-kit-core-0.1.0-alpha.0.tgz
   tar -tf release-artifacts/icon-kit-cli-0.1.0-alpha.0.tgz
   ```

5. Commit and push the release candidate, then require a green GitHub Actions
   run before publishing.

## Publish

Publish core before CLI because the CLI declares core as a runtime dependency.
Use a GitHub-hosted release workflow with npm trusted publishing and
`id-token: write`; npm then authenticates with short-lived OIDC credentials and
automatically records provenance for the public packages.

The initial publication must use the `alpha` dist-tag:

```sh
npm publish release-artifacts/icon-kit-core-0.1.0-alpha.0.tgz \
  --access public --tag alpha
npm publish release-artifacts/icon-kit-cli-0.1.0-alpha.0.tgz \
  --access public --tag alpha
```

Do not publish from an uncommitted working tree or add `--force`. If either
publish fails, stop and inspect the registry before retrying; never increment a
version until its registry state is known.

## Verify

Test the registry artifacts in a clean temporary directory rather than through
workspace links:

```sh
corepack pnpm dlx @icon-kit/cli@alpha --version
corepack pnpm dlx @icon-kit/cli@alpha presets
corepack pnpm dlx @icon-kit/cli@alpha generate \
  --source logo.svg --out iconkit-output --zip
```

Confirm that the reported version is the release version, generation succeeds,
the ZIP opens, and npm displays provenance for both packages. Then create the
matching Git tag and GitHub release from the reviewed commit.

## Trusted-publisher setup

Configure both npm packages for the repository `teemoto/iconkit` and the exact
release workflow filename. Trusted publishing requires a GitHub-hosted runner,
`id-token: write`, Node 22.14.0 or newer, and npm 11.5.1 or newer. Keep ordinary
npm write tokens disabled after OIDC publication is working.
