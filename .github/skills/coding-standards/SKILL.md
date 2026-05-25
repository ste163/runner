---
name: coding-standards
description: TypeScript coding standards for this repo — arrow functions, SRP, and non-mutability. Use when writing, reviewing, or generating TypeScript code.
---

# coding-standards

## Arrow Functions

Always use arrow functions. Never use `function` declarations or expressions.

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

Each function does one thing. If a function needs a comment to explain what a block inside it does, that block should be its own function.

```ts
// ✅ Each function has one job
const parseIds = (raw: string[]) => raw.map((s) => s.trim()).filter(Boolean)
const fetchItems = async (ids: string[]) => Promise.all(ids.map(api.get))
const processRaw = async (raw: string[]) => fetchItems(parseIds(raw))

// ❌ One function doing multiple unrelated things
const processRaw = async (raw: string[]) => {
  // parse
  const ids = raw.map((s) => s.trim()).filter(Boolean)
  // fetch
  const results = await Promise.all(ids.map(api.get))
  return results
}
```

## Non-Mutability

Prefer immutable data patterns. Use `const` everywhere. Use `.map`, `.filter`, `.reduce`, and spread instead of `let` + mutation.

```ts
// ✅
const doubled = numbers.map((n) => n * 2)

const evens = numbers.filter((n) => n % 2 === 0)

const sum = numbers.reduce((acc, n) => acc + n, 0)

const totals = items.reduce<Record<string, number>>(
  (acc, item) => ({
    ...acc,
    [item.id]: item.value,
  }),
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
for (const n of numbers) {
  doubled.push(n * 2)
}

let sum = 0
for (const n of numbers) {
  sum += n
}
```

## General Rules

- `const` by default. Only use `let` when reassignment is genuinely required (rare).
- No `var`.
- No `any` unless unavoidable — prefer `unknown` + type narrowing.
- Explicit return types on exported functions.
- Prefer `.reduce` over `Set` or mutable accumulation patterns.
- **Never disable lint rules** (no `// eslint-disable`, `// oxlint-disable`, or similar suppression comments). If a rule is difficult to satisfy, surface the problem to the developer — do not silence it.
