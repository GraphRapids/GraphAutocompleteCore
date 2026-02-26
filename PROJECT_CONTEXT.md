# GraphAutocompleteCore - Project Context

## Purpose
GraphAutocompleteCore provides reusable, editor-agnostic YAML autocomplete logic for GraphRapids graph authoring workflows.

## Primary Goals
- Keep autocomplete logic independent from React and Monaco APIs.
- Provide deterministic suggestion behavior aligned with GraphRapids scenario contracts.
- Enable adapter layers for Monaco now and other editors later.
- Keep type suggestions strictly consumer-supplied (profile-driven) rather than hardcoded in core.

## Package Snapshot
- Package name: `@graphrapids/graph-autocomplete-core`
- Source: `src/core/graphAutocompleteCore.js`
- Entry point: `src/index.js`
- Build output:
  - `dist/index.js`
  - `dist/index.js.map`

## Consumer Contract
Core outputs are plain data structures:
- context (`kind`, `section`, `prefix`, endpoint info)
- suggestions (ordered values/keys)
- metadata (entities, root-section presence)
- utility helpers for indentation/backspace behavior
- profile catalog helpers (`createProfileCatalog`, `normalizeCatalogValues`)

No editor-specific objects should leak from core logic.

## Integration Notes
Current consumers:
- GraphYamlEditor stories/harness
- GraphYamlEditor e2e behavior tests

Future target:
- GraphEditor app runtime wiring should import from this package instead of local copies.

## Testing Expectations
- Unit tests: `npm run test`
- Build validation: `npm run build`
- Packaging: `npm pack`

## Open Decisions / TODO
- [ ] Define a stable adapter contract for Monaco and future editor integrations.
- [ ] Add schema-driven extraction helpers for node/link type values.
- [ ] Add traceability from scenario rows to unit/e2e tests.

## How To Maintain This File
- Update after public API, behavior contract, or architecture changes.
- Keep details concise and implementation-accurate.
