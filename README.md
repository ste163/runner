# Runner

This project is set up for agentic development with [GitHub Copilot CLI](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/use-copilot-cli). Project skills and instructions live in `.github/skills/` and `.github/copilot-instructions.md`.

## Agentic Development

`AGENTS.md` is the entry point for all agents (CLI, IDE, cloud). It describes the repo, how to use the Lynx Docs MCP, and the verification commands.

### Structure

```
.github/
  agents/           # Custom agents (reactlynx-reviewer, test-generator)
  hooks/            # Hook scripts and helpers
  mcp.json          # Lynx Docs MCP — auto-loaded, provides Lynx API docs
  skills/           # Project-specific skills (see below)
  workflows/        # CI workflows (including doc-sync gate)
```

### Doc Sync

`scripts/verify-docs.ts` checks that `repo-navigation/SKILL.md` stays in sync with the actual codebase (pages, commands). Run it after any substantial change.

```bash
bun run verify-docs
```

## macOS Install

Install the Android pieces with Homebrew:

```bash
brew install --cask android-studio
brew install openjdk@17
```

Add this to `~/.zshrc`:

```bash
export JAVA_HOME="$(brew --prefix openjdk@17)/libexec/openjdk.jdk/Contents/Home"
export PATH="$JAVA_HOME/bin:$PATH"
export ANDROID_HOME="$HOME/Library/Android/sdk"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH"
```

In Android Studio's SDK Manager, install the Android 15 platform, Build Tools 35.0.0, and NDK 27.x or newer.

- `bun`
- `npm install -g typescript typescript-language-server` — required for LSP code intelligence in Copilot CLI (see `.github/lsp.json`)
- Android Studio, with Android SDK, platform-tools, and emulator

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
bun log:app
```

Watch Android logs while the device is plugged into the machine.

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
- `JAVA_HOME` should point at the Homebrew `openjdk@17` install path shown above.
- `adb` and emulator commands need Android SDK paths in `~/.zshrc`.
- `bun dev` is the main day-to-day command.
