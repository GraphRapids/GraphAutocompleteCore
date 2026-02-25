# Release Process

This project uses Semantic Versioning (SemVer) and tagged GitHub releases.

## Versioning Policy

- `MAJOR` (`X.0.0`): breaking API or behavior changes
- `MINOR` (`0.X.0`): backward-compatible features
- `PATCH` (`0.0.X`): backward-compatible fixes and documentation updates

Tag format is `vX.Y.Z` (for example, `v0.2.1`).

## 1. Prepare Release PR

1. Ensure `main` is green (`CI`, `Tests`, and `Secret Scan`).
2. Bump `version` in `package.json`.
3. Rebuild and repack:

```bash
npm run build
npm pack
```

4. Open a PR and merge it to `main`.

## 2. Tag and Publish

```bash
git checkout main
git pull --ff-only
git tag -a vX.Y.Z -m "vX.Y.Z"
git push origin vX.Y.Z
```

The `Release` workflow publishes the GitHub release for that tag.
