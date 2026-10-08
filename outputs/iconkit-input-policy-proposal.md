# IconKit MVP Input Policy Proposal

## Status

- Product: IconKit
- Decision type: Source ingestion and safety contract
- Status: Approved and implemented
- Date: September 3, 2026

## Recommendation

Accept only standalone SVG and PNG source files in the MVP. Validate the file’s actual bytes and decoded metadata, not its extension or browser-supplied MIME type. Reject unsupported or unsafe content with actionable diagnostics; do not silently alter a source in a way that could make web and CLI output diverge.

## Accepted Inputs and Limits

| Source | Maximum encoded size | Maximum decoded dimensions    | Maximum decoded pixels              | Notes                                                              |
| ------ | -------------------- | ----------------------------- | ----------------------------------- | ------------------------------------------------------------------ |
| PNG    | 20 MiB               | 4096 × 4096                   | 16,777,216                          | Must have a valid PNG signature and decodable raster data.         |
| SVG    | 5 MiB                | 4096 × 4096 resolved viewport | 16,777,216 resolved viewport pixels | Must be a standalone, static SVG satisfying the safe subset below. |

These limits apply before any output generation. A source that is valid but too large is rejected rather than decoded and resized. The 4096px ceiling is substantially larger than the approved 512px maximum raster output while bounding decode memory and work.

## Layout and Transparency Contract

- The MVP canvas is square.
- Non-square sources use centered `contain` fit inside the configured safe area. They are never stretched or cropped by default.
- PNG alpha is preserved through composition and PNG/ICO output.
- Transparent source pixels remain transparent when the selected canvas background is transparent; solid and gradient canvas backgrounds are composed behind the source.
- A source without usable intrinsic SVG dimensions must provide a finite `viewBox`; otherwise it is rejected with a diagnostic asking the user to export a bounded SVG.

## SVG Safe Subset

IconKit accepts static graphical SVG that can be rendered deterministically without network access, script execution, installed fonts, or timing. The sanitizer parses XML; substring or regular-expression filtering is not sufficient.

### Rejected SVG features

Reject the entire upload with a diagnostic when it contains any of the following:

- `script`, event-handler attributes such as `onclick`, or JavaScript URLs.
- External URLs in any attribute or CSS property, including external images, stylesheets, fonts, `use` targets, and paint/filter references.
- `foreignObject`, `iframe`, `audio`, `video`, or embedded HTML.
- Animation elements or animation-related attributes, including `animate`, `animateMotion`, `animateTransform`, `set`, and SMIL timing attributes.
- Text and font-dependent content, including `text`, `tspan`, `textPath`, `font`, and CSS `@font-face`.
- Raster `<image>` elements, including data URLs, in an SVG source. Users should upload a PNG directly instead.
- Filter elements and CSS `filter` references in the MVP.
- SVG elements or CSS constructs outside the renderer’s explicitly tested allowlist.

### Allowed SVG features

The initial renderer allowlist will cover the graphical primitives and structural elements needed by common exported logos: `svg`, `g`, `defs`, `path`, `rect`, `circle`, `ellipse`, `line`, `polyline`, `polygon`, `clipPath`, `mask`, `linearGradient`, `radialGradient`, `stop`, `title`, and `desc`.

Local fragment references such as `url(#gradient)` and `href="#symbol"` are allowed only when their targets are within the same parsed document and resolve to an allowlisted element. CSS is limited to an internally parsed, allowlisted presentation-property subset; external stylesheets and unrecognized CSS are rejected.

## Diagnostics

Every rejected source produces a stable diagnostic code, a user-facing message, and a suggested remedy. Initial codes include:

| Code                       | Message summary                                              | Suggested remedy                                                  |
| -------------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------- |
| `INPUT_UNSUPPORTED_FORMAT` | Only SVG and PNG are supported.                              | Export as SVG or PNG.                                             |
| `INPUT_FILE_TOO_LARGE`     | The source exceeds the encoded file-size limit.              | Export a smaller source file.                                     |
| `INPUT_RASTER_TOO_LARGE`   | The PNG or resolved SVG viewport exceeds the decode limit.   | Resize or simplify the source before upload.                      |
| `PNG_INVALID`              | The PNG could not be decoded.                                | Re-export the image as a standard PNG.                            |
| `SVG_INVALID_XML`          | The SVG is not well-formed XML.                              | Re-export the SVG from the source tool.                           |
| `SVG_UNBOUNDED_VIEWPORT`   | The SVG has no finite width/height or viewBox.               | Export with an explicit viewBox.                                  |
| `SVG_UNSUPPORTED_FEATURE`  | The SVG uses a feature outside IconKit’s static safe subset. | Flatten or outline the unsupported feature, then re-export.       |
| `SVG_EXTERNAL_RESOURCE`    | The SVG references an external resource.                     | Embed or convert the artwork to standalone paths, then re-export. |

## Security and Determinism Rationale

The policy uses allowlisting, file-signature and decode validation, and explicit resource limits, consistent with OWASP’s guidance for image uploads. [OWASP File Upload Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html)

SVG supports external resource references and script/event execution. The SVG specification describes external-resource behavior and distinguishes script execution, so IconKit takes the stricter local-first position: it accepts neither. [SVG linking](https://www.w3.org/TR/SVG2/linking.html), [SVG conformance](https://www.w3.org/TR/SVG2/conform.html)

## Acceptance Criteria

This policy is approved when the project owner confirms:

1. SVG and PNG are the only MVP input formats and the stated size/decode limits are acceptable.
2. Contain-fit, square-canvas, transparency, and unbounded-SVG behavior are correct.
3. The SVG policy is fail-closed: unsupported, animated, font-dependent, scripted, embedded-raster, and externally referenced content is rejected rather than degraded silently.
4. The listed diagnostics form the initial public validation contract.

On approval, this document drives `IconKitConfig` source fields, input-ingestion tests, user-facing error copy, and CLI exit behavior.
