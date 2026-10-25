# E2E Testing Approaches: What Was Tried and Why It Was Removed

Written after the 2026-10 e2e effort was shelved. Everything below was implemented,
run on a script-managed emulator, and removed again. This doc is the re-entry point
if we attempt device-level UI testing for Lynx pages again.

## Goal

Ten end-to-end scenarios for the Runner app (Lynx UI inside a native Android shell):
home window states, workout launch lifecycle, data tables, storage import/export.
Constraints: the app under test must be the release-equivalent build (production
code path, minify off so the test APK can reference app classes), and everything
runs on a script-managed emulator on macOS Apple Silicon.

## What worked (reusable findings)

- **Script-managed emulator**: Play Store AVD (`sdk_gphone64_arm64` image) on
  emulator 35.2.10 boots headless and renders correctly. The AOSP ATD image
  renders black on this host — do not use ATD for anything visual.
- **Selector path**: Lynx `accessibility-label` surfaces as `content-desc` in the
  Android a11y tree. Label-based selectors are the right idea for Lynx pages;
  leaf `text` never reaches UiAutomator.
- **Per-class fail-fast runs**: looping gradle with
  `-Pandroid.testInstrumentationRunnerArguments.class` per test class and
  stopping at the first failure worked reliably.
- **In-process reset**: `am force-stop` from inside instrumentation kills the test
  process itself (same UID). Test reset must call the app's own stop path
  in-process instead.
- **Version alignment**: e2e build type `initWith(release)` fixed an
  `AbstractMethodError` from lynx version skew (4.1.0 APK dex vs 3.6.0 service).
- **Shell dump outside instrumentation sees the whole Lynx tree**: `adb shell
uiautomator dump` while the app runs standalone (no instrumentation connected)
  shows every `accessibility-label` as content-desc, with valid bounds. Any future
  UI-level test harness should be built on this.
- **State stores exist for state-level assertions**: `RunnerWorkoutTimerStateStore`
  and `RunnerStorageFileStore` expose the app's state to a same-process test —
  enough for session/progression assertions without any UI tree.

## Approaches that failed

### 1. UiAutomator instrumentation directly (the original suite)

Instrumentation-side tree dumps contained only bare native `FrameLayout`/
`LinearLayout` nodes. Zero Lynx virtual nodes. Root cause: Lynx serves its tree
through an accessibility node provider whose virtual nodes are never delivered to
instrumentation clients.

### 2. Lynx a11y gating (lazy init + eager override)

Lynx builds its tree lazily: `isSystemAccessibilityEnable()` requires
`isEnabled()` AND `isTouchExplorationEnabled()` (decompiled from 4.1.0). Registering
a trail service returning `enable_lazy_init_a11y=false` (e2e-gated) forced eager
tree construction. Result: the tree existed for shell clients but the
instrumentation still saw nothing. Eager init alone does not fix instrumentation.

### 3. Instrumentation presenting as an a11y user

Setting `UiAutomation.serviceInfo` with `FLAG_REQUEST_TOUCH_EXPLORATION_MODE`
(+ later `FLAG_INCLUDE_NOT_IMPORTANT_VIEWS`, `FLAG_RETRIEVE_INTERACTIVE_WINDOWS`,
`FLAG_REPORT_VIEW_IDS`) flipped the system state (enabled=true,
touchExploration=true) but the tree stayed invisible. Instrumentation is not
treated as a screen reader by Lynx.

### 4. A real accessibility service (probe APK)

Built and installed a minimal `AccessibilityService` APK (aapt2 + d8, debug-signed),
bound it via `settings put secure enabled_accessibility_services`. Findings:

- The service binds, but touch-exploration consent resists automation: the
  `touch_exploration_enabled` setting reverts instantly; the granted-services
  list survives reboots but the manager still clamps the setting.
- **While instrumentation runs, the shell's `uiautomator dump` is fully
  suppressed** — empty XML, not even launcher nodes. This forecloses the
  dump-XML oracle approach: any instrumentation presence starves all other
  a11y clients.

### 5. Dump-XML oracle

Planned fallback: Shell.kt polls `uiautomator dump` from within the test and
asserts on its XML. Foreclosed by finding 4 — during instrumentation the dump
returns nothing.

### 6. Lynx TestBench record/replay

Open source (Apache 2.0) in `lynx-family/lynx` + `lynx-devtool`. Recon verified
the recorder classes (`LynxRecorderActivity`, `LynxRecorderActionManager`,
`RecorderController.nativeStartRecord`, `TestbenchDumpFileHelper`,
`LynxRecorderActionCallback`) and Maven artifacts (`org.lynxsdk.lynx:lynx:4.1.0-dev`
exists; devtool exists only as release `4.1.0`).

Prototype built: `recordable` build type (initWith debug, dev engine forced via
resolutionStrategy, devtool deps string-invoked, BuildConfig-gated reflective
DebugRouter + `LynxGlobalDebugBridge` wiring in `SparklingApplication`,
`LynxRecorderActivity` manifest). Two real bugs fixed along the way: the release
`packaging` excludes block applies **globally to all variants** (debug builds had
silently lost devtool libs — the per-variant form is `androidComponents.onVariants`

- `variant.packaging.jniLibs.excludes`), and `LynxGlobalDebugBridge.setAppInfo`
  mutates the map passed to it.

Blocked by a native crash: SIGSEGV (null deref at 0x8) in
`lynx::fml::MessageLoopAndroid::Run()` on the devtool thread, under the only
dependency combination Maven offers (dev engine + release base + release devtool;
no dev variants of lynx-base/lynx-devtool are published). Upstream docs for this
stack are contradictory. Parked.

## Why everything was removed

No UiAutomator-based in-test path can see Lynx virtual nodes: the instrumentation
client receives only native views, and its presence suppresses every other a11y
client including shell dumps. TestBench needs a dev-tooling stack that is not
shippable today. The suite, the build types, the e2e hooks in product code, and
the scripts were deleted to keep the repo clean.

## Revisit criteria

Pick this back up when any of:

- Lynx exposes virtual nodes to UiAutomation instrumentation clients (upstream fix).
- Maven publishes `-dev` variants of lynx-base and lynx-devtool, or an official
  TestBench Android integration guide ships.
- We accept a host-driven harness: app runs standalone, `adb input tap` by bounds
  from `uiautomator dump`, assertions on dump content-desc — every building block
  for this was proven working above.

## Version facts

- lynx / lynx-devtool / lynx-trace / debug-router: 4.1.0 (devtool/trace have no
  -dev artifacts; lynx 4.1.0-dev exists)
- debug-router 0.0.20: `DebugRouter.loadNativeLibrary()`, `getInstance()`,
  `setConfig("enable_debug_mode", true)`, USB port 8901-8910
- sparkling SDK 2.0.1, emulator 35.2.10, compileSdk 35, arm64-v8a only
- `enable_lazy_init_a11y` trail key gates Lynx tree construction
