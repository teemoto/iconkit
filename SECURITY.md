# Security Policy

## Supported Versions

IconKit is pre-release software. Security fixes are made on the current `main` branch; published versions are supported only when explicitly noted in release documentation.

## Reporting a Vulnerability

Please do not report vulnerabilities through public GitHub issues, discussions, pull requests, or social media.

Use GitHub's private vulnerability reporting flow for this repository: open the **Security** tab, choose **Advisories**, then select **Report a vulnerability**. Include enough information to reproduce and assess the issue:

- A clear description of the vulnerability and its impact.
- Affected files, versions, or configuration.
- Reproduction steps or a minimal proof of concept.
- Any suggested remediation, if known.

If private reporting is unavailable, open a public issue requesting a private reporting channel without including vulnerability details.

We aim to acknowledge reports within five business days and to provide status updates as investigation progresses. Please allow time for a fix to be developed and released before publicly disclosing the vulnerability.

## Security Priorities

The most sensitive areas of IconKit are SVG sanitization, image decoding limits, archive creation and extraction, output-path handling, and dependency updates. Security changes must include a regression test whenever practical.
