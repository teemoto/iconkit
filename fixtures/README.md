# IconKit Fixtures

This corpus is consumed by `@icon-kit/core` tests and cross-package consumer
checks. PNG fixtures are base64 text so they remain reviewable; test helpers
decode them to `Uint8Array` before ingestion. The `android/minimal-app` fixture
validates generated launcher resources in a real Android application module.

| Fixture                          | Expected outcome                        |
| -------------------------------- | --------------------------------------- |
| `svg/simple.svg`                 | accepted static vector source           |
| `svg/wide.svg`                   | accepted; contain-fit horizontal layout |
| `svg/tall.svg`                   | accepted; contain-fit vertical layout   |
| `svg/malformed.svg`              | `SVG_INVALID_XML`                       |
| `svg/external-resource.svg`      | `SVG_EXTERNAL_RESOURCE`                 |
| `svg/script.svg`                 | `SVG_UNSUPPORTED_FEATURE`               |
| `png/transparent-1x1.png.base64` | accepted transparent PNG                |
| `png/opaque-1x1.png.base64`      | accepted opaque PNG                     |
| `png/corrupt.png.base64`         | `PNG_INVALID`                           |
