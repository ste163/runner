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

`.pi/hooks.json` configures the global `hooks` extension (dotfiles repo). Pre-tool hook (`scripts/hooks/pre-tool.sh`) is the single source of truth for the command list. Three tiers:

- ALLOW — checks/validation and unit tests run anytime: `bun typecheck`, `bun run test`, `bun lint`, `bun run verify-docs`, `sh scripts/android-test.sh`, `./gradlew :app:testDebugUnitTest`.
- ASK — builds need the user's OK first; approved runs carry the `RUNNER_APPROVED=1` prefix.
- NEVER — device-affecting commands (adb, install scripts, `bun dev`, gradle install/connected tasks) are blocked; the user runs them.

`agent_settled` hook runs the verification chain when the session touched `src/`, `scripts/`, `.agents/`, `.pi/`, or a root config file — result shows in the widget (`hooks  Verification, running/complete/failed`).

## Verification

Chain runs automatically on `agent_settled`; prefer it over manual runs (redundant, not harmful). Android unit tests are not in the chain — run them when android code changes. Widget shows `failed` → read the failure output, fix, stop; the hook re-runs on the next `agent_settled`.
