# Runner App — Application Plan

## What This App Is

**Runner** is a beginner-friendly Android run/walk interval training app. The goal is gradual progress — not
"run a 5K in X weeks." The user completes 3 × 30-minute sessions per week; the app adjusts interval ratios
automatically based on consistency, meeting users where they are.

---

## Core Mechanics

### Session Structure

Every session has three phases:

1. **Warmup walk** — always 5 minutes (300 seconds), no exceptions.
2. **Interval block** — **20 minutes** of alternating run/walk cycles (may grow toward 25 min max
   as part of graduation design — mechanic TBD, see Decisions #7).
   - Cycles repeat until the interval block time is exhausted.
   - The last cycle is truncated if it would exceed the block duration.
   - **Walk graduation trigger**: if `walkSeconds ≤ 10`, skip walk intervals — treat session as
     continuous running and enter graduation state.
3. **Cooldown walk** — always 5 minutes (300 seconds), no exceptions.

**Total session length: 30 minutes at start → 35 minutes max** (5 warmup + 20–25 intervals + 5 cooldown).

### Starting Intervals

| Interval | Duration            |
| -------- | ------------------- |
| Run      | 30 seconds          |
| Walk     | 120 seconds (2 min) |

### Interval Precision

Decimal precision — no rounding (e.g., 33 sec, 1m 48s). Display rounds to nearest second in the UI.

### Progression Rules

Evaluated using a **rolling 7-day window** (not calendar Mon–Sun).

A window starts when the user completes their first session of a new cycle. If 7 days pass without
completing 3 sessions, the window expires and a new one begins on the next session.

| Window result                                                | Action              |
| ------------------------------------------------------------ | ------------------- |
| ✅ 3 sessions completed within 7 days                        | Run +10%, Walk −10% |
| ⚠️ Window expired with < 3 sessions, first time              | Stay the same       |
| ❌ Window expired with < 3 sessions, second consecutive time | Run −10%, Walk +10% |

**Multiple missed windows**: If the user hasn't opened the app in N weeks, evaluate each missed
window individually and apply regression once per missed window (not just once total). The user
can manually adjust afterward if the regression feels too steep.

**Progression/regression bounds** (prevents runaway values):

- Run: min **15 seconds**, max = `intervalBlockSeconds`
- Walk: min **10 seconds**, max **5 minutes (300 seconds)**

Bounds apply to both auto-progression/regression and manual adjustment.

**Window cap**: Sessions beyond 3 in a window are tracked but do not carry over to the next window.
A window holds exactly the sessions completed within its 7-day span.

**End state:** When `walkSeconds ≤ 10`, walk intervals are dropped and the user enters graduation state.
App shows a celebration state.

**Rest day guidance** (suggested, not enforced): After a session, the app recommends the next session in
2 days ("Next suggested session: Wednesday"). This naturally produces a MWF-style spread regardless of
start day.

---

## Data Model

These types represent **persisted storage only**. UI and runtime state (timer, current phase, navigation)
are derived from this data at runtime and are not stored.

```typescript
// What level the user is currently training at
interface TrainingLevel {
  runSeconds: number // current run interval (starts 30)
  walkSeconds: number // current walk interval (starts 120)
  intervalBlockSeconds: number // total interval block duration (starts 1200 = 20 min)
}

// Tracks the rolling 7-day window for progression/regression decisions
interface ProgressionWindow {
  windowStart: string // Full ISO timestamp (e.g. "2024-01-15T23:45:00.000Z") when the current window began
  consecutiveMissed: number // consecutive windows without 3 completions (triggers regression at 2)
}

// GPS-derived stats for a single interval (populated only if location permission granted)
interface IntervalRecord {
  type: 'warmup' | 'run' | 'walk' | 'cooldown'
  durationSeconds: number
  distanceMiles: number // approximate
  avgPaceMinPerMile: number // 0 if no movement detected
}

// A single completed workout session
interface Session {
  id: string
  completedAt: string // Full ISO timestamp (e.g. "2024-01-15T23:45:00.000Z")
  level: TrainingLevel // snapshot of the level used for this session
  intervals: IntervalRecord[] // per-interval GPS stats (empty if no GPS)
  totalDistanceMiles: number // sum across all intervals (0 if no GPS)
}

// Root persisted record — the only thing written to storage
interface TrainingProfile {
  schemaVersion: number // starts at 1; increment when data model changes to enable future migrations
  level: TrainingLevel
  window: ProgressionWindow
  sessions: Session[]
}
```

### Progression Logic (pseudocode)

```
on session completed (or app open after window has expired):
  // Evaluate all expired windows since windowStart, oldest first
  for each expired window in chronological order:
    windowCount = sessions completed within that window's 7-day span
    if windowCount >= 3:
      level.runSeconds = clamp(level.runSeconds * 1.1, 15, intervalBlockSeconds)
      level.walkSeconds = clamp(level.walkSeconds * 0.9, 10, 300)
      window.consecutiveMissed = 0  // success resets the streak
    else:
      window.consecutiveMissed += 1
      if window.consecutiveMissed >= 2:
        level.runSeconds = clamp(level.runSeconds * 0.9, 15, intervalBlockSeconds)
        level.walkSeconds = clamp(level.walkSeconds * 1.1, 10, 300)
  // Advance window to now — saved atomically with the updated level.
  // If the app crashes before this save, re-evaluation on next open produces the same result
  // (level update + windowStart advance are one atomic write).
  window.windowStart = now (full ISO timestamp)

on first session of new window:
  if no window.windowStart: window.windowStart = now (full ISO timestamp)
```

---

## Pages & Screens

### Page 1: Home (`home`)

Repurpose existing `main` page. Shows:

- App name / branding
- **This week's progress**: visual 3-dot tracker (e.g., `● ● ○` = 2/3 done)
- **Current interval display**: "Run 30s · Walk 2m 0s" — in graduation state, shows "Running 20m 0s" (no walk)
- **Progression context**: "Complete 1 more session this week to progress!" — in graduation state, shows celebration/completion message
- **Start Workout** — primary CTA button
- **Manual level adjustment** — increase/decrease buttons (10% per tap, same as auto-progression; run min: 15s, walk min: 10s)

### Page 2: Workout (`workout`) ← repurpose existing workout page

Repurpose existing workout page (rename/replace). Full-screen workout experience:

- **Phase label** (large, prominent): `WARMUP` / `RUN` / `WALK` / `COOLDOWN`
- **Countdown timer**: time remaining in current interval
- **Session progress**: elapsed time / estimated total
- **Next up** preview: "Next: Walk 2m 0s"
- **Last 5 seconds**: haptic pulse every second (200ms vibration) as interval-end warning
- **Workout start**: single 500ms haptic pulse
- **Pause / Stop** controls
- On completion: inline **post-workout summary** — app saves session, evaluates progression window,
  then shows summary (distance, time, per-interval breakdown if GPS available, new level if changed).
  User taps "Done" or simply closes the app. No forced navigation.

### Page 3: How It Works (`onboarding`) ← new page, shown on first launch

Shown only once on first app open. Explains:

- What the program is (run/walk intervals, 3x/week)
- How progression works (+10% run / −10% walk when consistent)
- How regression works (misses two windows → scales back)
- Warmup/cooldown structure

After viewing, user lands on the Home screen with default `TrainingProfile` initialized.

**Profile initialization**: On every app launch, if `training_profile.json` does not exist, a default
`TrainingProfile` is created in memory immediately (before any page loads). Onboarding is shown
if and only if this is a first-time creation. Second launch onward: file exists → skip onboarding
→ load Home directly.

### Page 4: History (`history`) ← new page, v2

Deferred — log of past sessions and progression over time. Add after core flow works.

---

## Lynx/Sparkling Technical Considerations

### Navigation

- Home → Workout: `router.open()` via `sparkling-navigation` with scheme
  `hybrid://lynxview_page?bundle=workout.lynx.bundle&...`
- Workout → Home: `close()` from `sparkling-navigation`
- New `workout` entry required in `app.config.ts` (`source.entry` + `router`)

### State Persistence & Native Bridge

Both storage and GPS wire through **Lynx `NativeModules`**: extend `LynxModule`, annotate methods with
`@LynxMethod`, register in `SparklingLynxConfig`. This is the confirmed approach — the official Lynx docs
use a storage module as their primary NativeModules example.

#### Primary Storage: Internal JSON file (`context.filesDir`)

`TrainingProfile` is serialized as a single JSON file at `context.filesDir/training_profile.json`.
Marginally better than `SharedPreferences` for this size of data, and simplifies export (the backup _is_
the live file, just copied).

**Atomic write pattern** (prevents corruption on crash):

1. Write to `training_profile.json.tmp`
2. `File.renameTo("training_profile.json")` — atomic on Android

**Import safety**: Before overwriting, rename current file to `training_profile.json.bak`. If the
incoming JSON fails validation, restore the backup.

JS interface additions for GPS (added to `RunnerStorageModule` or a separate `RunnerGpsModule`):

```typescript
declare let NativeModules: {
  RunnerStorageModule: {
    saveProfile(json: string): void
    loadProfile(callback: (json: string | null) => void): void
    exportProfile(callback: (success: boolean) => void): void
    importProfile(callback: (json: string | null) => void): void
  }
  RunnerGpsModule: {
    requestPermission(callback: (granted: boolean) => void): void
    startInterval(type: 'warmup' | 'run' | 'walk' | 'cooldown'): void
    endInterval(callback: (distanceMiles: number, avgPaceMinPerMile: number) => void): void
    stopTracking(): void
  }
  RunnerHapticModule: {
    vibrate(durationMs: number): void
    cancel(): void
  }
  RunnerScreenModule: {
    keepScreenOn(enabled: boolean): void
  }
  // Timer/tick module TBD — mechanism under investigation (GlobalEventEmitter or callback pattern)
}
```

**Privacy**: Raw GPS coordinates are never stored or persisted. Only computed stats per interval are
kept. Location updates run only during an active workout. Fallback: if permission denied or GPS
unavailable, stats are 0 — app works normally. No blocking.

**Not included**: Real-time pace during workout, route maps, coordinate storage.

No cloud, no accounts. The user picks where to save/load the file via the Android system file picker
(works with the Files app, USB transfer, any storage provider on device).

- **Export** (`ACTION_CREATE_DOCUMENT`): Writes `runner_backup_YYYY-MM-DD.json` to user-chosen location.
- **Import** (`ACTION_OPEN_DOCUMENT`): User picks any `.json` file; app shows a **confirmation dialog**
  ("This will replace your current progress. Continue?") before reading, validating, and restoring.

SAF requires Android Activity result handling in the native module. No additional permissions required —
SAF is permission-free by design on modern Android.

### GPS / Location Tracking

**Confirmed feasible** via Lynx `NativeModules` using Android's `FusedLocationProviderClient`.

**Context access**: `LynxModule` provides `mContext` (a `LynxContext` → application context). For runtime
permission requests, `HybridActivityStackManager.getTopActivity()` is already used by sparkling's router
bridge and is available here too.

**Permission**: `ACCESS_FINE_LOCATION` declared in `AndroidManifest.xml`. Runtime permission requested
at **app launch in `SplashActivity`** — one-and-done before any Lynx page opens. If denied, GPS stats
are silently omitted; the app works normally.

**`FusedLocationProviderClient`** works with application context — no Activity needed for location
updates once permission is granted.

**Per-interval collection design** — JS drives the interval lifecycle:

- `startInterval(type: string)` → module records start timestamp + position, begins accumulating GPS
- `endInterval(callback)` → module computes distance (miles) + avg pace (min/mile) for that interval,
  returns stats to JS

No continuous GPS stream to JS. Module accumulates silently during each interval.

**GPS cleanup on workout end**: Whether the workout completes normally or is abandoned mid-interval,
`stopTracking()` is always called. If abandoned mid-interval, `endInterval()` is skipped (that
interval's partial data is discarded) and `stopTracking()` is called directly. This prevents GPS
location updates from leaking after the workout ends.

**`sessions` array is unbounded by design** — all sessions are retained forever for the future
history screen (Phase 5). At ~2.5MB max after 10 years of perfect consistency, storage is not
a concern.

**SAF (export/import Activity intents)** uses the same `HybridActivityStackManager.getTopActivity()`
pattern — no additional infrastructure needed.

### Interval Timer & Foreground Service

The workout timer must survive screen-off and app-switching for 30–35 minute sessions. A plain
`setInterval` in the ReactLynx background thread is **not sufficient** — Android will throttle and
kill it.

**Required**: Android **foreground service** that owns the timer and posts a persistent notification
(e.g., "Runner · RUN · 14:23 remaining"). The foreground service:

- Starts when the workout begins
- Maintains the interval clock independently of the JS thread
- Sends tick events to the Lynx page via the native bridge
- Stops when workout completes or user stops/abandons early
- Requires `FOREGROUND_SERVICE` permission in `AndroidManifest.xml`
- Requires `FOREGROUND_SERVICE_HEALTH` permission in `AndroidManifest.xml`
  (**Android 14 / API 34 requirement** — required alongside `FOREGROUND_SERVICE` for health-type services;
  omitting it prevents the service from starting on API 34+)
- Requires `android:foregroundServiceType="health"` in the `<service>` manifest declaration
  (**Android 14 / API 34 requirement** — our `targetSdk = 34`; omitting this prevents the service
  from starting on modern Android)

**Pause**: Pausing freezes the foreground service timer. The session clock stops; GPS accumulation
pauses. Duration of pause is irrelevant — the session still counts when resumed. Pause is not
equivalent to stop.

**Native → JS event communication — Needs Investigation**: `NativeModules` is JS-calls-native only.
Sending timer tick events _from_ the foreground service _to_ the Lynx page requires a different
mechanism. Options to investigate:

- Lynx `GlobalEventEmitter` (background thread)
- A JS-registered callback stored in the native module
- Lynx's event bridge / `postMessage` equivalent
  Resolve before Phase 4.

### Haptic Feedback

Lynx has **no built-in haptic API** (confirmed: `@lynx-js/types` has no haptic/vibration types;
Lynx docs have no haptic built-ins). Requires a custom `RunnerHapticModule` (`LynxContextModule`).

**Android implementation:**

- API 26+: `VibrationEffect.createOneShot(durationMs, DEFAULT_AMPLITUDE)` via `Vibrator`
- API 24–25 fallback (our `minSdk = 24`): `vibrator.vibrate(durationMs)` (deprecated but functional)
- Permission: `android.permission.VIBRATE` — **normal permission**, manifest-only, no runtime prompt

**Module interface:**

```typescript
RunnerHapticModule: {
  vibrate(durationMs: number): void   // single pulse
  cancel(): void                       // stop active vibration
}
```

**Timing design**: JS controls when to call `vibrate()`. The foreground service sends timer ticks to
the Lynx page:

- **Workout start**: single `vibrate(500)` to signal "go"
- **Last 5 seconds of each interval**: `vibrate(200)` once per second as countdown warning
  No native-side timer needed.

**Registration**: `SparklingLynxConfig.Builder` exposes `addLynxModules(Map<String, SparklingLynxModuleWrapper>)`.
Confirmed by inspecting `sparkling-2.0.1.aar` bytecode. Register in `SparklingApplication.kt`:

```kotlin
addLynxModules(mapOf(
    "RunnerHapticModule" to SparklingLynxModuleWrapper(RunnerHapticModule::class.java)
))
```

### Screen Wake Lock

The screen must stay on for the full 30–35 minute workout. Android's default auto-lock would obscure the phase label and timer.

**Solution**: Set `FLAG_KEEP_SCREEN_ON` on the Activity's window when the workout screen becomes active; clear it when the workout ends (complete, stop, or pause — actually keep it on during pause too since the user may be checking the screen). Implemented via a `RunnerScreenModule` NativeModule:

```typescript
RunnerScreenModule: {
  keepScreenOn(enabled: boolean): void
}
```

Calls `HybridActivityStackManager.getTopActivity().runOnUiThread { window.addFlags(FLAG_KEEP_SCREEN_ON) }` (or `clearFlags`). No permission required — `FLAG_KEEP_SCREEN_ON` is a window flag, not a manifest permission.

---

## Implementation Phases

### Phase 1 — Core domain logic (no UI) ✅ Complete

- Interval calculation utilities (run/walk cycles for the interval block duration)
- Progression rules (rolling 7-day window evaluation, +10%/−10% math, window cap at 3)
- Walk graduation trigger (`walkSeconds ≤ 10` → no more walk intervals)
- Manual level adjustment with bounds (run min: 15s, walk min: 10s, run max: `intervalBlockSeconds`)
- Session storage abstraction (interface + in-memory stub, swap in real persistence later)
- Default `TrainingProfile` initialization (for first-time users)
- Full unit test coverage for all domain logic

Completed:

- `src/domain/types.ts`
- `src/domain/intervals.ts` + `src/domain/intervals.spec.ts`
- `src/domain/progression.ts` + `src/domain/progression.spec.ts`
- `src/domain/profile.ts` + `src/domain/profile.spec.ts`
- Domain-only verification passes; repo-wide verification is still blocked by the existing Lynx page test runtime issue in `src/pages/main/App.spec.tsx`

### Phase 2 — Home screen + onboarding ✅ Complete

- Home screen with weekly progress, current interval display, suggested next session, manual
  level adjustment, and Start Workout CTA
- First-launch onboarding "How It Works" screen
- Stub profile persistence/bootstrap for first-launch flow
- Router/config updates for the onboarding page
- Page tests for Home and onboarding interactions
- Page folders renamed to match files: `home`, `onboarding`, and `workout`

Completed:

- `src/pages/home/Home.tsx` + `src/pages/home/Home.spec.tsx`
- `src/pages/home/Home.css`
- `src/pages/onboarding/Onboarding.tsx` + `src/pages/onboarding/Onboarding.spec.tsx`
- `src/pages/onboarding/Onboarding.css`
- `src/pages/workout/Workout.tsx`
- `src/pages/workout/Workout.css`
- `src/domain/profile.ts`
- `app.config.ts`
- `src/global.css`

### Phase 3 — Workout screen ✅ Complete

- Workout screen with explicit Start Workout gate before the timer begins
- Warmup + interval block + cooldown timer
- Phase labels (WARMUP / RUN / WALK / COOLDOWN), countdown, next-up preview
- Haptic adapter with start pulse and last-5-seconds pulses
- Pause/stop controls and back navigation to home
- Post-workout summary with total distance and per-interval breakdown support

Completed:

- `src/pages/workout/Workout.tsx`
- `src/pages/workout/Workout.css`
- `src/pages/workout/Workout.spec.tsx`
- Workout flow now stays idle until the user taps `Start Workout`

### Phase 4 — Native bridge (storage + GPS + timer + feedback)

- **Storage**: `RunnerStorageModule` (`LynxModule` + `@LynxMethod`) with `filesDir` JSON backend;
  atomic write pattern; SAF export/import; replace in-memory stub
- **GPS**: `RunnerGpsModule` — `FusedLocationProviderClient`, per-interval accumulation, fallback
- **Foreground service**: Android foreground service owning the workout timer; persistent notification;
  tick events to Lynx page via native bridge; `FOREGROUND_SERVICE` permission;
  `android:foregroundServiceType="health"` in manifest (Android 14 / API 34 required)
- **Native → JS events**: Investigate `GlobalEventEmitter` or callback pattern for foreground service
  to push timer ticks to Lynx page
- **Haptic**: Haptics only — `RunnerHapticModule` (`vibrate` + `cancel`), `VIBRATE`
  normal permission. Triggers: workout start + last 5 sec of each interval.
- **Screen wake lock**: `RunnerScreenModule` (`keepScreenOn(bool)`), called on workout start/end.
  No permission needed.
- **Permissions at launch**: `ACCESS_FINE_LOCATION` + `FOREGROUND_SERVICE` requested in `SplashActivity`
- **Session ID**: Investigate `crypto.randomUUID()` availability in Lynx background thread; use `nanoid`
  if unavailable

### Phase 5 — Polish & edge cases

- Graduation state (run fills full interval block)
- Accessibility, app backgrounding (pause/resume timer)
- History screen (deferred)

---

## Decisions

1. **Week boundary**: Rolling 7-day window from first session of each cycle (not calendar Mon–Sun).
2. **Partial sessions**: Stopped early → does **not** count. Normal window-expiry regression logic applies.
3. **Cooldown walk**: Every session ends with 5 min cooldown walk. Total: 5 warmup + 20 intervals + 5 cooldown = 30 min.
4. **Haptic feedback only** (no audio): `RunnerHapticModule` (`vibrate(durationMs)` + `cancel()`),
   `VIBRATE` normal permission (manifest only). Triggers: workout start (500ms pulse) + last 5
   seconds of each interval (200ms pulse/sec).
5. **Manual level adjustment**: Home screen increase/decrease buttons. 10% per tap (same as
   auto-progression). Bounds: run min 15s, walk min 10s. Same bounds apply to auto-regression.
6. **Rest day guidance**: Suggest next session in 2 days after each completed session (not enforced).
7. **Graduation**: When `walkSeconds ≤ 10s`, drop walk intervals entirely — user is a continuous runner.
   Interval block growth toward 25 min max (35 min total session) — **exact mechanic TBD, Phase 5.**
8. **GPS / location tracking**: `FusedLocationProviderClient` via `RunnerGpsModule` (`LynxModule`).
   `ACCESS_FINE_LOCATION` permission at **app launch in `SplashActivity`** (one-and-done).
   Per-interval stats only. Privacy: no coordinates stored. Fallback if denied.
9. **Storage**: `context.filesDir/training_profile.json` via Lynx `NativeModules`. Atomic writes via
   write-to-temp + rename. Import safety via `.bak` file. Export/import via Android SAF. No permissions required.
10. **Foreground service**: Required to keep timer alive when screen off / app backgrounded. Persistent
    notification showing current phase + time remaining. `FOREGROUND_SERVICE` + `FOREGROUND_SERVICE_HEALTH`
    permissions (both manifest-only, normal permissions) + `foregroundServiceType="health"` (Android 14 / API 34 requirement).
11. **Window session cap**: Sessions beyond 3 in a window are tracked in that window, not carried forward.
12. **First-time experience**: "How It Works" onboarding screen shown on first launch only. Default
    `TrainingProfile` created in memory on app launch if file not found; onboarding shown iff first creation.
13. **Session ID**: Investigate `crypto.randomUUID()` in Lynx background thread — use `nanoid` if unavailable.
14. **`second` Lynx page**: Repurpose as the `workout` page.
15. **History screen**: Deferred — revisit after Phase 3.
16. **Multiple missed windows**: Evaluate each missed window individually; apply regression once per
    missed window. User can manually adjust afterward.
17. **Progression/regression bounds**: Run min 15s / max `intervalBlockSeconds`. Walk min 10s / max 300s.
    Applies to both auto and manual adjustment.
18. **Pause**: Freezes foreground service timer and GPS. Session still counts on resume. Unlimited pause duration.
19. **Post-workout flow**: Save session → evaluate progression → show summary screen → user closes app or taps Done.
20. **GPS cleanup**: `stopTracking()` always called on workout end (complete or abandoned). Abandoned
    mid-interval → skip `endInterval()`, call `stopTracking()` directly.
21. **`sessions` unbounded**: All sessions retained forever (intentional — needed for future history screen).
    ~2.5MB max after 10 years; no performance concern.
22. **Native → JS timer events**: Mechanism TBD — investigate `GlobalEventEmitter` or callback pattern before Phase 4.
23. **`windowStart` timestamp**: Full ISO timestamp (not date-only) to ensure precise 7-day window calculation.
24. **Schema versioning**: `TrainingProfile.schemaVersion` starts at 1; increment on any breaking data model change to enable future migrations.
25. **Import confirmation**: Before restoring an imported file, show a confirmation dialog ("This will replace your current progress. Continue?").
26. **Graduation state UI**: Home screen shows "Running Xm Ys" (no walk display) and celebration message when `walkSeconds ≤ 10`.
27. **Screen wake lock**: `RunnerScreenModule.keepScreenOn(bool)` keeps screen on for full workout duration. No permission required. Called on workout start; cleared on workout complete or stop.

## Open Questions

1. **Interval block duration**: **Resolved** — 20 min starting block, growing to 25 min max at graduation.
   Total session: 30 min → 35 min.

2. **Android toolchain update**: AGP 9.2.0 was attempted with Gradle 9.4.1, Kotlin 2.3.21,
   Android 16 compile/target SDK 36, and NDK 28.2.13676358, but it is blocked for now because
   `sparkling-navigation` still applies `org.jetbrains.kotlin.android` and is not AGP 9-ready.
   We are staying on the working AGP 8.9.2 / Gradle 8.11.1 line until that dependency is patched
   or forked.

---

## Verification

```sh
bun typecheck && bun run test && bun lint
```
