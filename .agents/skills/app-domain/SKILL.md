---
name: app-domain
description: Runner app business rules — session mechanics, progression algorithm, and data model. Use when writing or reviewing any app logic.
---

# Runner App Domain Rules

**Runner** is a beginner-friendly Android run/walk interval training app. Users complete 3 × 30-minute sessions per week; the app auto-adjusts interval ratios based on consistency.

## Session Structure

Every session = 3 phases:

1. **Warmup walk** — always 300 seconds (5 min), no exceptions.
2. **Interval block** — 1200 seconds (20 min) of alternating run/walk cycles.
   - Cycles repeat until block time is exhausted. Last cycle is truncated if it overruns.
   - **Graduation trigger**: if `runSeconds ≥ intervalBlockSeconds`, the run owns the whole block → continuous run → graduation state.
3. **Cooldown walk** — always 300 seconds (5 min), no exceptions.

**Starting intervals**: Run = 30s, Walk = 90s (1m30s).  
**Precision**: decimal (no rounding). UI displays rounded to nearest second.

## Progression Rules (rolling 7-day window + phases)

A window starts on the first session of a new cycle. If 7 days pass without 3 completions, the window expires.

| Result                                  | Action    |
| --------------------------------------- | --------- |
| 3 sessions within 7 days                | Run ×1.1  |
| Window expired, first miss              | No change |
| Window expired, second consecutive miss | Run ×0.9  |

**Phases**: the run range picks the phase; the walk is the phase anchor, not multiplied. Crossing a phase boundary re-anchors the walk.

| Phase | Run range | Walk  |
| ----- | --------- | ----- |
| 1     | 15s – 30s | 2m    |
| 2     | 30s – 1m  | 1m30s |
| 3     | 1m – 2m   | 1m15s |
| 4     | 2m – 4m   | 1m    |
| 5     | 4m – 8m   | 45s   |
| 6     | 8m – 12m  | 30s   |
| 7     | 12m – 16m | 30s   |
| 8     | 16m – 20m | 30s   |

Run bounds: min 15s / max `intervalBlockSeconds`. Graduation = run reaches the block (end of phase 8). Decrease always works and rolls back through phases.
**Multiple missed windows**: evaluate each individually, oldest first.  
**Success resets** `consecutiveMissed` to 0.

## Progression Logic (pseudocode)

```
on session completed (or app open after window expired):
  for each expired window (oldest first):
    if sessions in window >= 3:
      runSeconds = clamp(runSeconds * 1.1, 15, intervalBlockSeconds)
      walkSeconds = phaseWalk(runSeconds)
      consecutiveMissed = 0
    else:
      consecutiveMissed += 1
      if consecutiveMissed >= 2:
        runSeconds = clamp(runSeconds * 0.9, 15, intervalBlockSeconds)
        walkSeconds = phaseWalk(runSeconds)
  window.windowStart = now  // advance atomically with level update
```

## Data Model (persisted types only)

```typescript
interface TrainingLevel {
  runSeconds: number // starts 30; picks the phase
  walkSeconds: number // phase anchor (2m – 30s)
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

## Manual Adjustment

User can tap +/− on Home to adjust level (same 10% step as auto-progression). The walk follows the phase anchor.

## Graduation State

When `runSeconds ≥ intervalBlockSeconds`: no walk intervals, session = warmup + 20-min continuous run + cooldown. Graduation is terminal on the way up — the run is capped at the block, so up-steps are no-ops. Decrease always works: the user (or missed-window regression) can step back down into intervals at any time.

## NativeModules Bridge

Both storage and GPS use Lynx `NativeModules` (extend `LynxModule`, `@LynxMethod` annotation, register in `SparklingLynxConfig`).
