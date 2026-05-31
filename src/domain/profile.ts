import { runnerProfileStorage } from '../native/storage.js'
import type { ExportProfileResult, ImportProfileResult } from '../native/storage.js'
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

export interface ProfilePersistence {
  exportProfile: (onComplete: (result: ExportProfileResult) => void) => void
  importProfile: (onComplete: (result: ImportProfileResult) => void) => void
  load: () => TrainingProfile | null
  reset: () => void
  save: (profile: TrainingProfile) => void
}

export const createDefaultProfile = (): TrainingProfile => ({
  schemaVersion: 1,
  level: { runSeconds: 30, walkSeconds: 120, intervalBlockSeconds: 1200 },
  window: { windowStart: '', consecutiveMissed: 0 },
  sessions: [],
})

export class InMemoryProfileStorage implements ProfilePersistence {
  private profile: TrainingProfile | null = null

  exportProfile = (onComplete: (result: ExportProfileResult) => void): void => {
    onComplete({ status: 'cancelled' })
  }

  importProfile = (onComplete: (result: ImportProfileResult) => void): void => {
    onComplete({ status: 'cancelled' })
  }

  load = (): TrainingProfile | null => (this.profile === null ? null : cloneProfile(this.profile))
  save = (profile: TrainingProfile): void => {
    this.profile = cloneProfile(profile)
  }
  reset = (): void => {
    this.profile = null
  }
}

export interface SharedProfileLoadResult {
  profile: TrainingProfile
  isFirstLaunch: boolean
}

export class SharedProfileStore {
  private profile: TrainingProfile | null = null

  constructor(private storage: ProfilePersistence = runnerProfileStorage) {}

  loadOrCreate = (): SharedProfileLoadResult => {
    if (this.profile !== null) {
      return { profile: cloneProfile(this.profile), isFirstLaunch: false }
    }

    const profile = this.storage.load()

    if (profile !== null) {
      this.profile = cloneProfile(profile)

      return { profile: cloneProfile(profile), isFirstLaunch: false }
    }

    return { profile: createDefaultProfile(), isFirstLaunch: false }
  }

  hydrate = (): SharedProfileLoadResult => {
    if (this.profile !== null) {
      return { profile: cloneProfile(this.profile), isFirstLaunch: false }
    }

    const profile = this.storage.load()

    if (profile !== null) {
      this.profile = cloneProfile(profile)

      return { profile: cloneProfile(profile), isFirstLaunch: false }
    }

    const defaultProfile = createDefaultProfile()

    this.storage.save(defaultProfile)
    this.profile = cloneProfile(defaultProfile)

    return { profile: defaultProfile, isFirstLaunch: true }
  }

  save = (profile: TrainingProfile): void => {
    this.profile = cloneProfile(profile)
    this.storage.save(profile)
  }

  exportProfile = (onComplete: (result: ExportProfileResult) => void): void => {
    this.storage.exportProfile(onComplete)
  }

  importProfile = (onComplete: (result: ImportProfileResult) => void): void => {
    this.storage.importProfile((result) => {
      if (result.status === 'success') {
        this.profile = cloneProfile(result.profile)
        onComplete({ profile: cloneProfile(result.profile), status: 'success' })
        return
      }

      onComplete(result)
    })
  }

  reset = (): void => {
    this.profile = null
    this.storage.reset()
  }
}

export const sharedProfileStore = new SharedProfileStore()
