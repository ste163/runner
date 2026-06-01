import { useCallback, useEffect, useRef, useState } from '@lynx-js/react'
import * as router from 'sparkling-navigation'

import './Home.css'
import { DotChart } from '../../components/DotChart/index.js'
import { isGraduated } from '../../domain/intervals.js'
import { adjustLevelManually } from '../../domain/progression.js'
import { createDefaultProfile, sharedProfileStore } from '../../domain/profile.js'
import type { TrainingLevel, TrainingProfile } from '../../domain/types.js'
import { CurrentIntervalChart } from './components/CurrentIntervalChart/index.js'

const buildPageScheme = (bundle: string, title: string): string => {
  return (
    `hybrid://lynxview_page?bundle=${bundle}` +
    '&container_bg_color=%23000000' +
    '&force_theme_style=dark' +
    '&hide_nav_bar=1' +
    '&nav_bar_color=%23000000' +
    '&screen_orientation=portrait' +
    `&title=${encodeURIComponent(title)}` +
    '&trans_status_bar=0'
  )
}

const onboardingScheme = buildPageScheme('onboarding.lynx.bundle', 'How It Works')
const workoutScheme = buildPageScheme('workout.lynx.bundle', 'Workout')

const formatDuration = (seconds: number): string => {
  const roundedSeconds = Math.round(seconds)
  const minutes = Math.floor(roundedSeconds / 60)
  const remainingSeconds = roundedSeconds % 60

  return minutes === 0 ? `${remainingSeconds}s` : `${minutes}m ${remainingSeconds}s`
}

const buildIntervalDurationLines = (level: TrainingLevel): [string, string | null] => {
  if (isGraduated(level)) {
    return [formatDuration(level.intervalBlockSeconds), null]
  }

  return [formatDuration(level.runSeconds), formatDuration(level.walkSeconds)]
}

const buildRunPercent = (level: TrainingLevel): number => {
  const totalSeconds = Math.max(level.runSeconds + level.walkSeconds, 1)

  return isGraduated(level) ? 100 : (level.runSeconds / totalSeconds) * 100
}

const countWindowSessions = (profile: TrainingProfile): number => {
  if (profile.window.windowStart === '') {
    return profile.sessions.length
  }

  const weekWindowMilliseconds = 7 * 24 * 60 * 60 * 1000
  const windowStart = new Date(profile.window.windowStart).getTime()
  const windowEnd = windowStart + weekWindowMilliseconds

  return profile.sessions.reduce((count, session) => {
    const completedAt = new Date(session.completedAt).getTime()

    return completedAt >= windowStart && completedAt < windowEnd ? count + 1 : count
  }, 0)
}

const weekdayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const buildSuggestedSessionLabel = (
  profile: TrainingProfile,
  completedSessions: number,
  referenceDate: Date
): string => {
  const lastSession = profile.sessions[profile.sessions.length - 1]
  const sourceDate =
    completedSessions >= 3 && profile.window.windowStart !== ''
      ? new Date(profile.window.windowStart)
      : lastSession === undefined
        ? referenceDate
        : new Date(lastSession.completedAt)
  const suggestedDate = new Date(sourceDate)

  if (completedSessions >= 3) {
    suggestedDate.setUTCDate(suggestedDate.getUTCDate() + 7)
  } else {
    suggestedDate.setUTCDate(suggestedDate.getUTCDate() + 2)
  }

  return `Exercise again on ${weekdayNames[suggestedDate.getUTCDay()]}`
}

