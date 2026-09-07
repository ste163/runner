# Plan: Extensions to Create

## Shared setup for any kept piece

- Extension lives at `.pi/extensions/<name>/index.ts` + colocated `index.spec.ts`. Directory shape, not a bare `.ts` file: pi auto-loads every top-level `.ts` in `.pi/extensions/` as its own extension, so a sibling spec file would be loaded as an extension too. Only `index.ts` is the entry point per subdirectory (same hard rule as the dotfiles `pi-extension-development` project).
- Tooling: add `@earendil-works/pi-coding-agent@0.85.1` (exact pin, matches installed pi 0.85.1) to the runner repo's devDependencies so `bun typecheck` resolves the extension types. Specs run under the existing Vitest setup. Follow the dotfiles extension conventions: injectable deps (no real disk I/O in tests), no `await` in loops, colocated specs. Reference implementations: `plan-mode` and `codebase-memory-mcp-enforcer` in the dotfiles repo.
- Project-local extensions load only after project trust.
- For each kept piece: build the extension, verify it fires, then delete the replaced `.github/hooks/` file (or the whole `.github/hooks/` dir once both hook pieces are replaced).

### Piece A — android command block (replaces `pre-tool.sh`)

- What it does: `tool_call` handler that blocks `bash` commands matching `bun (run build|dev|run smoke|run android|run log)` with the same reason message as today ("requires macOS + Android SDK + a connected emulator. Verify your environment and run it manually if ready.").
- Why it exists: deterministic guard against wasted attempts on commands that cannot work in this environment.
- Effort: small (one handler, `isToolCallEventType("bash", event)`).
- If dropped: delete `.github/hooks/pre-tool.sh` and add a plain AGENTS.md rule (weaker — model-dependent, not enforced).

### Piece B — verify-on-settle (replaces `verify.sh` / `agentStop` hook)

- What it does: `agent_settled` handler running `bun typecheck && bun test && bun lint && bun run verify-docs` via `createLocalBashOperations`, surfacing failures via `ctx.ui.notify`. Gated: run only when the session touched source files (track `read`/`edit`/`write` paths in the same extension), so long sessions do not re-run the full suite on every settle.
- Why it exists: automatic verification after agent work, same as the Copilot `agentStop` hook.
- Effort: medium (path tracking + gated exec).
- If dropped: delete `.github/hooks/verify.sh`; verification becomes manual (the AGENTS.md Verification section already documents the commands).

### Piece C — glob-based doc loader (replaces `applyTo` instructions)

- What it does: declarative glob → doc map, checked on `tool_call`/`tool_result` for `read`/`edit`/`write` (matched against `event.input.path`). On first match per file per session, append the referenced doc's content/reminder into the tool result content so the model sees it right after touching a matching path.
- Config table (glob → doc): `android/**` → android stop-and-ask rule; `src/pages/**` → reminder to load `app-domain` skill; `**/*.spec.tsx` → reminder to load `testing-standards` skill; `src/**/*.{ts,tsx}` → reminder to load `coding-standards` + `reactlynx-best-practices` skills; `.agents/**/*.md`, `.pi/**/*.md`, `AGENTS.md` → reminder to keep edits minimal and follow each file's own conventions.
- Why it exists: deterministic skill-loading reminders that fire on matching file paths — stronger than hoping skill descriptions alone trigger.
- Effort: medium (glob matching + per-session dedupe + doc reading).
- If kept: move all 5 `.github/instructions/*.instructions.md` files to `.pi/instructions/*.md`, stripped of Copilot `applyTo` frontmatter and replaced with a small glob key the extension reads (front-matter `glob:` field, per the resolved decision). `android.instructions.md` content stays intact (just relocated). `agentic-files.instructions.md` gets one content edit: its body says "any file in `.github/`" — update to the new locations (`.agents/`, `.pi/`, `AGENTS.md`). `pages.instructions.md` / `tests.instructions.md` / `typescript.instructions.md` also stay (relocated). Delete `.github/instructions/` after the move. Add the two folded-in rules to `AGENTS.md`.
- If dropped: delete `.github/instructions/` and fold the most important rule (android stop-and-ask) into `AGENTS.md` as a plain rule; the skill-loading reminders rely on skill descriptions alone.

## Verification (per kept piece)

- Piece A: confirm a sample android command is blocked with the reason message.
- Piece B: confirm the gated verify runs after a source-touching session and stays silent otherwise.
- Piece C: confirm the reminder fires on a sample edit under each configured glob.

## Decisions (resolved)

- Glob key format: front-matter field (`glob: 'src/pages/**'`) parsed by our extension. Keeps each doc self-contained.
- Extension shape: `.pi/extensions/<name>/index.ts` + colocated spec inside the directory (bare top-level `.ts` files in `.pi/extensions/` are each auto-loaded as extensions, so a sibling spec file would be loaded too).
- Off-limits: `runner-plan.md` and `navigation-plan.md` are active plans — never delete or modify them.
