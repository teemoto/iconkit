# Release process

IconKit publishes `@icon-kit/core` and `@icon-kit/cli` at the same version. The
browser application is private and is deployed separately. Prereleases use the
npm `alpha` dist-tag so they do not replace the stable `latest` channel. The
current prerelease is `0.1.0-alpha.1`.

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
   tar -tf release-artifacts/icon-kit-core-0.1.0-alpha.1.tgz
   tar -tf release-artifacts/icon-kit-cli-0.1.0-alpha.1.tgz
   ```

5. Commit and push the release candidate, then run the `Release npm packages`
   workflow from `main` with `publish` disabled. Review its uploaded tarballs.
6. Create and push `v0.1.0-alpha.1` at the reviewed commit. Run the workflow
   again with that tag selected and `publish` enabled. Publishing fails unless
   the selected ref exactly matches the package version.

## Publish

The workflow publishes core before CLI because the CLI declares core as a
runtime dependency. It targets an `npm` environment, requests only read-only
repository access plus `id-token: write`, and records npm provenance. Its
`publish` input defaults to false. Create and protect the environment before
the first publishing run.

The first alpha used a granular npm token because `@icon-kit/core` did not yet
exist and could not have a package-level trusted publisher. Both packages now
trust `release.yml` in `teemoto/iconkit`, scoped to the `npm` environment. The
workflow authenticates with short-lived OIDC credentials and does not read a
long-lived npm token.

The current release setup is:

1. Create the `npm` environment under the repository's **Settings →
   Environments** page.
2. Add the desired deployment protection rules and restrict deployment to
   release tags.
3. Configure each npm package to trust `release.yml` in this repository and
   require the `npm` environment.
4. Leave the GitHub environment free of long-lived npm credentials.
5. Keep the workflow's `publish` input disabled until the reviewed release
   commit is tagged.

The workflow runs these commands only after the explicit publish gate.
Prerelease publication uses the `alpha` dist-tag:

```sh
npm publish ./release-artifacts/icon-kit-core-0.1.0-alpha.1.tgz \
  --access public --tag alpha
npm publish ./release-artifacts/icon-kit-cli-0.1.0-alpha.1.tgz \
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
GitHub release from the already tagged and reviewed commit.

## Trusted-publisher setup

Configure both npm packages for the repository `teemoto/iconkit` and workflow
filename `release.yml`. Allow direct publishing for this workflow. Trusted
publishing requires a GitHub-hosted runner, `id-token: write`, Node 22.14.0 or
newer, and npm 11.5.1 or newer. Keep ordinary npm write tokens disabled after
OIDC publication is working.

Both connections were created on October 26, 2026 with the `npm` environment,
direct `npm publish` permission, and no general dist-tag management permission.
The first OIDC publication succeeded on October 26, 2026. The signed provenance
for both packages identifies `release.yml` at tag `v0.1.0-alpha.1` as the
publishing identity. The GitHub environment contains no `NPM_TOKEN` secret.
The bootstrap token `iconkit-github-release` was deleted on October 27, 2026;
the npm account now has no access tokens. Both packages require two-factor
authentication and disallow bypass 2FA tokens for package changes. Their OIDC
trusted-publisher connections remain valid under this stricter policy.

## Latest dry-run evidence

The `0.1.0-alpha.1` non-publishing workflow completed successfully on October
26, 2026:

- Run: [Release npm packages #40426458213](https://github.com/teemoto/iconkit/actions/runs/40426458213)
- Commit: `34607bf4b4916d5000551db641275306e0382713`
- Release metadata, quality gate, package creation, and artifact upload passed.
- The npm publish job was skipped because `publish` was false.
- Artifact: `iconkit-0.1.0-alpha.1`, 1,093,936 bytes, digest
  `sha256:2901f0afc0a8468678e91bd7576fa596adf4247cb6d9bda1b9b75438b8f98197`.
- The uploaded tarballs have the same file sets, file contents, and modes as the
  locally reviewed tarballs. Their SHA-256 digests are
  `39c666b3e025b78650e290988bbf2f52a34111a564dbc22863d3eb61881fa22a`
  for the CLI and
  `3cfb8c4e4c9743f9c54eb0597a10c72ed0bc3d41faa8c0e08c551c250b94be57`
  for core.
- The packed CLI manifest depends on `@icon-kit/core@0.1.0-alpha.1`.

## Current publication status

[`@icon-kit/core@0.1.0-alpha.1`](https://www.npmjs.com/package/@icon-kit/core/v/0.1.0-alpha.1)
and
[`@icon-kit/cli@0.1.0-alpha.1`](https://www.npmjs.com/package/@icon-kit/cli/v/0.1.0-alpha.1)
were published under the `alpha` dist-tag on October 26, 2026 through npm
trusted publishing. [Workflow run
#40461126347](https://github.com/teemoto/iconkit/actions/runs/40461126347)
passed its quality gate, published both packages, and verified them through the
public registry. Both packages include signed SLSA provenance tied to
`teemoto/iconkit/.github/workflows/release.yml` at tag `v0.1.0-alpha.1`.

A clean registry smoke test confirmed version output, all five presets,
generation of 60 files, and ZIP integrity. The packed CLI depends on the exact
matching version, `@icon-kit/core@0.1.0-alpha.1`.

The previous `0.1.0-alpha.0` packages remain available. [GitHub prerelease
v0.1.0-alpha.0](https://github.com/teemoto/iconkit/releases/tag/v0.1.0-alpha.0)
contains that release's notes and npm package links.

The publishing commands in [workflow run
#40235853984](https://github.com/teemoto/iconkit/actions/runs/40235853984)
succeeded. npm then reported that the packages were still being processed, so
the immediate registry readback returned `E404` and marked the run failed. Both
public manifests became available after processing completed. The workflow now
retries registry verification for up to five minutes to cover this delay.
