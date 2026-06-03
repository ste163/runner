import { useCallback, useEffect, useRef, useState } from '@lynx-js/react'
import * as router from 'sparkling-navigation'

import './Workout.css'
import { isGraduated } from '../../domain/intervals.js'
import { sharedProfileStore } from '../../domain/profile.js'
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

const activeWorkoutScheme = buildPageScheme('activeWorkout.lynx.bundle', 'Active Workout')

interface WorkoutProps {
  onMounted?: () => void
}

const formatDuration = (seconds: number): string => {
  const roundedSeconds = Math.round(seconds)
  const minutes = Math.floor(roundedSeconds / 60)
  const remainder = roundedSeconds % 60

  return minutes === 0 ? `${remainder}s` : `${minutes}m ${remainder}s`
}

const levelLabel = (level: TrainingLevel): string =>
  isGraduated(level)
    ? `Running ${formatDuration(level.intervalBlockSeconds)}`
    : `Run ${formatDuration(level.runSeconds)} · Walk ${formatDuration(level.walkSeconds)}`

export const Workout = ({ onMounted }: WorkoutProps): JSX.Element => {
  const [sessionProfile] = useState<TrainingProfile>(
    () => sharedProfileStore.loadOrCreate().profile
  )
  const hasStartedRef = useRef(false)

  const handleStart = useCallback((): void => {
    router.open({ scheme: activeWorkoutScheme }, () => undefined)
  }, [])

  useEffect(() => {
    if (hasStartedRef.current) return

    hasStartedRef.current = true
    onMounted?.()
  }, [onMounted])

  return (
    <scroll-view className='page-scroll' scroll-orientation='vertical'>
      <view className='workout'>
        <view className='hero hero--tight'>
          <text className='eyebrow'>Workout</text>
          <text className='title'>Runner</text>
          <text className='subtitle'>
            Tap start when you are ready. The timer begins with the warmup walk.
          </text>
        </view>

        <view className='card timer-card'>
          <view className='timer-card__header'>
            <text className='label'>Ready</text>
            <text className='timer-card__tag'>Not started</text>
          </view>

          <text className='timer'>{levelLabel(sessionProfile.level)}</text>

          <view className='timer-card__meta'>
            <text className='copy'>
              Warmup walk starts first, then the 20-minute interval block.
            </text>
            <text className='copy'>Haptics and countdown start after you tap Start Workout.</text>
          </view>
        </view>

        <view className='card'>
          <text className='label'>Session flow</text>
          <view className='stack'>
            <text className='copy'>Warmup walk: 5 minutes</text>
            <text className='copy'>Interval block: 20 minutes</text>
            <text className='copy'>Cooldown walk: 5 minutes</text>
          </view>
        </view>

        <view className='primary' bindtap={handleStart}>
          <text className='primary__text'>Start Workout</text>
        </view>
      </view>
    </scroll-view>
  )
}
