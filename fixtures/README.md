# IconKit Fixtures

This corpus is consumed by future `@icon-kit/core` tests. PNG fixtures are base64 text so they remain reviewable in this planning-stage repository; test helpers decode them to `Uint8Array` before ingestion.

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
