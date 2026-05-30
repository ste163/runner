---
name: app-domain
description: Runner app business rules — session mechanics, progression algorithm, data model, and page structure. Use when writing or reviewing any app logic to avoid re-reading plan.md.
---

# Runner App Domain Rules

**Runner** is a beginner-friendly Android run/walk interval training app. Users complete 3 × 30-minute sessions per week; the app auto-adjusts interval ratios based on consistency.

## Session Structure

Every session = 3 phases:

1. **Warmup walk** — always 300 seconds (5 min), no exceptions.
2. **Interval block** — 1200 seconds (20 min) of alternating run/walk cycles.
   - Cycles repeat until block time is exhausted. Last cycle is truncated if it overruns.
   - **Graduation trigger**: if `walkSeconds ≤ 10`, skip walk intervals → continuous run → graduation state.
3. **Cooldown walk** — always 300 seconds (5 min), no exceptions.

**Starting intervals**: Run = 30s, Walk = 120s.  
**Precision**: decimal (no rounding). UI displays rounded to nearest second.

## Progression Rules (rolling 7-day window)

A window starts on the first session of a new cycle. If 7 days pass without 3 completions, the window expires.

| Result                                  | Action              |
| --------------------------------------- | ------------------- |
| 3 sessions within 7 days                | Run ×1.1, Walk ×0.9 |
| Window expired, first miss              | No change           |
| Window expired, second consecutive miss | Run ×0.9, Walk ×1.1 |

**Bounds**: Run min 15s / max `intervalBlockSeconds`. Walk min 10s / max 300s.  
**Multiple missed windows**: evaluate each individually, oldest first.  
**Success resets** `consecutiveMissed` to 0.

## Progression Logic (pseudocode)

```
on session completed (or app open after window expired):
  for each expired window (oldest first):
    if sessions in window >= 3:
      runSeconds = clamp(runSeconds * 1.1, 15, intervalBlockSeconds)
      walkSeconds = clamp(walkSeconds * 0.9, 10, 300)
      consecutiveMissed = 0
    else:
      consecutiveMissed += 1
      if consecutiveMissed >= 2:
        runSeconds = clamp(runSeconds * 0.9, 15, intervalBlockSeconds)
        walkSeconds = clamp(walkSeconds * 1.1, 10, 300)
  window.windowStart = now  // advance atomically with level update
```

## Data Model (persisted types only)

```typescript
interface TrainingLevel {
  runSeconds: number // starts 30
  walkSeconds: number // starts 120
  intervalBlockSeconds: number // starts 1200 (20 min)
}

interface ProgressionWindow {
  windowStart: string // ISO timestamp of current window start
  consecutiveMissed: number // triggers regression at >= 2
}

interface IntervalRecord {
  type: 'warmup' | 'run' | 'walk' | 'cooldown'
  durationSeconds: number
  distanceMiles: number
  avgPaceMinPerMile: number
}

interface Session {
  id: string
  completedAt: string // ISO timestamp
  level: TrainingLevel // snapshot at session time
  intervals: IntervalRecord[]
  totalDistanceMiles: number
}

interface TrainingProfile {
  schemaVersion: number // starts 1; increment on breaking changes
  level: TrainingLevel
  window: ProgressionWindow
  sessions: Session[]
}
```

Storage: single JSON file at `context.filesDir/training_profile.json`.  
**Atomic write**: write to `.tmp` → fsync → rename (crash-safe).

## Pages

| Page               | Lynx bundle  | Notes                                                                    |
| ------------------ | ------------ | ------------------------------------------------------------------------ |
| Home (`main`)      | `main`       | Branding, 3-dot weekly progress, current level, manual adjust, Start CTA |
| Workout (`second`) | `workout`    | Full-screen timer, phase label, pause/stop, post-workout summary         |
| Onboarding         | `onboarding` | Shown once on first launch; explains program + progression               |
| History            | `history`    | Deferred to v2                                                           |

**Navigation**: Home → Workout via `sparkling-navigation` `router.open()`. Workout → Home via `close()`.

## Manual Adjustment

User can tap +/− on Home to adjust level (same 10% step as auto-progression). Same bounds apply (run min 15s, walk min 10s).

## Graduation State

When `walkSeconds ≤ 10`: no walk intervals, session = warmup + 20-min continuous run + cooldown. App shows celebration/completion UI.

## NativeModules Bridge

Both storage and GPS use Lynx `NativeModules` (extend `LynxModule`, `@LynxMethod` annotation, register in `SparklingLynxConfig`).
