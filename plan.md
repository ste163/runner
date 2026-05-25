# Runner App — Application Plan

## What This App Is

**Runner** is a beginner-friendly Android run/walk interval training app. The goal is gradual progress — not
"run a 5K in X weeks." The user completes 3 × 30-minute sessions per week; the app adjusts interval ratios
automatically based on consistency, meeting users where they are.

---

## Core Mechanics

### Session Structure

Every session has two phases:

1. **Warmup walk** — always 5 minutes (300 seconds), no exceptions.
2. **Interval block** — 30 minutes of alternating run/walk cycles.
   - Cycles repeat until 30 minutes are exhausted.
   - The last cycle is truncated if it would exceed 30 minutes.
   - Total max session length: **35 minutes** (when run fills the full 30-min block).

### Starting Intervals

| Interval | Duration            |
| -------- | ------------------- |
| Run      | 30 seconds          |
| Walk     | 120 seconds (2 min) |

### Interval Precision

Decimal precision — no rounding (e.g., 33 sec, 1m 48s). Display rounds to nearest second in the UI.

### Progression Rules

Evaluated at the **start of each new week** (calendar week, Monday–Sunday).

| Last week's result                                | Action              |
| ------------------------------------------------- | ------------------- |
| ✅ 3/3 sessions completed                         | Run +10%, Walk −10% |
| ⚠️ < 3/3 sessions, first missed week              | Stay the same       |
| ❌ < 3/3 sessions, second consecutive missed week | Run −10%, Walk +10% |

**End state:** When run duration fills the entire 30-minute interval block (no walk breaks needed), the
user has "graduated." App shows a completion/celebration state.

---

## Data Model

```typescript
interface Session {
  id: string
  completedAt: string // ISO date string
  runSeconds: number // interval values used during this session
  walkSeconds: number
}

interface AppState {
  runSeconds: number // current run interval (starts 30)
  walkSeconds: number // current walk interval (starts 120)
  sessions: Session[] // all completed sessions (persisted)
  currentWeekStart: string // ISO date of this week's Monday
  consecutiveWeeksMissed: number // for tracking 2-week regression trigger
}
```

### Progression Logic (pseudocode)

```
on app open:
  if today is a new week since currentWeekStart:
    thisWeekCount = sessions in currentWeekStart..now
    if thisWeekCount >= 3:
      runSeconds *= 1.1
      walkSeconds *= 0.9
      consecutiveWeeksMissed = 0
    else:
      consecutiveWeeksMissed += 1
      if consecutiveWeeksMissed >= 2:
        runSeconds *= 0.9
        walkSeconds *= 1.1
    currentWeekStart = this Monday
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

### Page 2: Workout (`workout`) ← new page

New Lynx page added to `app.config.ts`. Full-screen workout experience:

- **Phase label** (large, prominent): `WARMUP` / `RUN` / `WALK`
- **Countdown timer**: time remaining in current interval
- **Session progress**: elapsed time / estimated total
- **Next up** preview: "Next: Walk 2m 0s"
- **Pause / Stop** controls
- On completion: inline summary state before navigating back to home

### Page 3: History (`history`) ← new page, v2

Deferred — log of past sessions and progression over time. Add after core flow works.

---

## Lynx/Sparkling Technical Considerations

### Navigation

- Home → Workout: `router.open()` via `sparkling-navigation` with scheme
  `hybrid://lynxview_page?bundle=workout.lynx.bundle&...`
- Workout → Home: `close()` from `sparkling-navigation`
- New `workout` entry required in `app.config.ts` (`source.entry` + `router`)

### State Persistence

Lynx does not have React Native's AsyncStorage. Options to investigate before implementation:

1. **Lynx `NativeModules`** — custom Android bridge (preferred for structured data)
2. **`lynx.__globalProps`** — read-only at startup, set by native layer; not ideal for writes
3. **Lynx system storage API** — check if `sparkling-app-cli` exposes one

**Decision needed:** Confirm storage approach before building state management.

### Interval Timer

Background/foreground timer for 30+ minutes:

- Use `setInterval` in the background thread (ReactLynx worker thread)
- Foreground display updates via `lynx.postMessage` / state
- Handle app backgrounding (pause timer, resume on return)

---

## Implementation Phases

### Phase 1 — Core domain logic (no UI)

- Interval calculation utilities (run/walk cycles for a 30-min block)
- Progression rules (week evaluation, +10%/−10% math)
- Session storage abstraction (interface + in-memory stub, swap in real persistence later)
- Full unit test coverage for all domain logic

### Phase 2 — Home screen

- Repurpose `main` page with real UI: week tracker, current intervals, Start button
- Wire to domain state (stub persistence for now)

### Phase 3 — Workout screen

- New `workout` Lynx page
- Warmup + interval block timer
- Phase labels, countdown, next-up preview
- Pause/stop, completion summary
- Navigate back to home on finish

### Phase 4 — Persistence

- Implement real storage (Android native bridge or Lynx storage API)
- Replace in-memory stub
- Progression evaluation on week boundary

### Phase 5 — Polish & edge cases

- Graduation state (user can run full 30-min block)
- Handle partial sessions (user stops early — count or don't count?)
- Accessibility, visual feedback, sound/haptics (TBD)

---

## Decisions

1. **Week boundary**: Monday–Sunday calendar week. Week resets every Monday.
2. **Partial sessions**: A session stopped early does **not** count toward the weekly 3. Stopping early is
   treated as a signal the current level is too hard — it contributes to the consecutive-missed-weeks
   counter the same as a skipped session would (i.e., if the week ends without 3 completions, the normal
   regression logic applies).
3. **Graduation**: What happens after the user can run the full 30 min? — **TBD, revisit after Phase 3.**
4. **Storage API**: Investigate Lynx/sparkling native storage before Phase 4 — **technical spike.**
5. **History screen**: Deferred — revisit after Phase 3.

---

## Verification

```sh
bun typecheck && bun test && bun lint
```
