---
name: testing-standards
description: Testing standards for Vitest unit tests in this ReactLynx repo. Use when writing, reviewing, or generating tests for components or pages.
---

# testing-standards

## Stack

- Vitest + `@lynx-js/react/testing-library` + `@testing-library/jest-dom`
- Config: `createVitestConfig()` from `@lynx-js/react/testing-library/vitest-config` — do not override environment settings.

## File Conventions

- Page/component tests live alongside the source file and use the component name: `src/pages/<name>/<Name>.spec.tsx`
- Pure domain/unit tests for non-React code use `*.spec.ts`
- Import with `.js` extension: `import { App } from './App.js'`

## Rendering

```tsx
import '@testing-library/jest-dom'
import { expect, it, vi } from 'vitest'
import { render, getQueriesForElement } from '@lynx-js/react/testing-library'

render(<App />)

const { findByText, getByText, queryByText } = getQueriesForElement(elementTree.root!)
```

**Do not use `document.body` or DOM queries** — use `elementTree`, not the DOM.

## Queries

Use async queries (Lynx rendering is async):

```tsx
const el = await findByText('Expected text')
expect(el).toBeInTheDocument()
```

## Mocking

```tsx
vi.mock('sparkling-navigation', () => ({ open: vi.fn() }))

const onMounted = vi.fn()
render(<App onMounted={onMounted} />)
expect(onMounted).toBeCalledTimes(1)
```

## Test Design

- Test user flows first. Prefer what the user sees and does over implementation details.
- Treat components as black boxes. Assert rendered output and callbacks, not internal state.
- Order coverage with failure/error flows first, then success scenarios.
- If several checks share the same setup, keep them in one focused test with multiple expectations.
- Check for dead code and dead branches while reviewing test targets; if found, tell the dev to decide whether to keep or remove them.
- Keep test names short, plain, and accurate.
- Use `it()` instead of `test()`.
- One `describe()` for each component/page spec.
- For domain/function specs, wrap each function under test in its own `describe()`.
- Run: `bun run test` / `bun run test:watch`
