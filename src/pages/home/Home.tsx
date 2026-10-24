import { useCallback, useEffect, useState, type ReactElement } from '@lynx-js/react'

import './Home.css'
import { formatClockDuration } from '@/format.js'
import { isGraduated } from '@/domain/intervals.js'
import { adjustLevelManually } from '@/domain/progression.js'
import { sharedProfileStore } from '@/domain/profile.js'
import type { TrainingLevel } from '@/domain/types.js'
import { useSharedProfile } from '@/domain/useSharedProfile.js'
import { buildWeekView, countWindowSessions } from '@/domain/weekView.js'
import { CurrentIntervalDonut } from '@/pages/home/components/CurrentIntervalDonut/index.js'
import { ThisWeekDonut } from '@/pages/home/components/ThisWeekDonut/index.js'
import { WeekStrip } from '@/pages/home/components/WeekStrip/index.js'
import { Button, buildPlayIconContent } from '@/components/Button/index.js'
import { Card } from '@/components/Card/index.js'
import { Pressable } from '@/components/Pressable/index.js'
import { themeColors } from '@/theme.js'

const buildIntervalDurationLines = (level: TrainingLevel): [string, string | null] => {
  if (isGraduated(level)) {
    return [formatClockDuration(level.intervalBlockSeconds), null]
  }

  return [formatClockDuration(level.runSeconds), formatClockDuration(level.walkSeconds)]
}

const buildRunPercent = (level: TrainingLevel): number => {
  const totalSeconds = Math.max(level.runSeconds + level.walkSeconds, 1)

  return isGraduated(level) ? 100 : (level.runSeconds / totalSeconds) * 100
}

const buildInfoIconContent = (): string =>
  `<svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" ` +
  `fill="none" stroke="${themeColors.iconMuted}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">` +
  `<circle cx="12" cy="12" r="10"/>` +
  `<path d="M12 16v-4"/>` +
  `<circle cx="12" cy="8" r="1" fill="${themeColors.iconMuted}" stroke="none"/>` +
  `</svg>`

export const Home = (props: {
  onMounted?: () => void
  onStartWorkout: () => void
}): ReactElement => {
  const { profile } = useSharedProfile()
  const [showManualAdjust, setShowManualAdjust] = useState(false)

  useEffect(() => {
    props.onMounted?.()
  }, [props.onMounted])

  const handleLevelAdjustment = useCallback((direction: 'up' | 'down'): void => {
    const currentProfile = sharedProfileStore.loadOrCreate().profile
    const nextProfile = {
      ...currentProfile,
      level: adjustLevelManually(currentProfile.level, direction),
    }

    sharedProfileStore.save(nextProfile)
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
  const now = new Date()
  const weekPages = [-1, 0, 1].map((weekOffset) => buildWeekView(profile, now, weekOffset))
  const currentWeek = weekPages[1]
  const runPercent = buildRunPercent(profile.level)
  const [runDurationLabel, walkDurationLabel] = buildIntervalDurationLines(profile.level)
  return (
    <view className='page home'>
      <Card
        title='This Week'
        subtitle={currentWeek?.recommendation ?? ''}
        className='home__section--week'
        headerContent={<ThisWeekDonut completedCount={currentProgress} totalCount={3} />}
      >
        <WeekStrip pages={weekPages} />
      </Card>

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
