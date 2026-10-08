# Release Guide

[README](../README.md) · [User guide](user-guide.md) · [Development](development.md) · [Release](release.md) · [Troubleshooting](troubleshooting.md)

## Release

Releases are driven by `.github/workflows/release.yml`.

The extension version comes from `package.json`. For example, if it is `0.1.0`, the
release tag must be:

```text
v0.1.0
```

To release from git:

```sh
git tag v0.1.0
git push origin v0.1.0
```

The release workflow will:

1. Install dependencies.
2. Validate that the tag matches `package.json`.
3. Run lint and tests with coverage thresholds.
4. Build the extension.
5. Lint the Firefox build.
6. Generate release notes.
7. Package Chromium, Firefox, and source ZIPs.
8. Generate one `SHA256SUMS` file for all three ZIPs.
9. Publish or update the GitHub Release with all browser packages.

The generated release assets are:

- `shortcut-override-for-netflix-chromium-<version>.zip`
- `shortcut-override-for-netflix-firefox-<version>.zip`
- `shortcut-override-for-netflix-source-<version>.zip`
- `SHA256SUMS`

Place `SHA256SUMS` beside the three downloaded ZIP files, then verify them with
`sha256sum -c SHA256SUMS` on Linux or `shasum -a 256 -c SHA256SUMS` on macOS.

No AMO credentials are required by the release workflow. To publish Firefox manually:

1. Download the Firefox and source ZIPs from the GitHub Release.
2. In the AMO Developer Hub, upload the Firefox ZIP as a new version.
3. Upload the matching source ZIP when AMO requests source code.
4. Complete validation and submit the version for review.

AMO requires every submitted version number to be new. A GitHub Release can replace an existing asset, but an AMO version such as `0.4.2` cannot be uploaded again; increment the extension version first.

## Changelog

Release notes are generated from commits since the previous `v*` tag.

Preview release notes locally:

```sh
npm run changelog -- --tag v0.1.0 --output release-notes.md
```

Commit messages that follow Conventional Commits are grouped into sections such as Features, Fixes, Build and CI, and Maintenance. Other commit messages are placed under Changes.

## Packaging For Manual Distribution

Build first:

```sh
npm run build
```

Create a zip from the contents of `dist/chromium`:

```sh
(cd dist/chromium && zip -r ../../shortcut-override-for-netflix.zip .)
```

The zip root should contain `manifest.json`, not nested `dist/chromium` folders.

The same Chromium ZIP is used for Chrome Web Store and Microsoft Edge Partner Center.
The production manifest omits `key`, and the shared `short_name` already satisfies Edge
validation. The release workflow also creates the Firefox, source, and checksum assets.
