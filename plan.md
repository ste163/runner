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
2. **Interval block** — **20 minutes** of alternating run/walk cycles (grows up to 25 min max as run
   time increases, when run fills the full block).
   - Cycles repeat until the interval block time is exhausted.
   - The last cycle is truncated if it would exceed the block duration.
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

**End state:** When run duration fills the entire interval block (no walk breaks needed), the user has
"graduated." App shows a celebration state.

**Rest day guidance** (suggested, not enforced): After a session, the app recommends the next session in
2 days ("Next suggested session: Wednesday"). This naturally produces a MWF-style spread regardless of
start day.

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
  intervalBlockSeconds: number // duration of interval block (TBD — see Open Questions #1)
  sessions: Session[] // all completed sessions (persisted)
  currentWindowStart: string // ISO date when current 7-day window began
  consecutiveWindowsMissed: number // for tracking 2-window regression trigger
}
```

### Progression Logic (pseudocode)

```
on session completed (or app open after 7+ days):
  if 7 days have elapsed since currentWindowStart:
    windowCount = sessions completed within window
    if windowCount >= 3:
      runSeconds *= 1.1
      walkSeconds *= 0.9
      consecutiveWindowsMissed = 0
    else:
      consecutiveWindowsMissed += 1
      if consecutiveWindowsMissed >= 2:
        runSeconds *= 0.9
        walkSeconds *= 1.1
    currentWindowStart = today

on session started (new window):
  if no currentWindowStart: currentWindowStart = today
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

- **Phase label** (large, prominent): `WARMUP` / `RUN` / `WALK` / `COOLDOWN`
- **Countdown timer**: time remaining in current interval
- **Session progress**: elapsed time / estimated total
- **Next up** preview: "Next: Walk 2m 0s"
- **Last 5 seconds**: haptic pulse every second (1-sec vibration burst) as interval-end warning
- **Interval transition**: audio chime + haptic on phase change
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

Timer for 28–35 minute sessions:

- Use `setInterval` in the background thread (ReactLynx worker thread)
- Foreground display updates via state/events
- Handle app backgrounding (pause timer, resume on return)
- **Audio cues**: chime sound on interval transition (not voice prompts)
- **Haptic cues**: 1-second pulse every second during the last 5 seconds of each interval

---

## Implementation Phases

### Phase 1 — Core domain logic (no UI)

- Interval calculation utilities (run/walk cycles for the interval block duration)
- Progression rules (rolling 7-day window evaluation, +10%/−10% math)
- Session storage abstraction (interface + in-memory stub, swap in real persistence later)
- Full unit test coverage for all domain logic

### Phase 2 — Home screen

- Repurpose `main` page with real UI: 3-session tracker, current intervals, next suggested date, Start button
- Manual level adjustment buttons (increase/decrease difficulty)
- Wire to domain state (stub persistence for now)

### Phase 3 — Workout screen

- New `workout` Lynx page
- Warmup + interval block + cooldown timer
- Phase labels (WARMUP / RUN / WALK / COOLDOWN), countdown, next-up preview
- Audio chime on transitions, haptic pulses in last 5 seconds of each interval
- Pause/stop (stopped early = session does not count)
- Completion summary state, back navigation to home

### Phase 4 — Persistence

- Investigate and implement Lynx/sparkling storage API
- Replace in-memory stub
- Progression evaluation on 7-day window expiry

### Phase 5 — Polish & edge cases

- Graduation state (run fills full interval block)
- Accessibility, app backgrounding (pause/resume timer)
- History screen (deferred)

---

## Decisions

1. **Week boundary**: Rolling 7-day window from first session of each cycle (not calendar Mon–Sun).
2. **Partial sessions**: Stopped early → does **not** count. Signals the level is too hard. Normal
   window-expiry regression logic still applies if the window ends without 3 completions.
3. **Cooldown walk**: Every session ends with 5 min cooldown walk. Total session = warmup + intervals +
   cooldown, targeting 28–35 min total.
4. **Audio/haptic cues**: Chime on interval transitions; 1-sec haptic pulse each second during last 5
   seconds of each interval (user holds phone while running).
5. **Manual level adjustment**: Home screen has increase/decrease buttons so users can dial in their
   starting level before relying on auto-progression.
6. **Rest day guidance**: After each session, suggest next session in 2 days (not enforced).
7. **Graduation**: What happens when run fills the full interval block? — **TBD, revisit after Phase 3.**
8. **Storage API**: Investigate Lynx/sparkling native storage before Phase 4 — **technical spike.**
9. **History screen**: Deferred — revisit after Phase 3.

## Open Questions

1. **Interval block duration**: **Resolved** — 20 min starting block, growing to 25 min max at graduation.
   Total session: 30 min → 35 min.

---

## Verification

```sh
bun typecheck && bun test && bun lint
```
