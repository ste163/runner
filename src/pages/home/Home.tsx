import { useCallback, useEffect, useRef, useState } from '@lynx-js/react'
import * as router from 'sparkling-navigation'

import './Home.css'
import { BarChart } from '../../components/BarChart/index.js'
import { DotChart } from '../../components/DotChart/index.js'
import { isGraduated } from '../../domain/intervals.js'
import { adjustLevelManually } from '../../domain/progression.js'
import { createDefaultProfile, sharedProfileStore } from '../../domain/profile.js'
import type { TrainingLevel, TrainingProfile } from '../../domain/types.js'

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
    return [`Run ${formatDuration(level.intervalBlockSeconds)}`, null]
  }

  return [`Run ${formatDuration(level.runSeconds)}`, `Walk ${formatDuration(level.walkSeconds)}`]
}

const buildRunPercent = (level: TrainingLevel): number => {
  const totalSeconds = Math.max(level.runSeconds + level.walkSeconds, 1)

  return isGraduated(level) ? 100 : (level.runSeconds / totalSeconds) * 100
}

const buildWalkPercent = (level: TrainingLevel): number => {
  const totalSeconds = Math.max(level.runSeconds + level.walkSeconds, 1)

  return isGraduated(level) ? 0 : (level.walkSeconds / totalSeconds) * 100
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

const buildProgressMessage = (profile: TrainingProfile, completedSessions: number): string => {
  if (isGraduated(profile.level)) {
    return 'Continuous running mode unlocked.'
  }

  const remainingSessions = Math.max(3 - completedSessions, 0)

  return remainingSessions === 1
    ? 'Complete 1 more session this week to progress!'
    : `Complete ${remainingSessions} more sessions this week to progress!`
}

const buildSuggestedSessionLabel = (profile: TrainingProfile, referenceDate: Date): string => {
  const weekdayNames = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ]
  const lastSession = profile.sessions[profile.sessions.length - 1]
  const sourceDate = lastSession === undefined ? referenceDate : new Date(lastSession.completedAt)
  const suggestedDate = new Date(sourceDate)

  suggestedDate.setDate(suggestedDate.getDate() + 2)

  return `Next suggested session: ${weekdayNames[suggestedDate.getDay()]}`
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
  const walkPercent = buildWalkPercent(profile.level)
  const [runDurationLabel, walkDurationLabel] = buildIntervalDurationLines(profile.level)
  const progressMessage = buildProgressMessage(profile, currentWindowSessions)
  const suggestedSessionLabel = buildSuggestedSessionLabel(profile, new Date())
  return (
    <scroll-view className='page-scroll' scroll-orientation='vertical'>
      <view className='app home'>
        <view className='home__section home__section--full'>
          <DotChart
            amountValue={`${currentProgress}/3 completed`}
            color='primary'
            completedCount={currentProgress}
            label='Week'
            totalCount={3}
          />
          <text className='copy'>{progressMessage}</text>
          <text className='copy'>{suggestedSessionLabel}</text>
        </view>

        <view className='home__section home__section--full'>
          <text className='label'>Current interval</text>
          <BarChart
            amountValue={runDurationLabel}
            color='primary'
            fillPercent={runPercent}
            label='Run'
          />
          <BarChart
            amountValue={walkDurationLabel ?? 'Graduated'}
            color='secondary'
            fillPercent={walkPercent}
            label='Walk'
          />
        </view>

        <view className='home__section home__section--full'>
          <view className='secondary secondary--compact' bindtap={toggleManualAdjust}>
            <text className='secondary__text'>{showManualAdjust ? 'Hide adjust' : 'Adjust'}</text>
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
