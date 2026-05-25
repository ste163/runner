# Agentic Setup Plan

## Goal

Set up this repo (a Lynx/ReactLynx Android app using `sparkling-app-cli`, `bun`, `Vitest`, `oxlint`) for
agentic development with GitHub Copilot CLI — including cloud agent via `/delegate`.

## What Good Looks Like

- `.github/` is the source of truth for project-specific agent config: skills, cloud agent setup, instructions.
- `AGENTS.md` is a lightweight shared entry point — identity, pointer to skills, minimal behavior rules.
- Lynx community skills live in `.github/skills/` so they travel with the repo.
- Cloud agent (`/delegate`) can install deps and run verification commands without trial and error.
- The setup is maintainable and doesn't duplicate content across files.
- README says the repo is ready for agentic development with Copilot CLI.

## Instruction Hierarchy

```
AGENTS.md                          ← root, shared, minimal: repo identity + behavior rules
.github/copilot-instructions.md    ← IDE Copilot (not CLI) repo-wide instructions
.github/instructions/*.md          ← path-scoped IDE instructions (only if needed)
.github/skills/                    ← project-scoped skills (CLI)
```

**`AGENTS.md` covers:**

- What this repo is (Lynx/ReactLynx Android fitness app, `sparkling-app-cli` shell)
- Stack summary: bun, Lynx, ReactLynx, Vitest, oxlint, oxfmt
- Verification commands in order: `bun typecheck` → `bun test` → `bun lint`
- Pointer to `.github/skills/` for skill list
- Pointer to `https://lynxjs.org/llms.txt` for Lynx docs
- Agent behavior rules: minimal changes, ask before risky ops, no broad rewrites

**`.github/` owns all project-specific detail** — skills, cloud env, path rules.

## Skills (`.github/skills/`)

### Community Lynx skills (download from awesome-copilot or `gh skill install`)

- `lynx-typescript`
- `reactlynx-best-practices`
- `lynx-ui`
- `lynx-devtool`
- `trace-analysis`
- `trace-record`
- `debug-info-remapping`

### Repo-specific skills

- `repo-navigation`: layout of `src/`, `scripts/`, `android/`, `resource/`; which commands do what; where tests live.

## Plan

1. Create `.github/skills/repo-navigation/SKILL.md` — repo layout, commands, test locations. ✅
2. Copy Lynx community skills into `.github/skills/`. ✅
3. Create `AGENTS.md` at repo root — identity, stack, verification order, pointer to skills + Lynx docs, behavior rules. ✅
4. Create `.github/copilot-instructions.md` — IDE Copilot guidance. ✅
5. Update `README.md` — mention Copilot CLI agentic development support.
6. Verify: run `/skills list` in CLI session, confirm skills load; test a real prompt; run `bun typecheck && bun test && bun lint`.

## Design Rules

- `.github/skills/` owns Lynx knowledge. `AGENTS.md` does not duplicate it.
- `AGENTS.md` stays under ~60 lines. No copy-paste of README content.
- `copilot-setup-steps.yml` covers only what cloud agent can actually run (no Android emulator).
- Add path-specific `.github/instructions/` files only if a concrete IDE workflow needs them.
- Community Lynx skills preferred over custom rewrites.

## Verification

- `/skills list` in CLI shows all `.github/skills/` entries.
- `bun typecheck`, `bun test`, `bun lint` pass after any agent-assisted changes.
- Real prompt test: ask Copilot to explain the ReactLynx component structure using the Lynx skills.

## Definition of Done

- `.github/skills/` contains `repo-navigation` + all Lynx community skills.
- `AGENTS.md` exists at root, stays minimal, points to `.github/skills/`.
- `README.md` mentions Copilot CLI agentic support.
