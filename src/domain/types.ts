export interface TrainingLevel {
  runSeconds: number
  walkSeconds: number
  intervalBlockSeconds: number
}

export interface ProgressionWindow {
  windowStart: string
  consecutiveMissed: number
}

export interface IntervalRecord {
  type: 'warmup' | 'run' | 'walk' | 'cooldown'
  durationSeconds: number
  distanceMiles: number
  avgPaceMinPerMile: number
}

export interface Session {
  id: string
  completedAt: string
  level: TrainingLevel
  intervals: IntervalRecord[]
  totalDistanceMiles: number
}

export interface TrainingProfile {
  schemaVersion: number
  level: TrainingLevel
  window: ProgressionWindow
  sessions: Session[]
}
