# Contributing

Thanks for contributing to GraphAutocompleteCore.

## Development Setup

```bash
npm install
```

Run tests:

```bash
npm run test
```

Build package output:

```bash
npm run build
```

## Project Structure

- `src/core/graphAutocompleteCore.js`: reusable autocomplete core logic
- `src/core/graphAutocompleteCore.test.js`: core behavior tests
- `src/index.js`: package export entrypoint
- `scripts/build.mjs`: package bundling via esbuild
- `.github/workflows/`: CI, tests, release, and secret scanning

## Pull Requests

Before opening a PR:

1. Keep changes focused and atomic.
2. Add or update tests for behavior changes.
3. Update docs (`README.md`, `THIRD_PARTY_NOTICES.md`) when relevant.
4. Ensure workflows are green (`CI`, `Tests`, and `Secret Scan`).

## Reporting Bugs and Requesting Features

Use GitHub issues for bug reports and feature requests.
For security issues, follow `SECURITY.md`.
