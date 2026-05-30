# AGENTS.md

## Lynx Docs

Use `lynx-docs` MCP if available — read `lynx-docs://llms.txt` first. Fallback: [https://lynxjs.org/next/llms.txt](https://lynxjs.org/next/llms.txt)

## What This Repo Is

`runner` is an Android app built with ReactLynx and `sparkling-app-cli`. Two Lynx pages (`main`, `second`) run inside a native Android shell. Stack: bun, Lynx, ReactLynx, Rspeedy, Vitest, oxlint, oxfmt.

## Skills

Project skills live in `.github/skills/`. Use them for Lynx-specific tasks:

- `reactlynx-best-practices` — dual-thread patterns, static analysis, auto-fix
- `lynx-typescript` — TypeScript issues and solutions in Lynx
- `lynx-devtool` — inspect and debug running Lynx apps via DevTool
- `lynx-trace-analysis` — analyze `.ptrace` performance traces
- `lynx-trace-record` — record Lynx performance traces
- `debug-info-remapping` — remap `function_id:pc_index` errors to source positions
- `repo-navigation` — repo layout, commands, test locations
- `test-writing` — Vitest + `@lynx-js/react/testing-library` conventions
- `coding-standards` — TypeScript style: arrow functions, SRP, non-mutability, no lint suppression
- `app-domain` — Runner app business rules: session mechanics, progression algorithm, data model
- `caveman` — compressed writing mode for token-efficient `.github/` file edits

## Agents

Custom agents live in `.github/agents/`. Use them for multi-step workflows:

- `reactlynx-reviewer` — review ReactLynx/Lynx TypeScript code for correctness and dual-thread violations
- `test-generator` — generate Vitest tests for components or pages
- `performance-investigator` — full trace workflow: record → analyze → report

## Behavior Rules

- Use `/plan` before multi-file or multi-step tasks.
- Make minimal, targeted changes. Do not refactor unrelated code.
- Ask before deleting files, changing package versions, or modifying Android native code.
- Android build (`bun dev`, `bun run build`) requires macOS + Android SDK — do not attempt without them.
- Tests live next to source: `src/pages/<name>/App.spec.tsx`.
