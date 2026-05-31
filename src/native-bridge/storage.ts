import type { TrainingProfile } from '../domain/types.js'

type StorageCompletionStatus = 'success' | 'cancelled' | 'error'
type StorageCompletionCallback = (status: StorageCompletionStatus, detail: string | null) => void
type StorageCancelledResult = { status: 'cancelled' }
type StorageErrorResult = { message: string; status: 'error' }
type StorageSuccessResult<T> = { status: 'success' } & T
type StorageResult<T> = StorageSuccessResult<T> | StorageCancelledResult | StorageErrorResult

export type ExportProfileResult = StorageResult<{ destinationUri: string }>
export type ImportProfileResult = StorageResult<{ profile: TrainingProfile }>
export type RunnerStorageModule = {
  exportProfile: (callback: StorageCompletionCallback) => void
  importProfile: (callback: StorageCompletionCallback) => void
  loadProfileJson: () => string | null
  resetProfile: () => void
  saveProfileJson: (profileJson: string) => void
}

const parseProfileJson = (profileJson: string): TrainingProfile =>
  JSON.parse(profileJson) as TrainingProfile

const resolveStorageResult = <T extends object>(
  status: StorageCompletionStatus,
  detail: string | null,
  buildSuccess: (detail: string | null) => T,
  errorMessage: string
): StorageResult<T> => {
  if (status === 'cancelled') return { status: 'cancelled' }

  if (status === 'success') {
    try {
      return { ...buildSuccess(detail), status: 'success' }
    } catch (error) {
      return {
        message: error instanceof Error ? error.message : 'Invalid profile data.',
        status: 'error',
      }
    }
  }

  return { message: detail ?? errorMessage, status: 'error' }
}

const resolveExportResult = (
  status: StorageCompletionStatus,
  detail: string | null
): ExportProfileResult =>
  resolveStorageResult(
    status,
    detail,
    (destinationUri) => ({ destinationUri: destinationUri ?? '' }),
    'Export failed.'
  )

const resolveImportResult = (
  status: StorageCompletionStatus,
  detail: string | null
): ImportProfileResult =>
  resolveStorageResult(
    status,
    detail,
    (profileJson) => {
      if (!profileJson) throw new Error('Import failed.')
      return { profile: parseProfileJson(profileJson) }
    },
    'Import failed.'
  )

class RunnerProfileStorageSingleton {
  private module: RunnerStorageModule | null = null

  configure = (module: RunnerStorageModule | null): void => {
    this.module = module
  }

  exportProfile = (onComplete: (result: ExportProfileResult) => void): void => {
    'background only'

    if (!this.module) {
      onComplete({ status: 'cancelled' })
      return
    }

    this.module.exportProfile((status, detail) => {
      onComplete(resolveExportResult(status, detail))
    })
  }

  importProfile = (onComplete: (result: ImportProfileResult) => void): void => {
    'background only'

    if (!this.module) {
      onComplete({ status: 'cancelled' })
      return
    }

    this.module.importProfile((status, detail) => {
      onComplete(resolveImportResult(status, detail))
    })
  }

  load = (): TrainingProfile | null => {
    'background only'

    if (!this.module) return null
    const profileJson = this.module.loadProfileJson()
    if (!profileJson) return null

    return parseProfileJson(profileJson)
  }

  reset = (): void => {
    'background only'

    if (!this.module) return
    this.module.resetProfile()
  }

  save = (profile: TrainingProfile): void => {
    'background only'

    if (!this.module) return
    this.module.saveProfileJson(JSON.stringify(profile))
  }
}

export const runnerProfileStorage = new RunnerProfileStorageSingleton()
