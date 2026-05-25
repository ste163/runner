---
name: test-writing
description: Conventions for writing Vitest unit tests in this ReactLynx repo. Use when writing, reviewing, or generating tests for components or pages.
---

# test-writing

## Stack

- **Test runner**: Vitest
- **Component rendering**: `@lynx-js/react/testing-library`
- **DOM matchers**: `@testing-library/jest-dom`
- **Vitest config**: `createVitestConfig()` from `@lynx-js/react/testing-library/vitest-config` — already configured, do not override environment settings.

## File conventions

- Test files live **alongside** the component: `src/pages/<name>/App.spec.tsx`
- No separate `__tests__` directory.
- Import the component using the `.js` extension (required by the module resolver): `import { App } from './App.js'`

## Rendering

```tsx
import '@testing-library/jest-dom'
import { expect, test, vi } from 'vitest'
import { render, getQueriesForElement } from '@lynx-js/react/testing-library'

render(<App />)

// Access the rendered tree via the global `elementTree`
const { findByText, getByText, queryByText } = getQueriesForElement(elementTree.root!)
```

**Do not use `document.body` or DOM queries** — `elementTree` is the Lynx element tree, not the DOM.

## Queries

Use async queries for rendered text (Lynx rendering is async):

```tsx
const el = await findByText('Expected text')
expect(el).toBeInTheDocument()
```

Use sync queries only when the element is guaranteed to be present synchronously.

## Mocking

Mock modules at the top of the file with `vi.mock()`:

```tsx
vi.mock('sparkling-navigation', () => ({ open: vi.fn() }))
```

Mock callbacks as `vi.fn()` and pass them as props:

```tsx
const onMounted = vi.fn()
render(<App onMounted={onMounted} />)
expect(onMounted).toBeCalledTimes(1)
```

## Test structure

- One `test()` block per behaviour. No `describe()` unless grouping multiple related behaviours.
- Test names: plain English, describe the expected outcome. Example: `'App renders hero content'`
- Do not test implementation details — test what the user sees or what callbacks fire.

## Running tests

```sh
bun test           # run once
bun run test:watch # watch mode
```
