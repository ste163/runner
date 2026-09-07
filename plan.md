# Plan: Extensions to Create

Part 1 (the pi-native port) is complete: skills in `.agents/skills/`, prompt templates in `.pi/prompts/`, `lynx-docs` in `.mcp.json`, LSP config deleted, AGENTS.md rewritten, verify-docs updated, repo-navigation removed, app-domain trimmed to domain-only.

What remains: two extensions. One project-local (`hooks`), one global (`file-path-rules`).

## Shared setup

Project-local (runner repo):

- Extension lives at `.pi/extensions/<name>/index.ts` + colocated `index.spec.ts`. Directory shape, not a bare `.ts` file: pi auto-loads every top-level `.ts` in `.pi/extensions/` as its own extension, so a sibling spec file would be loaded as an extension too. Only `index.ts` is the entry point per subdirectory (same hard rule as the dotfiles `pi-extension-development` project).
- Tooling: add `@earendil-works/pi-coding-agent@0.85.1` (exact pin, matches installed pi 0.85.1) to the runner repo's devDependencies so `bun typecheck` resolves the extension types. Specs run under the existing Vitest setup. Follow the dotfiles extension conventions: injectable deps (no real disk I/O in tests), no `await` in loops, colocated specs. Reference implementations: `plan-mode` and `codebase-memory-mcp-enforcer` in the dotfiles repo.
- Project-local extensions load only after project trust.

Global (dotfiles repo):

- Extension lives at `pi-extension-development/extensions/<name>/index.ts` + colocated spec, same shape and conventions, plus the dotfiles test rule (100% line/branch/function coverage). Loads for every project.

## Extension 1: `hooks` (project-local, replaces `.github/hooks/`)

One extension, two handlers, named after the hook events they replace.

### Files

| File                                 | Purpose                                              |
| ------------------------------------ | ---------------------------------------------------- |
| `.pi/extensions/hooks/index.ts`      | Factory: registers both handlers, wires deps + state |
| `.pi/extensions/hooks/deps.ts`       | DI seam (`HooksDeps` + `defaultDeps()`)              |
| `.pi/extensions/hooks/index.spec.ts` | Colocated Vitest spec                                |
| `package.json`                       | Add devDep, extend lint scope                        |
| `tsconfig.json`                      | Add `.pi/extensions` to `include`                    |

### Design

- Entry shape: `export default function (pi: ExtensionAPI) { pi.on(...) }`. Loaded via jiti, no build step.
- `deps.ts` — the only I/O seam: `HooksDeps.exec(command, cwd)` returning `{ output, exitCode, cancelled }`. `defaultDeps()` wraps `createLocalBashOperations().exec`. Tests inject a fake — no real disk I/O in specs.
- State created in the factory, passed to handlers (not module-level): `{ dirty: boolean; running: boolean }`.
- Pure functions (exported, directly testable): `isAndroidCommand(command)`, `isSourcePath(path)`.

### Handler 1 — `preToolUse` (`tool_call` event)

- `isToolCallEventType("bash", event)` + `isAndroidCommand(event.input.command)` → return `{ block: true, reason: "This command requires macOS + Android SDK + a connected emulator. Verify your environment and run it manually if ready." }` (exact text from pre-tool.sh).
- No `terminate` — the original denies the call and lets the agent continue.
- Blocked commands: `bun run build`, `bun dev`, `bun run dev`, `bun run smoke`, `bun run android`, `bun run log` (original 5 + `bun run dev` — the `dev` script is android-only, a gap in the original).
- Also: `isToolCallEventType("edit" | "write", event)` + `isSourcePath(event.input.path)` → `state.dirty = true`. Read does not trigger (does not mutate).

### Handler 2 — `agentStop` (`agent_settled` event)

- If `!dirty || running` → return.
- Set `running`, exec `bun typecheck && bun run test && bun lint && bun run verify-docs` with `ctx.cwd` (single chained command — parity with verify.sh, no `await` in loops).
- Clear `running` and `dirty` after the run (success or failure — verify runs at most once per settle, only when something changed).
- `ctx.ui.notify("Verification passed", "info")` on success; `ctx.ui.notify("Verification failed (exit N): <output tail>", "error")` on failure.

### Source path set (dirty trigger)

`src/**`, `scripts/**`, `.agents/**`, `.pi/**`, plus `app.config.ts`, `lynx.config.ts`, `vitest.config.ts`, `AGENTS.md`, `package.json`. Docs (README.md, plan.md, `.github/**`) do not trigger.

### Spec plan

