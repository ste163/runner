# Sparkling + Lynx Android Hot Reload Plan

## Goal

Get the Android dev flow in this repo working reliably for Sparkling/Lynx, using the Sparkling-supported refresh path first.

## Decision

- Try Sparkling-supported page reload or equivalent dev refresh first.
- If that fails, use rebuild + reinstall on change.
- Do not spend effort faking HMR if Sparkling already has a supported refresh path.

## Current Repo State

- Bun is the package manager and script runner.
- Sparkling app scaffold is in place.
- Android-only work is the current focus.
- Vitest, `oxlint`, `oxfmt`, Husky, and lint-staged are already wired.
- Android dev loop is centralized in `dev`.
- Old Android command wrappers removed.

## Relevant Scripts

- `dev`: `sh ./scripts/android-dev.sh`

## Current Dev Config

### `app.config.ts`

- Uses `defineConfig` from `@lynx-js/rspeedy`.
- Defines `lynxConfig` with:
  - `source.entry.main = ./src/pages/main/index.tsx`
  - `source.entry.second = ./src/pages/second/index.tsx`
  - `output.assetPrefix = asset:///`
  - `output.filename.bundle = [name].lynx.bundle`
  - `pluginQRCode()` with `?fullscreen=true`
  - `pluginReactLynx()`
- App config sets:
  - `appName = runner`
  - Android package name `com.example.sparkling.go`
  - `dev.port = 3000`
  - Android assets path `android/app/src/main/assets`

### `lynx.config.ts`

- Same basic rspeedy Lynx config as `app.config.ts`, but without Sparkling app wrapper fields.

### `package.json`

- Exact versions are pinned.
- Relevant versions:
  - `@lynx-js/react = 0.121.0`
  - `@lynx-js/rspeedy = 0.14.4`
  - `@lynx-js/react-rsbuild-plugin = 0.16.2`
  - `@lynx-js/qrcode-rsbuild-plugin = 0.4.7`
  - `sparkling-app-cli = 2.0.1`
- Android scripts are in place.

## What We Learned

- `@lynx-js/react-webpack-plugin` says HMR requires development mode.
- `@lynx-js/react-webpack-plugin` also says standalone lazy bundle mode does not support HMR.
- File change observation is already working in our environment.
- So the problem is not simple file watching.

## Android Hot Flow

### `scripts/android-dev.sh`

- Sets up Android/JAVA env.
- Starts emulator if needed.
- Runs rebuild + reinstall loop.
- Rebuilds with `bun build`.
- Reinstalls with `sparkling-app-cli run:android`.

### `scripts/android-dev.sh`

- Resolves Android SDK.
- Resolves Java 17 from `JAVA_HOME`, `/usr/libexec/java_home`, or Homebrew openjdk.
- Wraps `adb reverse` and emulator startup.

## Android Debug Wiring

- `android/app/src/main/AndroidManifest.xml` includes `INTERNET` permission.
- `android/app/src/debug/AndroidManifest.xml` exists and enables cleartext traffic for debug.
- `android/app/src/debug/res/xml/network_security_config.xml` exists and permits cleartext traffic.
- Sparkling Android classes restored from upstream-style wiring:
  - `SparklingApplication.kt`
  - `SplashActivity.kt`
  - `BuiltinTemplateProvider.kt`
  - `DebugDevUrlSupport.kt`
  - `DebugSparklingUiProvider.kt`

## Observed Runtime History

- Earlier failure showed cleartext HTTP blocked on `127.0.0.1`.
- Later failure showed the debug path still pointed at remote bundle URL.

## Most Likely Interpretation

- Static install loop is the chosen path.
- Remaining work is cleanup, not transport debug.

## Working Hypotheses

1. Stale HMR wording still exists in docs and comments.
2. Debug labels can be simplified.
3. Hot loop should stay source-only and static-install only.

## Verification Plan

1. Keep rebuild + reinstall loop as the Android dev path.
2. Trim stale HMR-specific config and docs.

## Constraints

- Do not change code until the transport expectation is confirmed.
- Keep changes minimal.
- Prefer upstream Sparkling template behavior over guessed Android hacks.
- Keep README paths generic.
- Use `oxlint` and `oxfmt`, not ESLint or Prettier.

## Fresh-Session Notes

- If resuming from scratch, start by reading:
  - `package.json`
  - `app.config.ts`
  - `scripts/android-dev.sh`
  - `android/app/src/main/AndroidManifest.xml`
  - `android/app/src/debug/AndroidManifest.xml`
- Then inspect Sparkling Android debug bridge code paths if reinstall loop breaks.

## Definition of Done

- Android hot flow loads the app reliably.
- The correct dev refresh path is understood and documented.
- If HMR is unsupported here, the repo uses rebuild + reinstall on change.
