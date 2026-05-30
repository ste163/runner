import { useCallback, useEffect, useRef, useState } from '@lynx-js/react'
import * as router from 'sparkling-navigation'

import './Home.css'
import { isGraduated } from '../../domain/intervals.js'
import { adjustLevelManually } from '../../domain/progression.js'
import { createDefaultProfile, sharedProfileStore } from '../../domain/profile.js'
import type { TrainingLevel, TrainingProfile } from '../../domain/types.js'

const onboardingScheme =
  'hybrid://lynxview_page?bundle=onboarding.lynx.bundle&title=How%20It%20Works&screen_orientation=portrait'
const workoutScheme =
  'hybrid://lynxview_page?bundle=second.lynx.bundle&title=Workout&screen_orientation=portrait'
const weekWindowMilliseconds = 7 * 24 * 60 * 60 * 1000
const weekdayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const formatDuration = (seconds: number): string => {
  const roundedSeconds = Math.round(seconds)
  const minutes = Math.floor(roundedSeconds / 60)
  const remainingSeconds = roundedSeconds % 60

  return minutes === 0 ? `${remainingSeconds}s` : `${minutes}m ${remainingSeconds}s`
}

const buildIntervalLabel = (level: TrainingLevel): string =>
  isGraduated(level)
    ? `Running ${formatDuration(level.intervalBlockSeconds)}`
    : `Run ${formatDuration(level.runSeconds)} · Walk ${formatDuration(level.walkSeconds)}`

const countWindowSessions = (profile: TrainingProfile): number => {
  if (profile.window.windowStart === '') {
    return profile.sessions.length
  }

  const windowStart = new Date(profile.window.windowStart).getTime()
  const windowEnd = windowStart + weekWindowMilliseconds

  return profile.sessions.reduce((count, session) => {
    const completedAt = new Date(session.completedAt).getTime()

    return completedAt >= windowStart && completedAt < windowEnd ? count + 1 : count
  }, 0)
}

const buildProgressDots = (completedSessions: number): string[] =>
  Array.from({ length: 3 }, (_, index) => (index < Math.min(completedSessions, 3) ? '●' : '○'))

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
  const lastSession = profile.sessions[profile.sessions.length - 1]
  const sourceDate = lastSession === undefined ? referenceDate : new Date(lastSession.completedAt)
  const suggestedDate = new Date(sourceDate)

  suggestedDate.setDate(suggestedDate.getDate() + 2)

  return `Next suggested session: ${weekdayNames[suggestedDate.getDay()]}`
}

export function Home(props: { onMounted?: () => void }): JSX.Element {
  const [profile, setProfile] = useState<TrainingProfile>(() => createDefaultProfile())
  const hasOpenedOnboardingRef = useRef(false)

  const openOnboarding = useCallback((): void => {
    router.open({ scheme: onboardingScheme }, () => undefined)
  }, [])

  const openWorkout = useCallback((): void => {
    router.open({ scheme: workoutScheme }, () => undefined)
  }, [])

  useEffect(() => {
    const next = sharedProfileStore.loadOrCreate()

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

  const currentWindowSessions = countWindowSessions(profile)
  const currentProgress = Math.min(currentWindowSessions, 3)
  const progressDots = buildProgressDots(currentProgress)
  const intervalLabel = buildIntervalLabel(profile.level)
  const progressMessage = buildProgressMessage(profile, currentWindowSessions)
  const suggestedSessionLabel = buildSuggestedSessionLabel(profile, new Date())

  return (
    <scroll-view className='page-scroll' scroll-orientation='vertical'>
      <view className='app'>
        <view className='hero'>
          <text className='eyebrow'>Runner</text>
          <text className='title'>3 sessions. 7-day windows.</text>
          <text className='subtitle'>Simple run/walk progress, no extra noise.</text>
        </view>

        <view className='card'>
          <view className='card__header'>
            <text className='card__title'>This week</text>
            <text className='card__tag'>{currentProgress}/3</text>
          </view>
          <view className='tracker'>
            {progressDots.map((dot, index) => (
              <text
                key={`${dot}-${index}`}
                className={dot === '●' ? 'tracker__dot tracker__dot--filled' : 'tracker__dot'}
              >
                {dot}
              </text>
            ))}
          </view>
          <text className='copy'>{progressMessage}</text>
        </view>

        <view className='card'>
          <text className='label'>Current interval</text>
          <text className='pill pill--mono'>{intervalLabel}</text>
          <text className='copy'>{suggestedSessionLabel}</text>
        </view>

        <view className='card'>
          <text className='label'>Manual adjust</text>
          <view className='stack'>
            <view className='secondary' bindtap={handleDecreaseLevel}>
              <text className='secondary__text'>Decrease 10%</text>
            </view>
            <view className='secondary' bindtap={handleIncreaseLevel}>
              <text className='secondary__text'>Increase 10%</text>
            </view>
          </view>
        </view>

        <view className='card'>
          <view className='primary' bindtap={openWorkout}>
            <text className='primary__text'>Start Workout</text>
            <text className='primary__icon'>→</text>
          </view>
        </view>
      </view>
    </scroll-view>
  )
}
