import type { TrainingProfile } from '../domain/types.js'

export type ExportProfileResult =
  | { destinationUri: string; status: 'success' }
  | { status: 'cancelled' }
  | { message: string; status: 'error' }

export type ImportProfileResult =
  | { profile: TrainingProfile; status: 'success' }
  | { status: 'cancelled' }
  | { message: string; status: 'error' }

export interface RunnerStorageModule {
  exportProfile: (callback: (status: string, detail: string | null) => void) => void
  importProfile: (callback: (status: string, detail: string | null) => void) => void
  loadProfileJson: () => string | null
  resetProfile: () => void
  saveProfileJson: (profileJson: string) => void
}

export interface RunnerProfileStorage {
  exportProfile: (onComplete: (result: ExportProfileResult) => void) => void
  importProfile: (onComplete: (result: ImportProfileResult) => void) => void
  load: () => TrainingProfile | null
  reset: () => void
  save: (profile: TrainingProfile) => void
}

const resolveRunnerStorageModule = (): RunnerStorageModule | null => {
  'background only'

  if (typeof NativeModules === 'undefined') return null

  return NativeModules.RunnerStorageModule ?? null
}

const parseProfileJson = (profileJson: string): TrainingProfile =>
  JSON.parse(profileJson) as TrainingProfile

const resolveExportResult = (status: string, detail: string | null): ExportProfileResult => {
  if (status === 'success') {
    return { destinationUri: detail ?? '', status: 'success' }
  }

  if (status === 'cancelled') {
    return { status: 'cancelled' }
  }

  return { message: detail ?? 'Export failed.', status: 'error' }
}

const resolveImportResult = (status: string, detail: string | null): ImportProfileResult => {
  if (status === 'success') {
    if (detail === null) {
      return { message: 'Import failed.', status: 'error' }
    }

    try {
      return { profile: parseProfileJson(detail), status: 'success' }
    } catch (error) {
      return {
        message: error instanceof Error ? error.message : 'Invalid profile data.',
        status: 'error',
      }
    }
  }

  if (status === 'cancelled') {
    return { status: 'cancelled' }
  }

  return { message: detail ?? 'Import failed.', status: 'error' }
}

const loadProfile = (): TrainingProfile | null => {
  'background only'

  const module = resolveRunnerStorageModule()

  if (!module) return null

  const profileJson = module.loadProfileJson()

  if (!profileJson) return null

  return parseProfileJson(profileJson)
}

const saveProfile = (profile: TrainingProfile): void => {
  'background only'

  const module = resolveRunnerStorageModule()

  if (!module) return

  module.saveProfileJson(JSON.stringify(profile))
}

const resetProfile = (): void => {
  'background only'

  const module = resolveRunnerStorageModule()

  if (!module) return

  module.resetProfile()
}

const exportProfile = (onComplete: (result: ExportProfileResult) => void): void => {
  'background only'

  const module = resolveRunnerStorageModule()

  if (!module) {
    onComplete({ status: 'cancelled' })
    return
  }

  module.exportProfile((status, detail) => {
    onComplete(resolveExportResult(status, detail))
  })
}

const importProfile = (onComplete: (result: ImportProfileResult) => void): void => {
  'background only'

  const module = resolveRunnerStorageModule()

  if (!module) {
    onComplete({ status: 'cancelled' })
    return
  }

  module.importProfile((status, detail) => {
    onComplete(resolveImportResult(status, detail))
  })
}

export const runnerProfileStorage: RunnerProfileStorage = {
  exportProfile,
  importProfile,
  load: loadProfile,
  reset: resetProfile,
  save: saveProfile,
}
