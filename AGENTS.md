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

## Path Rules

Automatic path-triggered reminders live in `.pi/rules/*.md`. The global `file-path-rules` extension appends each file's body to read/edit/write results on the first touch of a matching path per session.

- `pages.md` — load the `app-domain` skill before page edits
- `tests.md` — load the `testing-standards` skill before test edits
- `typescript.md` — load the `coding-standards` + `reactlynx-best-practices` skills before TypeScript edits
- `agentic-files.md` — compressed token-efficient style for agent config file edits

## Behavior Rules

- Use `/plan` before multi-file or multi-step tasks.
- Make minimal, targeted changes. Do not refactor unrelated code.
- Android build (`bun dev`, `bun run build`) requires macOS + Android SDK — do not attempt without them.
- Tests live next to source, named after the component: `src/pages/<name>/<Name>.spec.tsx`.

## Hooks

`.pi/hooks.json` configures the global `hooks` extension (dotfiles repo). It blocks android-only commands (`bun run build`, `bun run dev`, `bun dev`, `bun run smoke`, `bun run android`, `bun run log`) on `tool_call` and runs the verification chain on `agent_settled` when the session edited or wrote a file under `src/`, `scripts/`, `.agents/`, `.pi/`, or one of the root config files. The result shows in a dedicated widget section below the editor as `hooks  Verification, running/complete/failed` (the `status` label in `.pi/hooks.json`). The policy lives in `scripts/hooks/`.

## Verification

The `hooks` extension runs the verification chain automatically on `agent_settled` when the session touched source files — result shows in the widget below the editor (`hooks  Verification, running/complete/failed`). NEVER run the chain, bundle build, or Android build manually. Banned in-session: `bun typecheck`, `bun run test`, `bun lint`, `bun run verify-docs`, `rspeedy build`, `./gradlew`. No exceptions — not after edits, not after failures, not mid-task. When the widget shows `failed`, read the failure output, fix the code, and stop; the hook re-runs on the next `agent_settled`.
