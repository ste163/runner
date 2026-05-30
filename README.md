# Runner

This project is set up for agentic development with [GitHub Copilot CLI](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/use-copilot-cli). Project skills and instructions live in `.github/skills/` and `.github/copilot-instructions.md`.

## Agentic Development

`AGENTS.md` is the entry point for all agents (CLI, IDE, cloud). It describes the repo, how to use the Lynx Docs MCP, and the verification commands.

### Structure

```
.github/
  agents/           # Custom agents (reactlynx-reviewer, test-generator)
  hooks/            # Agent lifecycle hooks (verification on agentStop)
  mcp.json          # Lynx Docs MCP — auto-loaded, provides Lynx API docs
  skills/           # Project-specific skills (see below)
  workflows/        # CI workflows (including doc-sync gate)
```

### Doc Sync

`scripts/verify-docs.ts` checks that `repo-navigation/SKILL.md` stays in sync with the actual codebase (pages, commands). Runs on every PR as a hard gate and at the end of every agent session.

```bash
bun run verify-docs
```

## MacOS Install

- `bun`
- Android Studio, with Android SDK, platform-tools, and emulator
- `brew install --cask android-studio`
- `brew install openjdk@17`
- Add to `~/.zshrc`: `export JAVA_HOME="$(/usr/libexec/java_home -v 17)"`
- Or use Homebrew path: `export JAVA_HOME="$(brew --prefix openjdk@17)/libexec/openjdk.jdk/Contents/Home"`
- Add Android SDK to `~/.zshrc` so `adb` works: `export ANDROID_HOME="$HOME/Library/Android/sdk"`, `export ANDROID_SDK_ROOT="$ANDROID_HOME"`, `export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH"`

## Stack

- `bun` [package manager and runner]
- `Sparkling` [Android app shell + bridge]
- `Lynx` / `ReactLynx` [UI runtime]
- `rspeedy` [local dev server]
- `Vitest` [unit tests]
- `@lynx-js/react/testing-library` [Lynx test utils]
- `oxlint` and `oxfmt` [lint and format]
- `husky` and `lint-staged` [git hooks]

## Flow

`bun dev`

- ensures the android emulator is running
- runs rebuild + reinstall loop
- watches `src`, `app.config.ts`, and `lynx.config.ts`

`bun run smoke`

- one-shot build
- installs and launches Android app

`bun run clean`

- removes generated build output
- clears Android build caches

`bun run log`

- tails Android logcat

`bun run log:app`

- tails only app process logs
- app must be running first

## Quick Start

```bash
bun install
bun dev
```

`bun dev` is the main day-to-day command.

## Logs

```bash
adb logcat | tail -n 200
```

Watch Android logs while `bun dev` is running. Use `Ctrl+C` to stop.

## Dev Loop

```bash
bun dev
```

Starts the Android rebuild + reinstall loop.

## Build

```bash
bun build
```

Builds bundles and copies assets into `android/app/src/main/assets`.

## Tests

```bash
bun run test
```

Runs unit tests once.

```bash
bun run test:watch
```

Runs unit tests in watch mode.

```bash
bun run typecheck
```

Runs TypeScript typecheck only.

## Lint + Format

```bash
bun lint
```

Runs lint checks.

```bash
bun lint:fix
```

Auto-fixes lint issues.

```bash
bun fmt:check
```

Checks formatting.

```bash
bun fmt
```

Formats project.

## Notes

- Android SDK path comes from `ANDROID_HOME`, defaulting to `~/Library/Android/sdk`.
- `JAVA_HOME` falls back to JDK 17.
- `adb` and emulator commands need Android SDK paths in `~/.zshrc`.
- `bun dev` is the main day-to-day command.
