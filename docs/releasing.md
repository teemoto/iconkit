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

5. Commit and push the release candidate, then run the `Release npm packages`
   workflow from `main` with `publish` disabled. Review its uploaded tarballs.
6. Create and push `v0.1.0-alpha.0` at the reviewed commit. Run the workflow
   again with that tag selected and `publish` enabled. Publishing fails unless
   the selected ref exactly matches the package version.

## Publish

The workflow publishes core before CLI because the CLI declares core as a
runtime dependency. It targets an `npm` environment, requests only read-only
repository access plus `id-token: write`, and records npm provenance. Its
`publish` input defaults to false. Create and protect the environment before
the first publishing run.

`@icon-kit/core` does not yet exist on npm, so its first publication cannot use
a package-level trusted-publisher configuration. Store a granular npm publish
token as the `NPM_TOKEN` secret on the `npm` environment for this bootstrap
release. After both packages exist, configure `release.yml` as their trusted
publisher and remove the token. Subsequent runs then authenticate through
short-lived OIDC credentials.

Before creating the release tag:

1. Create the `npm` environment under the repository's **Settings →
   Environments** page.
2. Add the desired deployment protection rules and restrict deployment to
   release tags.
3. Add a valid granular npm token as the environment secret `NPM_TOKEN`. The
   token must be able to publish public packages in the `@icon-kit` scope.
4. Keep the workflow's `publish` input disabled until the reviewed release
   commit is tagged.

The workflow runs these commands only after the explicit publish gate. The
initial publication uses the `alpha` dist-tag:

```sh
npm publish ./release-artifacts/icon-kit-core-0.1.0-alpha.0.tgz \
  --access public --tag alpha
npm publish ./release-artifacts/icon-kit-cli-0.1.0-alpha.0.tgz \
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

## Latest dry-run evidence

The non-publishing workflow completed successfully on October 21, 2026:

- Run: [Release npm packages #39632594476](https://github.com/teemoto/iconkit/actions/runs/39632594476)
- Commit: `9b9466672f21cc7f6dbfdb8cba903a156ee9f692`
- Release metadata, quality gate, package creation, and artifact upload passed.
- The npm publish job was skipped because `publish` was false.
- Artifact: `iconkit-0.1.0-alpha.0`, 1,093,918 bytes, digest
  `sha256:1b27e9e493d2865c9a20fd263cbb3d43900457e4808c37a2a003fef1871927e0`.

## Current publication status

`@icon-kit/core@0.1.0-alpha.0` and `@icon-kit/cli@0.1.0-alpha.0` were published
under the `alpha` dist-tag on October 25, 2026. Both packages include signed
provenance and passed a clean registry smoke test covering version output,
preset discovery, generation, and ZIP creation.

The publishing commands in [workflow run
#40235853984](https://github.com/teemoto/iconkit/actions/runs/40235853984)
succeeded. npm then reported that the packages were still being processed, so
the immediate registry readback returned `E404` and marked the run failed. Both
public manifests became available after processing completed. The workflow now
retries registry verification for up to five minutes to cover this delay.
