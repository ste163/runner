---
name: coding-standards
description: TypeScript coding standards for this repo — arrow functions, SRP, and non-mutability. Use when writing, reviewing, or generating TypeScript code.
---

# coding-standards

## Arrow Functions

Always arrow functions. Never `function` declarations or expressions.

```ts
// ✅
const add = (a: number, b: number) => a + b

const fetchUser = async (id: string) => {
  const res = await api.get(id)
  return res.data
}

// ❌
function add(a: number, b: number) {
  return a + b
}
```

## Single Responsibility Principle (SRP)

Each function does one thing. Split when a block needs a comment to explain itself.

```ts
// ✅
const parseIds = (raw: string[]) => raw.map((s) => s.trim()).filter(Boolean)
const fetchItems = async (ids: string[]) => Promise.all(ids.map(api.get))
const processRaw = async (raw: string[]) => fetchItems(parseIds(raw))

// ❌
const processRaw = async (raw: string[]) => {
  // parse
  const ids = raw.map((s) => s.trim()).filter(Boolean)
  // fetch
  const results = await Promise.all(ids.map(api.get))
  return results
}
```

## Non-Mutability

`const` everywhere. Use `.map`, `.filter`, `.reduce`, spread — no `let` + mutation.

```ts
// ✅
const doubled = numbers.map((n) => n * 2)
const evens = numbers.filter((n) => n % 2 === 0)
const sum = numbers.reduce((acc, n) => acc + n, 0)

const totals = items.reduce<Record<string, number>>(
  (acc, item) => ({ ...acc, [item.id]: item.value }),
  {}
)

// Deduplicate with reduce instead of Set
const unique = items.reduce<string[]>(
  (acc, item) => (acc.includes(item) ? acc : [...acc, item]),
  []
)

const updated = { ...user, name: 'new name' }

// ❌
let doubled = []
for (const n of numbers) doubled.push(n * 2)
```

## Rules

- No `var`. No `any` — prefer `unknown` + type narrowing.
- Explicit return types on exported functions.
- Prefer `.reduce` over `Set` or mutable accumulation.
- Use `if (!value) return` for single-return guard clauses. No braces.
- Keep short related checks compact; do not add blank lines between them.
- Do not export types, interfaces, or values unless another file needs them.
- Do not compare `undefined` or `null` for presence. Use truthy guard clauses when presence is implied.
- Prefer optional props (`foo?: T`) over `foo: T | undefined`.
- **Never disable lint rules.** Surface the problem to the developer instead.
- Prefer one-line expressions when they stay readable.
- Avoid `I`-prefixed interface names; use the domain noun directly.