- `isAndroidCommand`: blocks each listed command, blocks compound (`bun run build && echo hi`), does not block `bun test`, `bun typecheck`, `bun run lint`, `bun run verify-docs`, `bun run fmt`, `adb devices`, `bun run log:app`.
- `isSourcePath`: matches src file, config files, `.agents` skill, `.pi` prompt, AGENTS.md, package.json, scripts file; rejects README.md, plan.md, `.github` workflow.
- `handleToolCall`: android bash → block with exact reason; safe bash → no return; edit on source path → dirty; edit on doc → not dirty.
- `handleAgentSettled`: clean → no exec; dirty + success → exec with chain + cwd, dirty cleared, success notify; dirty + failure → error notify, dirty cleared; `running` guard skips re-entry.
- Factory: registers both handlers (spy on `pi.on`).

### Tooling changes

- `package.json`: devDep `@earendil-works/pi-coding-agent: "0.85.1"` (exact pin); `lint`/`lint:fix` gain `.pi/extensions`.
- `tsconfig.json`: `include` gains `.pi/extensions`.
- No vitest config change — default include picks up the spec automatically, so `bun test` runs it.

### Prerequisites

- The verify chain must use `bun run test` (Vitest). `bun test` is bun's native runner — it ignores `vitest.config.ts` and fails on Lynx component specs (`ReferenceError: lynx is not defined`). All 61 tests pass under `bun run test`.
- Trust prompt on first pi run after `.pi/` exists; `/reload` needed to load the extension.

### Verification steps

1. `bun typecheck && bun lint` pass; new spec passes in `bun test`.
2. In pi: `/reload`, run `bun run build` → blocked with the reason; make a source edit, settle → verify chain runs.
3. Both confirmed → delete `.github/hooks/` entirely.

## Extension 2: `file-path-rules` (global, dotfiles repo)

- What it does: declarative glob → doc map, checked on `tool_call`/`tool_result` for `read`/`edit`/`write` (matched against `event.input.path`). On first match per file per session, append the referenced doc's content/reminder into the tool result content so the model sees it right after touching a matching path.
- Why it exists: deterministic skill-loading reminders that fire on matching file paths — stronger than hoping skill descriptions alone trigger.
- The mechanism is generic (glob matching + per-session dedupe + doc reading); only the config is per-project. Each project supplies its config as `.pi/rules/*.md` files with a `paths:` front-matter field the extension reads.
- Runner repo work (config only, no mechanism):
  - Move all 5 `.github/instructions/*.instructions.md` files to `.pi/rules/*.md`, stripped of Copilot `applyTo` frontmatter, replaced with the `paths:` field.
  - Config table (paths → doc): `android/**` → android stop-and-ask rule; `src/pages/**` → reminder to load `app-domain` skill; `**/*.spec.tsx` → reminder to load `testing-standards` skill; `src/**/*.{ts,tsx}` → reminder to load `coding-standards` + `reactlynx-best-practices` skills; `.agents/**/*.md`, `.pi/**/*.md`, `AGENTS.md` → reminder to keep edits minimal and follow each file's own conventions.
  - `android.instructions.md` content stays intact (just relocated). `agentic-files.instructions.md` gets one content edit: its body says "any file in `.github/`" — update to the new locations (`.agents/`, `.pi/`, `AGENTS.md`). `pages.instructions.md` / `tests.instructions.md` / `typescript.instructions.md` also stay (relocated).
  - Delete `.github/instructions/` after the move. Add the two folded-in rules to `AGENTS.md`.

## Verification

- `hooks` / `preToolUse`: confirm a sample android command is blocked with the reason message.
- `hooks` / `agentStop`: confirm the gated verify runs after a source-touching session and stays silent otherwise.
- `file-path-rules`: confirm the reminder fires on a sample edit under each configured glob.

## Decisions (resolved)

- Extension name `hooks`: the standard term across Copilot CLI (`.github/hooks/`), Claude Code (`hooks` key in settings.json), and Codex CLI (`~/.codex/hooks/`). Directly replaces `.github/hooks/`.
- Extension name `file-path-rules`: aligns with Claude Code (`.claude/rules/`) and Cursor (`.cursor/rules/`) terminology; the `file-path-` prefix makes the scope obvious.
- Rules key format: front-matter field (`paths: 'src/pages/**'`) parsed by the global extension. Keeps each doc self-contained. Matches Claude Code's rules frontmatter.
- Extension shape: `.pi/extensions/<name>/index.ts` + colocated spec inside the directory (bare top-level `.ts` files in `.pi/extensions/` are each auto-loaded as extensions, so a sibling spec file would be loaded too).
- Off-limits: `runner-plan.md` and `navigation-plan.md` are active plans — never delete or modify them.
