import { useCallback, useEffect, useState, type ReactElement } from '@lynx-js/react'

import './Home.css'
import { isGraduated } from '../../domain/intervals.js'
import { adjustLevelManually } from '../../domain/progression.js'
import { createDefaultProfile, sharedProfileStore } from '../../domain/profile.js'
import type { TrainingLevel, TrainingProfile } from '../../domain/types.js'
import { CurrentIntervalDonut } from './components/CurrentIntervalDonut/index.js'
import { ThisWeekDonut } from './components/ThisWeekDonut/index.js'
import { Button, buildPlayIconContent } from '../../components/Button/index.js'
import { Card } from '../../components/Card/index.js'
import { Pressable } from '../../components/Pressable/index.js'
import { themeColors } from '../../theme.js'

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

const buildInfoIconContent = (): string =>
  `<svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" ` +
  `fill="none" stroke="${themeColors.iconMuted}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">` +
  `<circle cx="12" cy="12" r="10"/>` +
  `<path d="M12 16v-4"/>` +
  `<circle cx="12" cy="8" r="1" fill="${themeColors.iconMuted}" stroke="none"/>` +
  `</svg>`

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
  onStartWorkout: () => void
}): ReactElement => {
  const [profile, setProfile] = useState<TrainingProfile>(() => createDefaultProfile())
  const [showManualAdjust, setShowManualAdjust] = useState(false)

  useEffect(() => {
    const next = sharedProfileStore.hydrate()

    setProfile(next.profile)
    props.onMounted?.()
  }, [props.onMounted])

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
    <view className='page home'>
      <Card
        title='This Week'
        subtitle={recommendationLabel}
        className='home__section--week'
        headerContent={<ThisWeekDonut completedCount={currentProgress} totalCount={3} />}
      />

      <Card
        title='Current interval'
        className='home__section--interval'
        headerContent={
          <Pressable className='home__infoIcon' testId='adjust-info' onTap={toggleManualAdjust}>
            <svg content={buildInfoIconContent()} style={{ width: '20px', height: '20px' }} />
          </Pressable>
        }
      >
        {showManualAdjust ? (
          <view className='home__adjustPanel'>
            <text className='home__adjustSubtitle'>
              Run intervals increase by 10% dynamically after three completed runs, or you can
              adjust intervals manually to suit your needs.
            </text>
            <view className='actions-row'>
              <Pressable className='actions-row__button' onTap={handleDecreaseLevel}>
                <text className='actions-row__buttonText'>Decrease 10%</text>
              </Pressable>
              <Pressable className='actions-row__button' onTap={handleIncreaseLevel}>
                <text className='actions-row__buttonText'>Increase 10%</text>
              </Pressable>
            </view>
          </view>
        ) : null}
        <CurrentIntervalDonut
          runLabel={`Run ${runDurationLabel}`}
          walkLabel={walkDurationLabel === null ? 'Graduated' : `Walk ${walkDurationLabel}`}
          runPercent={runPercent}
        />
      </Card>

      <view className='home__section'>
        <Button label='Start Workout' icon={buildPlayIconContent()} onTap={props.onStartWorkout} />
      </view>
    </view>
  )
}
