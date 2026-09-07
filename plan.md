# Plan: Port `.github/` Copilot CLI setup → pi

## Findings (why each move)

Pi resource model differs from Copilot CLI:

- Skills: pi auto-discovers `.agents/skills/` (project) + `~/.pi/agent/skills` (global) or `.pi/skills/`. It does **not** read `.github/skills/`.
- Agents (subagents): pi core has **no built-in subagent runtime** (confirmed in `docs/usage.md` design principles). `.github/agents/*.agent.md` need a different shape — prompt templates (`.pi/prompts/*.md`, invoked as `/name`) are the closest native equivalent (expand into the main agent's own turn, no isolated sub-session/model override).
- MCP: pi reads `mcpServers` from `~/.pi/agent/mcp.json` (global, confirmed present and in use for `codebase-memory-mcp`). Project-level `.pi/mcp.json` follows the same global/project pairing pattern as `settings.json`, `extensions/`, `skills/` — needs a quick empirical check but is the correct location, not `.github/mcp.json` (never read by pi).
- LSP: pi does support LSP servers via an extension (user will hand-build/add this extension). Do not drop `.github/lsp.json` outright — keep its config (`typescript-language-server`, file-extension map) as the reference source and migrate it into whatever config shape the user's pi LSP extension expects once written. Out of scope for this pass beyond preserving the source config.
- Hooks: pi has no external hook-config file; equivalent behavior is an extension using `pi.on(...)`:
  - `preToolUse` deny (android commands) → `tool_call` event, block bash matching pattern.
  - `agentStop` verify script → `agent_settled` event running the same checks.
  - `sessionStart` prompt → no direct equivalent; skip (skill description-based auto-load already covers it).
- Path-scoped instructions (`applyTo` glob in `.github/instructions/*.instructions.md`): no native pi equivalent (only whole-file `AGENTS.md`/`CLAUDE.md`, no glob-scoped auto-inject) — but we can **build this ourselves** as part of the guardrail extension: a declarative glob → doc-file map, checked on `tool_call`/`tool_result` for `read`/`edit`/`write` (and matched against `event.input.path`). On first match per file per session, append the referenced doc's content/reminder into the tool result content so the model sees it right after touching a matching path. This fully replaces Copilot CLI's `applyTo` mechanism instead of just discarding it.
  - Keep the instruction docs themselves, relocated to `.pi/instructions/*.md` (project-local convention, read by our own extension — not a pi built-in).
  - Config table (glob → doc): `android/**` → android stop-and-ask rule; `src/pages/**` → reminder to load `app-domain` skill; `**/*.spec.tsx` → reminder to load `testing-standards` skill; `src/**/*.{ts,tsx}` → reminder to load `coding-standards` + `reactlynx-best-practices` skills; `.agents/**/*.md`, `.pi/**/*.md`, `AGENTS.md` → reminder to load `caveman` skill (compressed editing style).
- Docs staleness checks (`bun run verify-docs`, `scripts/verify-docs.ts`, `doc-sync-check.yml`): hardcoded to check `.github/skills`/`.github/agents` mentions in markdown. Per user: codebase-memory-mcp now provides live structural truth, so this static-doc-sync mechanism is redundant → remove.

## Steps

1. **Move skills**: `git mv .github/skills` → `.agents/skills/` (project-level, discovered automatically by pi). Update every internal relative reference (scripts paths stay relative, fine as-is). Note: `caveman`'s body uses `$ARGUMENTS` — a pi prompt-template variable, not a skill feature; under pi `/skill:caveman lite` appends `User: lite` and the literal stays. Cosmetic, not blocking — leave as-is.
2. **Convert agents → prompt templates**: create `.pi/prompts/{debug,performance-investigator,reactlynx-reviewer,test-generator}.md`, ported from `.github/agents/*.agent.md`:
   - Keep `description` frontmatter (used for autocomplete).
   - Drop `model:` field (pi prompt templates don't support per-invocation model override) — note the intended model as a body comment only if useful.
   - Reword internal skill references from `` `/skill-name` `` to explicit "Load skill `skill-name`" phrasing to avoid confusion with pi's `/skill:name` command syntax.
   - Delete `.github/agents/`.
3. **MCP config**: create `.pi/mcp.json` with the `lynx-docs` server. Convert the Copilot shape (`"type": "local"`, `"tools": ["*"]`) to pi's shape — `{ "command": "npx", "args": ["-y", "@lynx-js/docs-mcp-server@latest"], "lifecycle": "eager" }`, matching the working global file. Leave `codebase-memory-mcp` in the existing global `~/.pi/agent/mcp.json` (already working). Delete `.github/mcp.json`. Verify with `mcp()` status after reload. Fallback if pi ignores project-level `.pi/mcp.json` (undocumented in pi docs): add `lynx-docs` to the global `~/.pi/agent/mcp.json` instead.
4. **LSP config**: keep `.github/lsp.json`'s content, relocate as reference to `.pi/lsp.json` (or inline in the note) for the user's own hand-built pi LSP extension. No deletion — this is not-yet-built by us, user is adding that extension manually. Plan just preserves/moves the source config so it's ready to wire in.
5. **Hooks → pi extension** (`.pi/extensions/guardrails.ts`):
   - Port `pre-tool.sh` regex (block `bun (run build|dev|run smoke|run android|run log)`) into a `tool_call` handler that blocks matching `bash` commands with the same reason message.
   - Port `verify.sh` into an `agent_settled` handler running `bun typecheck && bun test && bun lint` (drop `bun run verify-docs`, see step 8) via the bash-equivalent (`node:child_process` or reuse `createLocalBashOperations`), surfacing failures via `ctx.ui.notify`. Gate it: run only when the session touched source files (track `read`/`edit`/`write` paths in the same extension), so long sessions do not re-run the full suite on every settle.
   - Delete `.github/hooks/`.
6. **Instructions folder → guardrail-driven doc loader** (supersedes plain deletion):
   - Move all 5 `.github/instructions/*.instructions.md` files to `.pi/instructions/*.md`, stripped of Copilot `applyTo` frontmatter and replaced with a small glob key our extension reads (either front-matter `glob:` or a manifest JSON alongside them).
   - Extend `.pi/extensions/guardrails.ts` (see step 5) with the glob → doc map behavior described above, so touching `android/**`, `src/pages/**`, `**/*.spec.tsx`, `src/**/*.{ts,tsx}`, or `.agents|.pi|AGENTS.md` paths auto-surfaces the right reminder inline in the tool result.
   - `android.instructions.md` content stays intact (just relocated) since the extension now injects it contextually instead of via Copilot's native `applyTo`.
   - `agentic-files.instructions.md` gets one content edit: its body says "any file in `.github/`" — update to the new locations (`.agents/`, `.pi/`, `AGENTS.md`) to match the new glob.
   - `pages.instructions.md` / `tests.instructions.md` / `typescript.instructions.md` also stay (relocated) — the injected reminder is stronger/more reliable than hoping skill descriptions alone trigger, since it fires deterministically on matching file paths.
   - Delete `.github/instructions/` after the move.
7. **`copilot-instructions.md` → `AGENTS.md`**: merge its Stack/Verification content into root `AGENTS.md` (already largely duplicated there); delete `.github/copilot-instructions.md`.
8. **Doc-sync removal** (per user: codebase-memory-mcp replaces this):
   - Delete `scripts/verify-docs.ts`.
   - Remove `"verify-docs"` script from `package.json`.
   - Delete `.github/workflows/doc-sync-check.yml`.
   - Remove `bun run verify-docs` mentions from `AGENTS.md`, the new `guardrails.ts` stop-check, `README.md` (Doc Sync section), `scripts/README.md` (verify-docs.ts bullet), and `.husky/pre-commit` (drop the trailing `bun run verify-docs` from the hook chain — otherwise the git hook breaks).
9. **Rewrite root `AGENTS.md`**:
   - Update "Skills live in `.github/skills/`" → `.agents/skills/`.
   - Update "Custom agents live in `.github/agents/`" → describe as prompt templates in `.pi/prompts/` (`/debug`, `/performance-investigator`, `/reactlynx-reviewer`, `/test-generator`).
   - Add MCP note: `lynx-docs` via `.pi/mcp.json`, `codebase-memory-mcp` via global `~/.pi/agent/mcp.json` — mention `codebase_memory_mcp_*` tools as the primary code-navigation source (supersedes needing to keep docs manually in sync).
   - Add the two folded-in rules from step 6.
   - Drop the `bun run verify-docs` line from Verification.
10. **`repo-navigation` skill**: remove the Copilot-specific "`sessionStart` hook. No task — orient silently" line (no pi equivalent). Also fix the stale intro line "two Lynx pages (`main`, `second`)" — actual pages are `home`, `workout`, `activeWorkout`, `onboarding`, `graphs` (matches the layout block below it). Update any `.github/skills`/`.github/agents` path mentions inside it (if present) to new locations.
11. **Further doc cleanup** (per your note — sweep beyond the obvious Copilot artifacts):
    - Grep whole repo for remaining `.github/skills`, `.github/agents`, `.github/copilot-instructions.md`, `.github/mcp.json`, `.github/lsp.json`, `.github/hooks`, `.github/instructions` path references (READMEs, `scripts/README.md`, code comments, CI configs) and update them.
    - Check `.github/` for any other Copilot-CLI-only leftovers not yet covered (e.g. stray `.github/copilot/` dirs, issue/PR templates referencing Copilot workflows) and flag for removal/update.
    - Re-check `AGENTS.md` and skill docs for any other now-stale doc-sync/Copilot-specific wording once verify-docs is gone.
12. **Final check**: after moves, run `bun typecheck && bun test && bun lint` (no more `verify-docs`), confirm `mcp()` still shows `codebase-memory-mcp` connected and `lynx-docs` newly connected after `.pi/mcp.json` added (fallback: global mcp.json, see step 3), confirm skills list via a fresh session shows the moved skills, confirm the guardrail extension fires on a sample edit under each configured glob. Note: the first pi run after `.pi/` appears will prompt for project trust — accept it so project-local resources load.

## Decisions (resolved)

- Glob key format: front-matter field (`glob: 'src/pages/**'`) parsed by our extension. Keeps each doc self-contained.
- Write `.pi/extensions/guardrails.ts` (TypeScript, full process permissions per pi's no-sandbox model) covering the android-command block, the gated verify-on-settle, and the glob-based doc injection.
- Model pinning: drop the per-agent `model:` fields. The pins are `gpt-5.4-mini` — dead anyway now that the project runs on Ollama. pi prompt templates do not carry model overrides.
- LSP: relocate `.github/lsp.json` → `.pi/lsp.json` verbatim, and add one AGENTS.md line that it is pending wiring into the user's hand-built pi LSP extension.
