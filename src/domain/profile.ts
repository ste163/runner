import type { IntervalRecord, Session, TrainingLevel, TrainingProfile } from './types.js'

const cloneLevel = (level: TrainingLevel): TrainingLevel => ({ ...level })
const cloneInterval = (interval: IntervalRecord): IntervalRecord => ({ ...interval })
const cloneSession = (session: Session): Session => ({
  ...session,
  level: cloneLevel(session.level),
  intervals: session.intervals.map(cloneInterval),
})
const cloneProfile = (profile: TrainingProfile): TrainingProfile => ({
  ...profile,
  level: cloneLevel(profile.level),
  window: { ...profile.window },
  sessions: profile.sessions.map(cloneSession),
})

export const createDefaultProfile = (): TrainingProfile => ({
  schemaVersion: 1,
  level: { runSeconds: 30, walkSeconds: 120, intervalBlockSeconds: 1200 },
  window: { windowStart: '', consecutiveMissed: 0 },
  sessions: [],
})

export interface ProfileStorage {
  load: () => TrainingProfile | null
  save: (profile: TrainingProfile) => void
}

export class InMemoryProfileStorage implements ProfileStorage {
  private profile: TrainingProfile | null = null

  load = (): TrainingProfile | null => (this.profile === null ? null : cloneProfile(this.profile))
  save = (profile: TrainingProfile): void => {
    this.profile = cloneProfile(profile)
  }
}