export const Home = (props: { onMounted?: () => void }): JSX.Element => {
  const [profile, setProfile] = useState<TrainingProfile>(() => createDefaultProfile())
  const [storageStatus, setStorageStatus] = useState('')
  const [debugJson, setDebugJson] = useState('')
  const [showManualAdjust, setShowManualAdjust] = useState(false)
  const hasOpenedOnboardingRef = useRef(false)

  const openOnboarding = useCallback((): void => {
    router.open({ scheme: onboardingScheme }, () => undefined)
  }, [])

  const openWorkout = useCallback((): void => {
    router.open({ scheme: workoutScheme }, () => undefined)
  }, [])

  useEffect(() => {
    const next = sharedProfileStore.hydrate()

    setProfile(next.profile)
    props.onMounted?.()

    if (next.isFirstLaunch && !hasOpenedOnboardingRef.current) {
      hasOpenedOnboardingRef.current = true
      openOnboarding()
    }
  }, [openOnboarding, props.onMounted])

  const handleLevelAdjustment = useCallback((direction: 'up' | 'down'): void => {
    setProfile((currentProfile) => {
      const nextProfile = {
        ...currentProfile,
        level: adjustLevelManually(currentProfile.level, direction),
      }

      sharedProfileStore.save(nextProfile)

      return nextProfile
    })
  }, [])

  const handleDecreaseLevel = useCallback((): void => {
    handleLevelAdjustment('down')
  }, [handleLevelAdjustment])

  const handleIncreaseLevel = useCallback((): void => {
    handleLevelAdjustment('up')
  }, [handleLevelAdjustment])

  const handleExportProfile = useCallback((): void => {
    setStorageStatus('Choose where to save the JSON file.')
    sharedProfileStore.exportProfile((result) => {
      if (result.status === 'success') {
        setStorageStatus('Exported current profile.')
        return
      }

      if (result.status === 'cancelled') {
        setStorageStatus('Export cancelled.')
        return
      }

      setStorageStatus(result.message)
    })
  }, [])

  const handleImportProfile = useCallback((): void => {
    setStorageStatus('Choose the JSON file from your device.')
    sharedProfileStore.importProfile((result) => {
      if (result.status === 'success') {
        setProfile(result.profile)
        setStorageStatus('Imported profile from device.')
        return
      }

      if (result.status === 'cancelled') {
        setStorageStatus('Import cancelled.')
        return
      }

      setStorageStatus(result.message)
    })
  }, [])

  const handleShowCurrentJson = useCallback((): void => {
    setDebugJson(JSON.stringify(profile, null, 2))
  }, [profile])

  const toggleManualAdjust = useCallback((): void => {
    setShowManualAdjust((currentValue) => !currentValue)
  }, [])

  const currentWindowSessions = countWindowSessions(profile)
  const currentProgress = Math.min(currentWindowSessions, 3)
  const runPercent = buildRunPercent(profile.level)
  const [runDurationLabel, walkDurationLabel] = buildIntervalDurationLines(profile.level)
  const suggestedSessionLabel = buildSuggestedSessionLabel(
    profile,
    currentWindowSessions,
    new Date()
  )
  return (
    <scroll-view className='page-scroll' scroll-orientation='vertical'>
      <view className='app home'>
        <view className='home__section home__section--full home__section--week home__section--center'>
          <DotChart
            amountValue={`${currentProgress}/3 completed`}
            color='primary'
            completedCount={currentProgress}
            label='This Week'
            totalCount={3}
            {...(currentProgress >= 3 ? { detail: suggestedSessionLabel } : {})}
          />
        </view>

        <view className='home__section home__section--full home__section--center'>
          <text className='dotChart__label'>Current interval</text>
        </view>

        <view className='home__section home__section--full'>
          <CurrentIntervalChart
            runAmount={runDurationLabel}
            walkAmount={walkDurationLabel ?? 'Graduated'}
            runPercent={runPercent}
          />
        </view>

        <view className='home__section home__section--full'>
          <view className='home__helperToggle' bindtap={toggleManualAdjust}>
            <text className='home__helperToggleText'>
              {showManualAdjust ? 'Hide manually adjusted interval' : 'Manually adjust interval'}
            </text>
          </view>
          {showManualAdjust ? (
            <view className='actions-row'>
              <view className='secondary actions-row__button' bindtap={handleDecreaseLevel}>
                <text className='secondary__text'>- Decrease</text>
              </view>
              <view className='secondary actions-row__button' bindtap={handleIncreaseLevel}>
                <text className='secondary__text'>+ Add</text>
              </view>
            </view>
          ) : null}
        </view>

        <view className='home__section home__section--full'>
          <view className='primary' bindtap={openWorkout}>
            <text className='primary__text'>Start Workout</text>
            <text className='primary__icon'>→</text>
          </view>
        </view>

        <view className='home__section home__section--full'>
          <text className='label'>This month</text>
          <text className='copy'>Coming soon.</text>
        </view>

        <view className='home__section home__section--full'>
          <text className='label'>Backup & restore</text>
          <view className='stack'>
            <text className='copy'>
              Use Android pickers to export or import the current profile JSON.
            </text>
            <view className='secondary' bindtap={handleExportProfile}>
              <text className='secondary__text'>Export JSON</text>
            </view>
            <view className='secondary' bindtap={handleImportProfile}>
              <text className='secondary__text'>Import JSON</text>
            </view>
            <view className='secondary' bindtap={handleShowCurrentJson}>
              <text className='secondary__text'>Show current JSON</text>
            </view>
          </view>
          <text className='copy'>{storageStatus}</text>
          {debugJson ? <text className='result pill--mono'>{debugJson}</text> : null}
        </view>
      </view>
    </scroll-view>
  )
}
