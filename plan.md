# Plan: Extensions to Create

Part 1 (the pi-native port) is complete: skills in `.agents/skills/`, prompt templates in `.pi/prompts/`, `lynx-docs` in `.mcp.json`, LSP config deleted, AGENTS.md rewritten, verify-docs updated, repo-navigation removed, app-domain trimmed to domain-only.

What remains: one global extension in the dotfiles repo — `file-path-rules`. `hooks` is complete and live-verified.

## Shared setup (dotfiles repo)

- Extension lives at `pi-extension-development/extensions/<name>/index.ts` + colocated `*.spec.ts` files. No bare top-level `.ts` files in `extensions/` (pi auto-loads each as its own extension).
- Mandatory checklist before any extension work is done: `npm run typecheck`, `npm run lint`, `npm run format`, `npm test` — all must pass, with 100% line/branch/function coverage for the extension's files.
- Testing rules: no real disk I/O, no `process.chdir`, no temp directories — injectable deps (the `PlanModeDeps` pattern); no loops with `await` inside (recursion instead); specs colocate with the code they test.
- Extensions load for every project; each project supplies its own config.

## Extension 1: `hooks` (global, dotfiles repo) — complete

Config-driven shell hooks — the Copilot CLI / Claude Code model. The extension only wires pi events to shell commands; the policy lives in the scripts, not in TypeScript.

### Mechanism (dotfiles: `pi-extension-development/extensions/hooks/`)

- Reads `.pi/hooks.json` from the project root. Missing file → no-op. Invalid config → one warning notification on `session_start`.
- `tool_call` hook: the tool input JSON is passed as the last shell-quoted argument. Non-zero exit (or kill) blocks the tool call with stdout as the reason. `tools` filters which tool names trigger it.
- `agent_settled` hook: the command runs when the agent settles. `when: "dirty"` + `paths` gates it on edit/write of matching files (`/**` suffix = prefix match, otherwise exact). A `status` label renders a dedicated widget section below the editor (the pi-lens pattern — `setWidget` with `placement: "belowEditor"`, not `setStatus`, since all setStatus texts share one footer line with no key labels): `hooks  <label>, running/complete/failed` with theme colors (dim/success/error), cleared on `session_start`. Non-zero exit notifies an error with the output tail; success notifies the output tail. A `running` guard prevents overlapping runs; dirty clears after each run.
- Files: `index.ts`, `deps.ts` (DI seam: `exec`/`readFile`/`cwd`), `config.ts` (schema + validation), `match.ts` (shell quoting + path matching), plus 3 colocated specs. All four dotfiles gates pass; hooks files at 100% coverage.

### Runner config (`.pi/hooks.json`)

- `tool_call` → `sh scripts/hooks/pre-tool.sh`, `tools: ["bash"]`.
- `agent_settled` → `sh scripts/hooks/verify.sh`, `when: "dirty"`, `status: "Verification"`, paths: `src/**`, `scripts/**`, `.agents/**`, `.pi/**`, `app.config.ts`, `lynx.config.ts`, `vitest.config.ts`, `AGENTS.md`, `package.json`.

### Runner scripts (`scripts/hooks/`)

- `pre-tool.sh`: reads the tool input JSON from `$1`, blocks `bun run build`, `bun run dev`, `bun dev`, `bun run smoke`, `bun run android`, `bun run log` (original 5 + `bun run dev` — the `dev` script is android-only, a gap in the original). Exit 1 with the reason message on match. Tested manually.
- `verify.sh`: `bun typecheck && bun run test && bun lint && bun run verify-docs` (note `bun run test`, not `bun test` — bun's native runner ignores `vitest.config.ts` and fails on Lynx component specs). Tested manually.

### Live verification (done)

- Blocked `bun run build` with the exact reason message; normal commands pass.
- Absolute-path edit to `AGENTS.md` triggered the verify chain at settle — notification showed "✓ typecheck + test + lint + doc-sync passed".
- `.github/hooks/` deleted.

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

- `hooks`: confirm a sample android command is blocked with the reason message; confirm the gated verify runs after a source-touching session and stays silent otherwise.
- `file-path-rules`: confirm the reminder fires on a sample edit under each configured glob.

## Decisions (resolved)

- Extension name `hooks`: the standard term across Copilot CLI (`.github/hooks/`), Claude Code (`hooks` key in settings.json), and Codex CLI (`~/.codex/hooks/`). Directly replaces `.github/hooks/`.
- Hooks design: config-driven — the extension wires events to shell commands; policy lives in the scripts (the Copilot CLI / Claude Code model). No TypeScript policy duplication.
- Extension name `file-path-rules`: aligns with Claude Code (`.claude/rules/`) and Cursor (`.cursor/rules/`) terminology; the `file-path-` prefix makes the scope obvious.
- Rules key format: front-matter field (`paths: 'src/pages/**'`) parsed by the global extension. Keeps each doc self-contained. Matches Claude Code's rules frontmatter.
- Extension shape: `pi-extension-development/extensions/<name>/index.ts` + colocated specs inside the directory (bare top-level `.ts` files in `extensions/` are each auto-loaded as extensions, so a sibling spec file would be loaded too).
- Off-limits: `runner-plan.md` and `navigation-plan.md` are active plans — never delete or modify them.
