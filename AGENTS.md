# AGENTS.md

## Lynx Docs

Use `lynx-docs` MCP (configured in `.mcp.json` at the project root) — read `lynx-docs://llms.txt` first. Fallback: [https://lynxjs.org/next/llms.txt](https://lynxjs.org/next/llms.txt)

## What This Repo Is

`runner` is an Android app built with ReactLynx and `sparkling-app-cli`. Five Lynx pages (`home`, `workout`, `activeWorkout`, `onboarding`, `graphs`) run inside a native Android shell. Stack: bun, Lynx, ReactLynx, Rspeedy, Vitest, oxlint, oxfmt, sparkling-app-cli.

## Skills

Project skills live in `.agents/skills/`. Use them for Lynx-specific tasks:

- `reactlynx-best-practices` — dual-thread patterns, static analysis, auto-fix
- `lynx-typescript` — TypeScript issues and solutions in Lynx
- `lynx-devtool` — inspect and debug running Lynx apps via DevTool
- `lynx-trace-analysis` — analyze `.ptrace` performance traces
- `lynx-trace-record` — record Lynx performance traces
- `debug-info-remapping` — remap `function_id:pc_index` errors to source positions
- `testing-standards` — Vitest + `@lynx-js/react/testing-library` conventions
- `coding-standards` — TypeScript style: arrow functions, SRP, non-mutability, no lint suppression
- `app-domain` — Runner app business rules: session mechanics, progression algorithm, data model

## Prompt Templates

Multi-step workflows live in `.pi/prompts/`. Invoke them as `/name`:

- `/reactlynx-reviewer` — review ReactLynx/Lynx TypeScript code for correctness and dual-thread violations
- `/test-generator` — generate Vitest tests for components or pages
- `/performance-investigator` — full trace workflow: record → analyze → report
- `/debug` — logs-first TDD triage for frontend vs Android issues

## Behavior Rules

- Use `/plan` before multi-file or multi-step tasks.
- Make minimal, targeted changes. Do not refactor unrelated code.
- Ask before deleting files, changing package versions, or modifying Android native code.
- Android build (`bun dev`, `bun run build`) requires macOS + Android SDK — do not attempt without them.
- Tests live next to source, named after the component: `src/pages/<name>/<Name>.spec.tsx`.

## Hooks

`.pi/hooks.json` configures the global `hooks` extension (dotfiles repo). It blocks android-only commands (`bun run build`, `bun run dev`, `bun dev`, `bun run smoke`, `bun run android`, `bun run log`) on `tool_call` and runs the verification chain on `agent_settled` when the session edited or wrote a file under `src/`, `scripts/`, `.agents/`, `.pi/`, or one of the root config files. The result shows in a dedicated widget section below the editor as `hooks  Verification, running/complete/failed` (the `status` label in `.pi/hooks.json`). The policy lives in `scripts/hooks/`.

## Verification

The `hooks` extension runs the verification chain automatically on `agent_settled` when the session touched source files — the result shows in the widget below the editor (`hooks  Verification, running/complete/failed`). Do not run the chain manually after edits; rely on the extension to save tokens.

Run checks manually only when:

- The widget shows `failed` — run the failing step to see the full output and fix it.
- You changed files outside the hook's paths (README.md, plan.md, `.github/`) and need a check.
- You need a result mid-task before continuing (e.g. TDD red-green).

The chain is `bun typecheck && bun run test && bun lint && bun run verify-docs`. Use `bun run test` (Vitest) — `bun test` runs bun's native runner, which ignores `vitest.config.ts` and fails on Lynx component specs.
