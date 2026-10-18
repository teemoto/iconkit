# Production dependency audit — October 18, 2026

## Scope

This release-readiness audit covers the locked production dependencies used by
`@icon-kit/core`, the CLI package that consumes it, the browser application,
and the curated Lucide data distributed by core. Development-only tooling is
outside this shipping-artifact review.

## Security result

`corepack pnpm audit --prod --audit-level moderate` reported no known
vulnerabilities against the npm advisory database on October 18, 2026.

## License inventory

| Dependency          | Version | License     | Distribution notes                                                                                                                      |
| ------------------- | ------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `@jsquash/png`      | 3.1.1   | Apache-2.0  | Core imports the package and redistributes its unmodified PNG codec WASM. The codec also carries a BSD-3-Clause notice.                 |
| `@resvg/resvg-wasm` | 2.6.2   | MPL-2.0     | Core imports the package and redistributes its unmodified renderer WASM. Upstream source remains available from the project repository. |
| `@xmldom/xmldom`    | 0.9.12  | MIT         | Installed as an ordinary runtime dependency and ships its own license file.                                                             |
| `fflate`            | 0.8.3   | MIT         | Installed as an ordinary runtime dependency and ships its own license file.                                                             |
| Lucide Icons        | 1.50.0  | ISC and MIT | A curated data subset is vendored in core; the root and core notices retain the upstream attribution.                                   |

The core package now includes the Apache-2.0, PNG codec BSD-3-Clause, and
MPL-2.0 license texts under `licenses/`. Its `NOTICE` maps each redistributed
WASM file to its dependency, version, license, and upstream source. The package
smoke test requires those files in the generated tarball.

## Outcome

No production dependency blocks the alpha release. Re-run the advisory scan
and package smoke test immediately before publishing:

```sh
corepack pnpm audit --prod --audit-level moderate
corepack pnpm run test:pack
```
