import { useCallback, useEffect, useRef, useState, type ReactElement } from '@lynx-js/react'

import './Home.css'
import { isGraduated } from '../../domain/intervals.js'
import { adjustLevelManually } from '../../domain/progression.js'
import { createDefaultProfile, sharedProfileStore } from '../../domain/profile.js'
import type { TrainingLevel, TrainingProfile } from '../../domain/types.js'
import { CurrentIntervalChart } from './components/CurrentIntervalChart/index.js'
import { ThisWeekDonut } from './components/ThisWeekDonut/index.js'

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

const buildDayList = (anchorDate: Date, dayOffsets: number[]): string =>
  dayOffsets
    .map((offset) => {
      const date = new Date(anchorDate)
      date.setUTCDate(date.getUTCDate() + offset)
      return weekdayNames[date.getUTCDay()]
    })
    .join(', ')

const buildRecommendationLabel = (
  profile: TrainingProfile,
  completedSessions: number,
  referenceDate: Date
): string => {
  if (completedSessions === 0) {
    return `Recommended days: run on ${buildDayList(referenceDate, [0, 2, 4])}`
  }

  const lastSession = profile.sessions[profile.sessions.length - 1]
  const anchorDate = lastSession === undefined ? referenceDate : new Date(lastSession.completedAt)

  if (completedSessions >= 3) {
    const nextDate = new Date(anchorDate)
    nextDate.setUTCDate(nextDate.getUTCDate() + 2)
    return `Exercise again on ${weekdayNames[nextDate.getUTCDay()]}`
  }

  const remainingSessions = 3 - completedSessions
  const dayOffsets = [2, 4, 6].slice(0, remainingSessions)

  return `Recommended days: run on ${buildDayList(anchorDate, dayOffsets)}`
}

export const Home = (props: {
  onMounted?: () => void
  onOpenOnboarding: () => void
  onStartWorkout: () => void
}): ReactElement => {
  const [profile, setProfile] = useState<TrainingProfile>(() => createDefaultProfile())
  const [showManualAdjust, setShowManualAdjust] = useState(false)
  const hasOpenedOnboardingRef = useRef(false)

  useEffect(() => {
    const next = sharedProfileStore.hydrate()

    setProfile(next.profile)
    props.onMounted?.()

    if (next.isFirstLaunch && !hasOpenedOnboardingRef.current) {
      hasOpenedOnboardingRef.current = true
      props.onOpenOnboarding()
    }
  }, [props.onMounted, props.onOpenOnboarding])

  useEffect(() => {
    return sharedProfileStore.subscribe((nextProfile) => {
      setProfile(nextProfile)
    })
  }, [])

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

  const toggleManualAdjust = useCallback((): void => {
    setShowManualAdjust((currentValue) => !currentValue)
  }, [])

  const currentWindowSessions = countWindowSessions(profile)
  const currentProgress = Math.min(currentWindowSessions, 3)
  const runPercent = buildRunPercent(profile.level)
  const [runDurationLabel, walkDurationLabel] = buildIntervalDurationLines(profile.level)
  const recommendationLabel = buildRecommendationLabel(profile, currentWindowSessions, new Date())
  return (
    <view className='page-shell'>
      <scroll-view className='page-scroll' scroll-orientation='vertical'>
        <view className='app home'>
          <view className='home__section home__section--full home__section--week'>
            <ThisWeekDonut
              completedCount={currentProgress}
              totalCount={3}
              subtitle={recommendationLabel}
            />
          </view>

          <view className='home__section home__section--full home__section--center'>
            <text className='home__sectionTitle'>Current interval</text>
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
            <view className='primary' bindtap={props.onStartWorkout}>
              <text className='primary__text'>Start Workout</text>
              <text className='primary__icon'>→</text>
            </view>
          </view>
        </view>
      </scroll-view>
    </view>
  )
}
