import { useCallback, useEffect, useState } from '@lynx-js/react'

import { createDefaultProfile, sharedProfileStore } from './profile.js'
import type { TrainingProfile } from './types.js'

interface UseSharedProfileResult {
  profile: TrainingProfile
  refresh: () => void
}

export const useSharedProfile = (options?: { active?: boolean }): UseSharedProfileResult => {
  const active = options?.active ?? true
  const [profile, setProfile] = useState<TrainingProfile>(() => createDefaultProfile())

  useEffect(() => {
    if (!active) return undefined

    setProfile(sharedProfileStore.hydrate().profile)

    return sharedProfileStore.subscribe((nextProfile) => {
      setProfile(nextProfile)
    })
  }, [active])

  const refresh = useCallback((): void => {
    setProfile(sharedProfileStore.hydrate().profile)
  }, [])

  return { profile, refresh }
}
