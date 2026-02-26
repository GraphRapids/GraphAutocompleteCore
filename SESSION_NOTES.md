# GraphAutocompleteCore - Session Notes

Use this file as a running log between work sessions.

## Entry Template

### YYYY-MM-DD
- Summary:
- Changes:
- Files touched:
- Tests run:
- Known issues:
- Next steps:

## Current

### 2026-02-26
- Summary: Switched autocomplete type suggestions to explicit profile-driven catalogs.
- Changes:
  - Removed hardcoded node/link type catalogs from core behavior.
  - Added `createProfileCatalog`, `normalizeCatalogValues`, and `EMPTY_PROFILE_CATALOG`.
  - Updated suggestion resolution to prioritize profile catalogs and explicit overrides.
  - Added unit tests proving profile-driven suggestion behavior.
- Files touched:
  - `src/core/graphAutocompleteCore.js`
  - `src/core/graphAutocompleteCore.test.js`
  - `README.md`
  - `PROJECT_CONTEXT.md`
  - `SESSION_NOTES.md`
- Tests run:
  - `npm test`
  - `npm run build`
  - `npm pack`
- Known issues: none.
- Next steps:
  - Keep adapters aligned on `profileVersion` + `checksum` invalidation semantics.

### 2026-02-25
- Summary: Initialized GraphAutocompleteCore and migrated autocomplete core logic from GraphYamlEditor harness.
- Changes:
  - Created package source, tests, build, docs, and workflow scaffolding.
  - Added reusable core exports for context/suggestions/metadata/backspace helpers.
- Files touched:
  - `src/core/graphAutocompleteCore.js`
  - `src/core/graphAutocompleteCore.test.js`
  - `src/index.js`
  - `package.json`
  - `scripts/build.mjs`
  - `vitest.config.js`
  - governance/workflow docs
- Tests run:
  - `npm run test`
  - `npm run build`
- Known issues: none
- Next steps:
  - Wire GraphYamlEditor to consume this package.
  - Run tests/build and verify integration.
