---
name: test-writing
description: Conventions for writing Vitest unit tests in this ReactLynx repo. Use when writing, reviewing, or generating tests for components or pages.
---

# test-writing

## Stack

- Vitest + `@lynx-js/react/testing-library` + `@testing-library/jest-dom`
- Config: `createVitestConfig()` from `@lynx-js/react/testing-library/vitest-config` — do not override environment settings.

## File Conventions

- Test files alongside component: `src/pages/<name>/App.spec.tsx`
- Import with `.js` extension: `import { App } from './App.js'`

## Rendering

```tsx
import '@testing-library/jest-dom'
import { expect, test, vi } from 'vitest'
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

## Test Structure

- One `test()` per behaviour. `describe()` only when grouping related behaviours.
- Names: plain English, expected outcome. Example: `'App renders hero content'`
- Test what the user sees or what callbacks fire — not implementation details.
- Run: `bun test` / `bun run test:watch`
