# Runner

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

`bun android`

- runs dev server
- ensures the android emulator is running
- runs sparkling cli
- builds app and runs

## Quick Start

```bash
bun install
bun android
```

`bun android` starts emulator if needed, then builds, autolinks, copies assets, installs, and launches the Android app.

## Android Tools

```bash
bun adb:devices
```

Show connected devices.

```bash
bun avd:list
```

List emulators.

```bash
ANDROID_AVD="<name>" bun avd:start
```

Start a specific emulator.

## Dev Server

```bash
bun dev
```

Starts `rspeedy` and serves Lynx bundle URLs. Use when you want hot reload without installing APK each time.

## Build

```bash
bun build
```

Builds bundles and copies assets into `android/app/src/main/assets`.

## Tests

```bash
bun test
```

Run unit tests.

```bash
bun test:watch
```

Watch mode.

## Lint + Format

```bash
bun lint
```

Lint project.

```bash
bun lint:fix
```

Fix lint issues.

```bash
bun fmt
```

Format project.

```bash
bun fmt:check
```

Check formatting.

## Env Check

```bash
bun doctor
```

Checks Sparkling env.

## Notes

- Android SDK path comes from `ANDROID_HOME`, defaulting to `~/Library/Android/sdk`.
- `JAVA_HOME` falls back to JDK 17.
- `bun android` is the main day-to-day command.
- `bun dev` does not render UI by itself. It only serves bundles.
