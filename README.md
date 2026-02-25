# GraphAutocompleteCore

[![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](./LICENSE)
[![CI](https://github.com/GraphRapids/GraphAutocompleteCore/actions/workflows/ci.yml/badge.svg)](https://github.com/GraphRapids/GraphAutocompleteCore/actions/workflows/ci.yml)
[![Tests](https://github.com/GraphRapids/GraphAutocompleteCore/actions/workflows/test.yml/badge.svg)](https://github.com/GraphRapids/GraphAutocompleteCore/actions/workflows/test.yml)
[![Secret Scan](https://github.com/GraphRapids/GraphAutocompleteCore/actions/workflows/gitleaks.yml/badge.svg)](https://github.com/GraphRapids/GraphAutocompleteCore/actions/workflows/gitleaks.yml)

Reusable editor-agnostic autocomplete core for GraphRapids YAML graph authoring.

## Package

- Name: `@graphrapids/graph-autocomplete-core`
- Entry export: `dist/index.js`
- Module format: ESM

## Features

- YAML cursor context analysis (`rootKey`, `itemKey`, `endpointValue`, `type` contexts)
- Deterministic key/value suggestion generation
- Metadata extraction from document text (entity lookup and root-section presence)
- Indentation-aware utility helpers for editor backspace behavior
- Pure JavaScript logic with no React/Monaco runtime dependency

## Repository Layout

```text
src/index.js
src/core/graphAutocompleteCore.js
src/core/graphAutocompleteCore.test.js
scripts/build.mjs
vitest.config.js
.github/workflows/
```

## Development

```bash
npm install
npm run test
npm run build
npm pack
```

## Consume From GraphYamlEditor

GraphYamlEditor references a local tarball during development:

```json
"@graphrapids/graph-autocomplete-core": "file:../GraphAutocompleteCore/graphrapids-graph-autocomplete-core-0.1.0.tgz"
```

After changes in this repo:

1. `npm run build`
2. `npm pack`
3. Reinstall in consumer repo(s)

## Governance

- `CONTRIBUTING.md`
- `SECURITY.md`
- `RELEASE.md`
- `THIRD_PARTY_NOTICES.md`

## Persistent Context

- `PROJECT_CONTEXT.md` holds stable architecture and behavior notes.
- `SESSION_NOTES.md` is the running handoff log between sessions.

## Acknowledgements

- [js-yaml](https://github.com/nodeca/js-yaml)
- GraphRapids maintainers and contributors

## License

Apache-2.0 (`LICENSE`).
