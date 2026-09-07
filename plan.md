# Plan: Port `.github/` Copilot CLI setup → pi

## Findings (why each move)

Pi resource model differs from Copilot CLI:

- Skills: pi auto-discovers `.agents/skills/` (project) + `~/.pi/agent/skills` (global) or `.pi/skills/`. It does **not** read `.github/skills/`.
- Agents (subagents): pi core has **no built-in subagent runtime** (confirmed in `docs/usage.md` design principles). `.github/agents/*.agent.md` need a different shape — prompt templates (`.pi/prompts/*.md`, invoked as `/name`) are the closest native equivalent (expand into the main agent's own turn, no isolated sub-session/model override).
- MCP: pi reads `mcpServers` from `~/.pi/agent/mcp.json` (global, confirmed present and in use for `codebase-memory-mcp`). Project-level `.mcp.json` at the repo root is confirmed as a real pi-mcp-adapter config layer (its README lists the full precedence chain). Decision: use `.mcp.json` at the project root — tool-agnostic, so any harness (pi, Copilot, Cursor, etc.) can use it. pi-mcp-adapter reads it as a normal project config layer.
- LSP: pi-lens (installed as a package in this setup) already ships 45 built-in language-server definitions including `typescript-language-server`, auto-discovered from PATH and project `node_modules`. `.github/lsp.json` is dead Copilot config — delete it outright. No relocation, no extension work.
- Hooks: pi has no external hook-config file; equivalent behavior is an extension using `pi.on(...)`:
  - `preToolUse` deny (android commands) → `tool_call` event, block bash matching pattern (Part 2, piece A).
  - `agentStop` verify script → `agent_settled` event running the same checks (Part 2, piece B).
  - `sessionStart` prompt → no direct equivalent; skip (skill description-based auto-load already covers it).
- Path-scoped instructions (`applyTo` glob in `.github/instructions/*.instructions.md`): no native pi equivalent (only whole-file `AGENTS.md`/`CLAUDE.md`, no glob-scoped auto-inject). Replacing this needs a custom extension (Part 2, piece C).
- Docs staleness checks (`bun run verify-docs`, `scripts/verify-docs.ts`, `doc-sync-check.yml`): hardcoded to check `.github/skills`/`.github/agents` mentions in markdown. Per user: codebase-memory-mcp now provides live structural truth, so this static-doc-sync mechanism is redundant → remove.

## Part 1 — pi-native pieces (resolve today)

No new extensions. Moves, deletions, config files, and doc rewrites only.

1. **Move skills**: `git mv .github/skills` → `.agents/skills/` (project-level, discovered automatically by pi — confirmed in `docs/skills.md`). All 10 skills already have valid `name` + `description` frontmatter, so no frontmatter edits are needed. Update every internal relative reference (scripts paths stay relative, fine as-is).
2. **Convert agents → prompt templates**: create `.pi/prompts/{debug,performance-investigator,reactlynx-reviewer,test-generator}.md`, ported from `.github/agents/*.agent.md`:
   - Keep `description` frontmatter (used for autocomplete).
   - Drop `model:` field (pi prompt templates don't support per-invocation model override) — note the intended model as a body comment only if useful.
   - Reword internal skill references from `` `/skill-name` `` to explicit "Load skill `skill-name`" phrasing to avoid confusion with pi's `/skill:name` command syntax.
   - Delete `.github/agents/`.
3. **MCP config**: create `.mcp.json` at the project root with the `lynx-docs` server. Convert the Copilot shape (`"type": "local"`, `"tools": ["*"]`) to pi's shape — `{ "command": "npx", "args": ["-y", "@lynx-js/docs-mcp-server@latest"], "lifecycle": "eager" }`, matching the working global file. Leave `codebase-memory-mcp` in the existing global `~/.pi/agent/mcp.json` (already working). Delete `.github/mcp.json`. Verify with `mcp()` status after reload. Resolved: `.mcp.json` at the project root — tool-agnostic, so any harness can use it; pi-mcp-adapter reads it as a normal project config layer. Fallback if project-level config is ignored: add `lynx-docs` to the global `~/.pi/agent/mcp.json` (lives in the dotfiles repo — a separate commit there).
4. **LSP config**: delete `.github/lsp.json` entirely. pi-lens (already installed as a package) ships 45 built-in language-server definitions including `typescript-language-server`, auto-discovered from PATH and project `node_modules` — the Copilot LSP config is dead code. No relocation, no hand-built extension needed.
5. **`copilot-instructions.md` → `AGENTS.md`**: merge its Stack/Verification content into root `AGENTS.md` (already largely duplicated there); delete `.github/copilot-instructions.md`.
6. **Doc-sync removal** (per user: codebase-memory-mcp replaces this):
   - Delete `scripts/verify-docs.ts`.
   - Remove `"verify-docs"` script from `package.json`.
   - Delete `.github/workflows/doc-sync-check.yml`.
   - Remove `bun run verify-docs` mentions from `AGENTS.md`, `README.md` (Doc Sync section), `scripts/README.md` (verify-docs.ts bullet), and `.husky/pre-commit` (drop the trailing `bun run verify-docs` from the hook chain — otherwise the git hook breaks). If Part 2 piece B is kept, its verify command also excludes verify-docs.
7. **Rewrite root `AGENTS.md`** (native parts only; the folded-in rules from the old step 6 move to Part 2 piece C):
   - Drop the `caveman` skill reference (the skill does not exist in the repo — remove it fully, do not create it).
   - Update "Skills live in `.github/skills/`" → `.agents/skills/`.
   - Update "Custom agents live in `.github/agents/`" → describe as prompt templates in `.pi/prompts/` (`/debug`, `/performance-investigator`, `/reactlynx-reviewer`, `/test-generator`).
   - Add MCP note: `lynx-docs` via `.mcp.json` (project root, tool-agnostic), `codebase-memory-mcp` via global `~/.pi/agent/mcp.json` — mention `codebase_memory_mcp_*` tools as the primary code-navigation source (supersedes needing to keep docs manually in sync).
   - Drop the `bun run verify-docs` line from Verification.
8. **`repo-navigation` skill**: remove the Copilot-specific "`sessionStart` hook. No task — orient silently" line (no pi equivalent). Also fix the stale intro line "two Lynx pages (`main`, `second`)" — actual pages are `home`, `workout`, `activeWorkout`, `onboarding`, `graphs` (matches the layout block below it). Update any `.github/skills`/`.github/agents` path mentions inside it (if present) to new locations.
9. **Further doc cleanup** (per your note — sweep beyond the obvious Copilot artifacts):
   - Grep whole repo for remaining `.github/skills`, `.github/agents`, `.github/copilot-instructions.md`, `.github/mcp.json`, `.github/lsp.json`, `.github/hooks`, `.github/instructions`, and `caveman` references (READMEs, `scripts/README.md`, code comments, CI configs) and update them.
   - Check `.github/` for any other Copilot-CLI-only leftovers not yet covered (e.g. stray `.github/copilot/` dirs, issue/PR templates referencing Copilot workflows) and flag for removal/update.
   - Re-check `AGENTS.md` and skill docs for any other now-stale doc-sync/Copilot-specific wording once verify-docs is gone.
   - Do NOT touch `runner-plan.md` or `navigation-plan.md` — active plans, never delete.
10. **Part 1 verification**: run `bun typecheck && bun test && bun lint` (no more `verify-docs`), confirm `mcp()` still shows `codebase-memory-mcp` connected and `lynx-docs` newly connected after `.mcp.json` added (fallback: global mcp.json, see step 3), confirm skills list via a fresh session shows the moved skills. Note: the first pi run after `.pi/` appears will prompt for project trust — accept it so project-local resources load.

## Part 2 — pieces that need custom extensions (decide importance)

Any new extension is a separate piece of work. Each piece below replaces one Copilot hook/instruction mechanism. Decide per piece whether to keep it, drop it, or fold a weaker version into `AGENTS.md`.

Shared setup for any kept piece:

- Extension lives at `.pi/extensions/<name>/index.ts` + colocated `index.spec.ts`. Directory shape, not a bare `.ts` file: pi auto-loads every top-level `.ts` in `.pi/extensions/` as its own extension, so a sibling spec file would be loaded as an extension too. Only `index.ts` is the entry point per subdirectory (same hard rule as the dotfiles `pi-extension-development` project).
- Tooling: add `@earendil-works/pi-coding-agent@0.85.1` (exact pin, matches installed pi 0.85.1) to the runner repo's devDependencies so `bun typecheck` resolves the extension types. Specs run under the existing Vitest setup. Follow the dotfiles extension conventions: injectable deps (no real disk I/O in tests), no `await` in loops, colocated specs. Reference implementations: `plan-mode` and `codebase-memory-mcp-enforcer` in the dotfiles repo.
- Project-local extensions load only after project trust.
- For each kept piece: build the extension, verify it fires, then delete the replaced `.github/hooks/` file (or the whole `.github/hooks/` dir once both hook pieces are replaced). `.github/hooks/verification.json` is Copilot-only config — delete regardless of piece decisions.

### Piece A — android command block (replaces `pre-tool.sh`)

- What it does: `tool_call` handler that blocks `bash` commands matching `bun (run build|dev|run smoke|run android|run log)` with the same reason message as today ("requires macOS + Android SDK + a connected emulator. Verify your environment and run it manually if ready.").
- Why it exists: deterministic guard against wasted attempts on commands that cannot work in this environment.
- Effort: small (one handler, `isToolCallEventType("bash", event)`).
- If dropped: delete `.github/hooks/pre-tool.sh` and add a plain AGENTS.md rule (weaker — model-dependent, not enforced).

### Piece B — verify-on-settle (replaces `verify.sh` / `agentStop` hook)

- What it does: `agent_settled` handler running `bun typecheck && bun test && bun lint` via `createLocalBashOperations`, surfacing failures via `ctx.ui.notify`. Gated: run only when the session touched source files (track `read`/`edit`/`write` paths in the same extension), so long sessions do not re-run the full suite on every settle.
- Why it exists: automatic verification after agent work, same as the Copilot `agentStop` hook.
- Effort: medium (path tracking + gated exec).
- If dropped: delete `.github/hooks/verify.sh`; verification becomes manual (the AGENTS.md Verification section already documents the commands).

### Piece C — glob-based doc loader (replaces `applyTo` instructions)

- What it does: declarative glob → doc map, checked on `tool_call`/`tool_result` for `read`/`edit`/`write` (matched against `event.input.path`). On first match per file per session, append the referenced doc's content/reminder into the tool result content so the model sees it right after touching a matching path.
- Config table (glob → doc): `android/**` → android stop-and-ask rule; `src/pages/**` → reminder to load `app-domain` skill; `**/*.spec.tsx` → reminder to load `testing-standards` skill; `src/**/*.{ts,tsx}` → reminder to load `coding-standards` + `reactlynx-best-practices` skills; `.agents/**/*.md`, `.pi/**/*.md`, `AGENTS.md` → reminder to keep edits minimal and follow each file's own conventions.
- Why it exists: deterministic skill-loading reminders that fire on matching file paths — stronger than hoping skill descriptions alone trigger.
- Effort: medium (glob matching + per-session dedupe + doc reading).
- If kept: move all 5 `.github/instructions/*.instructions.md` files to `.pi/instructions/*.md`, stripped of Copilot `applyTo` frontmatter and replaced with a small glob key the extension reads (front-matter `glob:` field, per the resolved decision). `android.instructions.md` content stays intact (just relocated). `agentic-files.instructions.md` gets one content edit: its body says "any file in `.github/`" — update to the new locations (`.agents/`, `.pi/`, `AGENTS.md`). `pages.instructions.md` / `tests.instructions.md` / `typescript.instructions.md` also stay (relocated). Delete `.github/instructions/` after the move. Add the two folded-in rules to `AGENTS.md` (Part 1 step 7).
- If dropped: delete `.github/instructions/` and fold the most important rule (android stop-and-ask) into `AGENTS.md` as a plain rule; the skill-loading reminders rely on skill descriptions alone.

### Part 2 verification (per kept piece)

- Piece A: confirm a sample android command is blocked with the reason message.
- Piece B: confirm the gated verify runs after a source-touching session and stays silent otherwise.
- Piece C: confirm the reminder fires on a sample edit under each configured glob.

## Decisions (resolved)

- Glob key format: front-matter field (`glob: 'src/pages/**'`) parsed by our extension. Keeps each doc self-contained.
- Extension shape: `.pi/extensions/<name>/index.ts` + colocated spec inside the directory (bare top-level `.ts` files in `.pi/extensions/` are each auto-loaded as extensions, so a sibling spec file would be loaded too).
- Model pinning: drop the per-agent `model:` fields. The pins are `gpt-5.4-mini` — dead anyway now that the project runs on Ollama. pi prompt templates do not carry model overrides.
- LSP: delete `.github/lsp.json` outright — pi-lens already provides `typescript-language-server` (45 built-in server definitions, auto-discovered from PATH and project `node_modules`). No extension work needed.
- `caveman`: remove fully from the repo (AGENTS.md reference + any other mentions). Do not create the skill.
- Off-limits: `runner-plan.md` and `navigation-plan.md` are active plans — never delete or modify them.
- MCP: `.mcp.json` at the project root (tool-agnostic, any harness can use it).
