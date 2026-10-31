import { renderHook } from '@lynx-js/react/testing-library'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { sharedProfileStore } from '@/domain/profile.js'
import type { TrainingProfile } from '@/domain/types.js'
import { runnerProfileStorage, type RunnerStorageModule } from '@/native-bridge/storage.js'
import { useSharedProfile } from '@/domain/useSharedProfile.js'

const buildProfile = (runSeconds: number): TrainingProfile => ({
  schemaVersion: 1,
  level: { runSeconds, walkSeconds: 90, intervalBlockSeconds: 1200 },
  window: { windowStart: '', consecutiveMissed: 0 },
  sessions: [],
})

const buildStorageModule = (profileJson: string | null): RunnerStorageModule => ({
  exportProfile: vi.fn(),
  importProfile: vi.fn(),
  loadProfileJson: vi.fn(() => profileJson),
  resetProfile: vi.fn(),
  saveProfileJson: vi.fn(),
})

describe('useSharedProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sharedProfileStore.reset()
    runnerProfileStorage.configure(null)
  })

  afterEach(() => {
    runnerProfileStorage.configure(null)
  })

  it('hydrates the stored profile on mount', async () => {
    runnerProfileStorage.configure(buildStorageModule(JSON.stringify(buildProfile(33))))

    const { result } = renderHook(() => useSharedProfile())

    await vi.waitFor(() => {
      expect(result.current.profile.level.runSeconds).toBe(33)
    })
  })

  it('saves the default profile on first launch', async () => {
    const storage = buildStorageModule(null)
    runnerProfileStorage.configure(storage)

    renderHook(() => useSharedProfile())

    await vi.waitFor(() => {
      expect(storage.saveProfileJson).toHaveBeenCalledTimes(1)
    })

    expect(vi.mocked(storage.saveProfileJson).mock.calls[0]?.[0]).toBe(
      JSON.stringify(buildProfile(30))
    )
  })

  it('updates the profile when the store changes', async () => {
    runnerProfileStorage.configure(buildStorageModule(JSON.stringify(buildProfile(33))))

    const { result } = renderHook(() => useSharedProfile())

    await vi.waitFor(() => {
      expect(result.current.profile.level.runSeconds).toBe(33)
    })

    sharedProfileStore.save(buildProfile(60))

    await vi.waitFor(() => {
      expect(result.current.profile.level.runSeconds).toBe(60)
    })
  })

  it('skips hydration when inactive', async () => {
    const storage = buildStorageModule(JSON.stringify(buildProfile(33)))
    runnerProfileStorage.configure(storage)

    const { result } = renderHook(() => useSharedProfile({ active: false }))

    await new Promise((resolve) => setTimeout(resolve, 50))

    expect(storage.loadProfileJson).not.toHaveBeenCalled()
    expect(result.current.profile.level.runSeconds).toBe(30)
  })

  it('stops updating after unmount', async () => {
    runnerProfileStorage.configure(buildStorageModule(JSON.stringify(buildProfile(33))))

    const { result, unmount } = renderHook(() => useSharedProfile())

    await vi.waitFor(() => {
      expect(result.current.profile.level.runSeconds).toBe(33)
    })

    unmount()
    sharedProfileStore.save(buildProfile(60))

    expect(result.current.profile.level.runSeconds).toBe(33)
  })
})
