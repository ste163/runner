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
- Android helper scripts exist for static run and hot run.

## Relevant Scripts

- `android`: `sh ./scripts/android.sh`
- `android:static`: `sh ./scripts/android.sh`
- `android:hot`: `sh ./scripts/android-hot.sh`
- `dev`: `rspeedy dev`

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

- `@lynx-js/rspeedy` defaults `dev.hmr` to `true`.
- `@lynx-js/rspeedy` defaults `dev.liveReload` to `true`.
- `@lynx-js/rspeedy` supports `dev.watchFiles` with:
  - `type: 'reload-page'`
  - `type: 'reload-server'`
- `@lynx-js/react-webpack-plugin` says HMR requires development mode.
- `@lynx-js/react-webpack-plugin` also says standalone lazy bundle mode does not support HMR.
- File change observation is already working in our environment.
- So the problem is not simple file watching.

## Android Hot Flow

### `scripts/android-hot.sh`

- Sets up Android/JAVA env.
- Starts emulator if needed.
- Runs rebuild + reinstall loop.
- Rebuilds with `bun build`.
- Reinstalls with `bun android:static`.

### `scripts/android-common.sh`

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

- `adb devices` showed an emulator device.
- `adb reverse --list` showed port 3000 reversed.
- Earlier failure showed cleartext HTTP blocked on `127.0.0.1`.
- Later failure showed the debug path still pointed at remote bundle URL.
- We have not yet proven whether the Android client is reaching the HMR websocket path or only the bundle URL.

## Most Likely Interpretation

- This is probably a transport/config mismatch, not a missing file-change signal.
- rspeedy supports HMR by default, so the config is not obviously disabling it.
- The unresolved part is whether Sparkling Android debug expects:
  - HMR websocket transport,
  - page reload transport,
  - or local asset bundle loading.

## Working Hypotheses

1. The Android debug client is not connecting to the rspeedy HMR websocket.
2. Sparkling Android debug may expect page reload rather than full HMR for this setup.
3. The bundle URL or debug source selection may not match the current Sparkling debug bridge expectations.
4. Standalone lazy bundle mode may be preventing HMR in this path.

## Verification Plan

1. Verify whether the Android debug client can reach the rspeedy HMR websocket endpoint.
2. Check Sparkling Android debug path for whether it expects HMR or page reload.
3. Compare current config against rspeedy defaults and explicit `dev.hmr` / `dev.liveReload` overrides.
4. Use rebuild + reinstall as the fallback dev loop.

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
  - `scripts/android-hot.sh`
  - `scripts/android-common.sh`
  - `android/app/src/main/AndroidManifest.xml`
  - `android/app/src/debug/AndroidManifest.xml`
- Then inspect rspeedy defaults for `dev.hmr`, `dev.liveReload`, and `dev.watchFiles`.
- Then inspect Sparkling Android debug bridge code paths.

## Definition of Done

- Android hot flow loads the app reliably.
- The correct dev refresh path is understood and documented.
- If HMR is unsupported here, the repo uses rebuild + reinstall on change.
