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

- ensures the android emulator is running
- runs sparkling cli
- builds app and runs

`bun android:static`

- installs the copied bundle into Android
- launches the app from local assets

`bun android:hot`

- runs Sparkling Android debug build
- uses remote dev bundle mode
- keeps the dev server and Android app in one flow

`bun debug`

- checks Sparkling Android env
- starts emulator if needed
- runs Sparkling Android in verbose mode

## Quick Start

```bash
bun install
bun android
```

`bun android` is the same as `bun android:static`.
`bun android:hot` is the single hot-reload entrypoint.
Use `bun debug` when you want a more chatty Android run path.

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

## Logs

```bash
adb logcat | tail -n 200
```

Watch Android logs while `bun android:hot` is running. Use `Ctrl+C` to stop.

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
bun run test
```

## Lint + Format

```bash
bun lint
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
