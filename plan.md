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
  windowStart: string // ISO date when the current 7-day window began
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
  completedAt: string // ISO date string
  level: TrainingLevel // snapshot of the level used for this session
  intervals: IntervalRecord[] // per-interval GPS stats (empty if no GPS)
  totalDistanceMiles: number // sum across all intervals (0 if no GPS)
}

// Root persisted record — the only thing written to storage
interface TrainingProfile {
  level: TrainingLevel
  window: ProgressionWindow
  sessions: Session[]
}
```

### Progression Logic (pseudocode)

```
on session completed (or app open after 7+ days):
  if 7 days have elapsed since window.windowStart:
    windowCount = sessions completed within window
    if windowCount >= 3:
      level.runSeconds *= 1.1
      level.walkSeconds *= 0.9
      window.consecutiveMissed = 0
    else:
      window.consecutiveMissed += 1
      if window.consecutiveMissed >= 2:
        level.runSeconds *= 0.9
        level.walkSeconds *= 1.1
    window.windowStart = today

on first session of new window:
  if no window.windowStart: window.windowStart = today
```

---

## Pages & Screens

### Page 1: Home (`main`)

Repurpose existing `main` page. Shows:

- App name / branding
- **This week's progress**: visual 3-dot tracker (e.g., `● ● ○` = 2/3 done)
- **Current interval display**: "Run 30s · Walk 2m 0s"
- **Progression context**: "Complete 1 more session this week to progress!"
- **Start Workout** — primary CTA button
- **Manual level adjustment** — increase/decrease buttons (run min: 15s, walk min: 10s)

### Page 2: Workout (`workout`) ← repurpose existing `second` page

Repurpose existing `second` page (rename/replace). Full-screen workout experience:

- **Phase label** (large, prominent): `WARMUP` / `RUN` / `WALK` / `COOLDOWN`
- **Countdown timer**: time remaining in current interval
- **Session progress**: elapsed time / estimated total
- **Next up** preview: "Next: Walk 2m 0s"
- **Last 5 seconds**: haptic pulse every second (200ms vibration) as interval-end warning
- **Workout start**: single 500ms haptic pulse
- **Pause / Stop** controls
- On completion: inline summary state before navigating back to home

### Page 3: How It Works (`onboarding`) ← new page, shown on first launch

Shown only once on first app open. Explains:

- What the program is (run/walk intervals, 3x/week)
- How progression works (+10% run / −10% walk when consistent)
- How regression works (misses two windows → scales back)
- Warmup/cooldown structure

After viewing, user lands on the Home screen with default `TrainingProfile` initialized.

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
}
```

**Privacy**: Raw GPS coordinates are never stored or persisted. Only computed stats per interval are
kept. Location updates run only during an active workout. Fallback: if permission denied or GPS
unavailable, stats are 0 — app works normally. No blocking.

**Not included**: Real-time pace during workout, route maps, coordinate storage.

No cloud, no accounts. The user picks where to save/load the file via the Android system file picker
(works with the Files app, USB transfer, any storage provider on device).

- **Export** (`ACTION_CREATE_DOCUMENT`): Writes `runner_backup_YYYY-MM-DD.json` to user-chosen location.
- **Import** (`ACTION_OPEN_DOCUMENT`): User picks any `.json` file; app reads, validates, and restores.

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
- Stops when workout completes or user stops early
- Requires `FOREGROUND_SERVICE` permission in `AndroidManifest.xml`

This is part of Phase 4 native bridge work (same module layer as storage + GPS).

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

### Audio

No audio. Haptics are sufficient for all feedback.

---

## Implementation Phases

### Phase 1 — Core domain logic (no UI)

- Interval calculation utilities (run/walk cycles for the interval block duration)
- Progression rules (rolling 7-day window evaluation, +10%/−10% math, window cap at 3)
- Walk graduation trigger (`walkSeconds ≤ 10` → no more walk intervals)
- Manual level adjustment with bounds (run min: 15s, walk min: 10s, run max: `intervalBlockSeconds`)
- Session storage abstraction (interface + in-memory stub, swap in real persistence later)
- Default `TrainingProfile` initialization (for first-time users)
- Full unit test coverage for all domain logic

### Phase 2 — Home screen + onboarding

- Onboarding "How It Works" screen (shown once on first launch)
- Repurpose `main` page: 3-session tracker, current intervals, next suggested date, Start button,
  manual level adjustment buttons
- Wire to domain state (stub persistence for now)

### Phase 3 — Workout screen

- Repurpose `second` page as `workout` (update `app.config.ts`)
- Warmup + interval block + cooldown timer
- Phase labels (WARMUP / RUN / WALK / COOLDOWN), countdown, next-up preview
- Haptic pulses in last 5 seconds of each interval; single pulse on workout start
- Pause/stop (stopped early = session does not count)
- Post-workout summary: total distance + per-interval breakdown (distance + avg pace) if GPS available
- Back navigation to home

### Phase 4 — Native bridge (storage + GPS + timer + feedback)

- **Storage**: `RunnerStorageModule` (`LynxModule` + `@LynxMethod`) with `filesDir` JSON backend;
  atomic write pattern; SAF export/import; replace in-memory stub
- **GPS**: `RunnerGpsModule` — `FusedLocationProviderClient`, per-interval accumulation, fallback
- **Foreground service**: Android foreground service owning the workout timer; persistent notification;
  tick events to Lynx page via native bridge; `FOREGROUND_SERVICE` permission
- **Haptic**: Haptics only — `RunnerHapticModule` (`vibrate` + `cancel`), `VIBRATE`
  normal permission. Triggers: workout start + last 5 sec of each interval.
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
5. **Manual level adjustment**: Home screen increase/decrease buttons. Bounds: run min 15s, walk min 10s,
   run max = `intervalBlockSeconds`.
6. **Rest day guidance**: Suggest next session in 2 days after each completed session (not enforced).
7. **Graduation**: When `walkSeconds ≤ 10s`, drop walk intervals entirely — user is a continuous runner.
   Interval block growth toward 25 min max (35 min total session) — **exact mechanic TBD, Phase 5.**
8. **GPS / location tracking**: `FusedLocationProviderClient` via `RunnerGpsModule` (`LynxModule`).
   `ACCESS_FINE_LOCATION` permission at **app launch in `SplashActivity`** (one-and-done).
   Per-interval stats only. Privacy: no coordinates stored. Fallback if denied.
9. **Storage**: `context.filesDir/training_profile.json` via Lynx `NativeModules`. Atomic writes via
   write-to-temp + rename. Import safety via `.bak` file. Export/import via Android SAF. No permissions required.
10. **Foreground service**: Required to keep timer alive when screen off / app backgrounded. Persistent
    notification showing current phase + time remaining. `FOREGROUND_SERVICE` permission at launch.
11. **Window session cap**: Sessions beyond 3 in a window are tracked in that window, not carried forward.
12. **First-time experience**: "How It Works" onboarding screen shown on first launch only.
13. **Session ID**: Investigate `crypto.randomUUID()` in Lynx background thread — use `nanoid` if unavailable.
14. **`second` Lynx page**: Repurpose as the `workout` page.
15. **History screen**: Deferred — revisit after Phase 3.

## Open Questions

1. **Interval block duration**: **Resolved** — 20 min starting block, growing to 25 min max at graduation.
   Total session: 30 min → 35 min.

---

## Verification

```sh
bun typecheck && bun test && bun lint
```
