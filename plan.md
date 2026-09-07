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

One extension, two handlers, named after the hook events they replace:

- **`preToolUse`** (replaces `pre-tool.sh`): `tool_call` handler that blocks `bash` commands matching `bun (run build|dev|run smoke|run android|run log)` with the same reason message as today ("requires macOS + Android SDK + a connected emulator. Verify your environment and run it manually if ready."). Deterministic guard against wasted attempts on commands that cannot work in this environment.
- **`agentStop`** (replaces `verify.sh`): `agent_settled` handler running `bun typecheck && bun test && bun lint && bun run verify-docs` via `createLocalBashOperations`, surfacing failures via `ctx.ui.notify`. Gated: run only when the session touched source files (track `read`/`edit`/`write` paths in the same extension), so long sessions do not re-run the full suite on every settle.

After both handlers fire correctly: delete `.github/hooks/` entirely.

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
