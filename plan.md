# Plan: file-path-rules Extension

Part 1 (the pi-native port) is complete: skills in `.agents/skills/`, prompt templates in `.pi/prompts/`, `lynx-docs` in `.mcp.json`, LSP config deleted, AGENTS.md rewritten, verify-docs updated, repo-navigation removed, app-domain trimmed to domain-only. The `hooks` extension is also complete and live-verified.

What remains: one global extension in the dotfiles repo — `file-path-rules`.

## Shared setup (dotfiles repo)

- Extension lives at `pi-extension-development/extensions/<name>/index.ts` + colocated `*.spec.ts` files. No bare top-level `.ts` files in `extensions/` (pi auto-loads each as its own extension).
- Mandatory checklist before any extension work is done: `npm run typecheck`, `npm run lint`, `npm run format`, `npm test` — all must pass, with 100% line/branch/function coverage for the extension's files.
- Testing rules: no real disk I/O, no `process.chdir`, no temp directories — injectable deps (the `PlanModeDeps` pattern); no loops with `await` inside (recursion instead); specs colocate with the code they test.
- Extensions load for every project; each project supplies its own config.

## Extension: `file-path-rules` (global, dotfiles repo)

- What it does: declarative glob → doc map, checked on `tool_call`/`tool_result` for `read`/`edit`/`write` (matched against `event.input.path`). On first match per file per session, append the referenced doc's content/reminder into the tool result content so the model sees it right after touching a matching path.
- Why it exists: deterministic skill-loading reminders that fire on matching file paths — stronger than hoping skill descriptions alone trigger.
- The mechanism is generic (glob matching + per-session dedupe + doc reading); only the config is per-project. Each project supplies its config as `.pi/rules/*.md` files with a `paths:` front-matter field the extension reads.
- Runner repo work (config only, no mechanism):
  - Move all 5 `.github/instructions/*.instructions.md` files to `.pi/rules/*.md`, stripped of Copilot `applyTo` frontmatter, replaced with the `paths:` field.
  - Config table (paths → doc): `android/**` → android stop-and-ask rule; `src/pages/**` → reminder to load `app-domain` skill; `**/*.spec.tsx` → reminder to load `testing-standards` skill; `src/**/*.{ts,tsx}` → reminder to load `coding-standards` + `reactlynx-best-practices` skills; `.agents/**/*.md`, `.pi/**/*.md`, `AGENTS.md` → reminder to keep edits minimal and follow each file's own conventions.
  - `android.instructions.md` content stays intact (just relocated). `agentic-files.instructions.md` gets one content edit: its body says "any file in `.github/`" — update to the new locations (`.agents/`, `.pi/`, `AGENTS.md`). `pages.instructions.md` / `tests.instructions.md` / `typescript.instructions.md` also stay (relocated).
  - Delete `.github/instructions/` after the move. Add the two folded-in rules to `AGENTS.md`.

## Verification

- `file-path-rules`: confirm the reminder fires on a sample edit under each configured glob.

## Decisions (resolved)

- Extension name `file-path-rules`: aligns with Claude Code (`.claude/rules/`) and Cursor (`.cursor/rules/`) terminology; the `file-path-` prefix makes the scope obvious.
- Rules key format: front-matter field (`paths: 'src/pages/**'`) parsed by the global extension. Keeps each doc self-contained. Matches Claude Code's rules frontmatter.
- Extension shape: `pi-extension-development/extensions/<name>/index.ts` + colocated specs inside the directory (bare top-level `.ts` files in `extensions/` are each auto-loaded as extensions, so a sibling spec file would be loaded too).
- Off-limits: `runner-plan.md` and `navigation-plan.md` are active plans — never delete or modify them.
