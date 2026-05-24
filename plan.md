# Colocated Vitest Spec Plan

## Goal

Move unit tests to colocated component-adjacent files and standardize on the `.spec` naming convention.

## Decision

- Treat this as a file-organization change, not a runtime change.
- Keep the current Vitest setup as-is.
- Prefer colocating tests beside the component they cover.

## Current Repo State

- Tests run with Vitest 4.1.7.
- `jsdom` is installed.
- `vitest.config.ts` uses `createVitestConfig()` from `@lynx-js/react/testing-library/vitest-config` and currently only merges in coverage settings.
- Existing tests use `@lynx-js/react/testing-library` helpers.
- The only app test has been moved next to `src/pages/main/App.tsx`.

## What We Need To Learn

1. Whether colocated `.spec.tsx` files are picked up by Vitest without config changes.
2. Whether the test import path changes cleanly when the test sits beside the component.
3. Whether the repo should adopt a single colocated convention for future Lynx component tests.

## Experiment Plan

1. Move the existing app test beside the component it covers.
2. Rename the test to use the `.spec` suffix.
3. Keep the test body unchanged unless the colocated path requires an import adjustment.
4. Run Vitest and confirm the test is discovered and passes.
5. Use the new layout as the pattern for future component tests.

## Likely Risk Areas

- Future tests may be harder to find if conventions are not documented.
- Colocation can create path churn when files move.
- Existing `__tests__` assumptions in tooling or docs may need cleanup.

## Verification

1. Run the current unit test suite after the move.
2. Confirm the colocated `.spec.tsx` file is discovered by Vitest.
3. Check for any broken relative imports or helper assumptions.
4. Decide whether to update additional tests to the same convention.

## Definition of Done

- Tests use colocated `.spec` files next to their components.
- The existing app test runs from its new location.
- The test organization rule is documented for future changes.
