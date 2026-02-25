# Third-Party Notices

Last verified: 2026-02-25

GraphAutocompleteCore is licensed under Apache-2.0. This file documents third-party software and tools used by the project.

## Runtime dependencies

| Component | How GraphAutocompleteCore uses it | License | Source |
| --- | --- | --- | --- |
| `js-yaml` | YAML parsing for metadata extraction | MIT | https://github.com/nodeca/js-yaml |

## Build and development tooling (not redistributed)

| Component | How GraphAutocompleteCore uses it | License | Source |
| --- | --- | --- | --- |
| `esbuild` | Bundling package output to `dist/` | MIT | https://github.com/evanw/esbuild |
| `vitest` | Unit test runner | MIT | https://github.com/vitest-dev/vitest |
| `@vitest/coverage-v8` | Coverage reporting | MIT | https://github.com/vitest-dev/vitest/tree/main/packages/coverage-v8 |

## Downstream obligations

- Verify transitive dependency licenses before redistribution.
- Keep this file updated as dependencies/tooling change.
