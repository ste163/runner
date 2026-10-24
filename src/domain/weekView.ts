import type { Session, TrainingProfile } from '@/domain/types.js'
import {
  addCalendarDays,
  isBeforeLocalDay,
  isSameLocalDay,
  startOfLocalDay,
} from '@/domain/calendar.js'

export type WeekDayState = 'idle' | 'planned' | 'completed'

export interface WeekDayView {
  key: string
  label: string
  state: WeekDayState
  isToday: boolean
}

export interface WeekView {
  days: WeekDayView[]
  recommendation: string
  canGoBack: boolean
  canGoForward: boolean
}

const dayLetters = ['S', 'M', 'T', 'W', 'R', 'F', 'S']
const weekdayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const targetRunCount = 3
const restDaysBetweenRuns = 2

const buildDayLetter = (date: Date): string => dayLetters[date.getDay()] ?? ''
const buildWeekdayName = (date: Date): string => weekdayNames[date.getDay()] ?? ''

export const countWindowSessions = (profile: TrainingProfile): number => {
  if (profile.window.windowStart === '') {
    return profile.sessions.length
  }

  const windowStartDay = startOfLocalDay(new Date(profile.window.windowStart))
  const windowEndDay = addCalendarDays(windowStartDay, 7)

  return profile.sessions.reduce((count, session) => {
    const completedDay = startOfLocalDay(new Date(session.completedAt))

    return !isBeforeLocalDay(completedDay, windowStartDay) &&
      isBeforeLocalDay(completedDay, windowEndDay)
      ? count + 1
      : count
  }, 0)
}

const longMonthNames = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

const formatWindowDay = (date: Date): string =>
  `${weekdayNames[date.getDay()] ?? ''}, ${longMonthNames[date.getMonth()] ?? ''} ${date.getDate()}`

export const buildTrainingWindowLabel = (profile: TrainingProfile, now: Date): string => {
  if (profile.window.windowStart === '') {
    return 'Training window: starts with your first run'
  }

  const startDay = startOfLocalDay(new Date(profile.window.windowStart))
  const endDay = addCalendarDays(startDay, 7)
  const runCount = countWindowSessions(profile)

  if (isWindowActive(profile, now) && runCount >= 3) {
    return (
      `Training window: ${formatWindowDay(startDay)} to ${formatWindowDay(endDay)}` +
      ` · Complete · Next: ${formatWindowDay(endDay)}`
    )
  }

  return (
    `Training window: ${formatWindowDay(startDay)} to ${formatWindowDay(endDay)}` +
    ` · ${runCount} of 3 runs`
  )
}

const isWindowActive = (profile: TrainingProfile, now: Date): boolean => {
  if (profile.window.windowStart === '') return false

  const windowEndDay = addCalendarDays(startOfLocalDay(new Date(profile.window.windowStart)), 7)

  return isBeforeLocalDay(startOfLocalDay(now), windowEndDay)
}

const buildWindowRuns = (profile: TrainingProfile, now: Date): Date[] => {
  if (!isWindowActive(profile, now)) return []

  const windowStartDay = startOfLocalDay(new Date(profile.window.windowStart))
  const windowEndDay = addCalendarDays(windowStartDay, 7)

  return profile.sessions
    .map((session) => new Date(session.completedAt))
    .filter((completedAt) => {
      const completedDay = startOfLocalDay(completedAt)

      return (
        !isBeforeLocalDay(completedDay, windowStartDay) &&
        isBeforeLocalDay(completedDay, windowEndDay)
      )
    })
    .sort((a, b) => a.getTime() - b.getTime())
}

const buildWeekStart = (now: Date): Date => {
  const daysSinceMonday = (now.getDay() + 6) % 7

  return addCalendarDays(startOfLocalDay(now), -daysSinceMonday)
}

const buildWeekDays = (weekStart: Date): Date[] =>
  Array.from({ length: 7 }, (_, index) => addCalendarDays(weekStart, index))

const buildWeekRuns = (sessions: Session[], weekDays: Date[]): Date[] =>
  sessions
    .map((session) => new Date(session.completedAt))
    .filter((completedAt) => weekDays.some((day) => isSameLocalDay(completedAt, day)))
    .sort((a, b) => a.getTime() - b.getTime())

const buildPlanDays = (windowRuns: Date[], today: Date): Date[] => {
  const remainingRunCount = targetRunCount - windowRuns.length
  if (remainingRunCount <= 0) return []

  const lastRun = windowRuns[windowRuns.length - 1]
  const seed = lastRun ?? today
  const nextPlanned = addCalendarDays(seed, restDaysBetweenRuns)
  const anchor =
    windowRuns.length === 0 || !isBeforeLocalDay(today, nextPlanned) ? today : nextPlanned

  return Array.from({ length: remainingRunCount }, (_, index) =>
    addCalendarDays(anchor, index * restDaysBetweenRuns)
  )
}

const buildRecommendation = (
  isActive: boolean,
  windowRuns: Date[],
  windowStart: Date | null,
  planDays: Date[],
  today: Date
): string => {
  if (isActive && windowStart !== null && windowRuns.length >= targetRunCount) {
    return `Run again on ${buildWeekdayName(addCalendarDays(windowStart, 7))}`
  }

  const nextPlanned = planDays[0]
  if (nextPlanned === undefined) return 'Run today'

  return isSameLocalDay(nextPlanned, today)
    ? 'Run today'
    : `Run again on ${buildWeekdayName(nextPlanned)}`
}

const buildMarkedDates = (profile: TrainingProfile, now: Date): Date[] => {
  const windowRuns = buildWindowRuns(profile, now)
  const planDays = buildPlanDays(windowRuns, startOfLocalDay(now))
  const windowStart =
    profile.window.windowStart === '' ? null : new Date(profile.window.windowStart)
  const nextCycleDays =
    isWindowActive(profile, now) && windowStart !== null && windowRuns.length >= targetRunCount
      ? [addCalendarDays(windowStart, 7)]
      : []

  return [...windowRuns, ...planDays, ...nextCycleDays]
}

const hasMarkedDayInWeek = (weekOffset: number, markedDates: Date[], now: Date): boolean => {
  const weekStart = addCalendarDays(buildWeekStart(now), weekOffset * 7)

  return buildWeekDays(weekStart).some((day) =>
    markedDates.some((markedDate) => isSameLocalDay(markedDate, day))
  )
}

const buildCanNavigateBack = (weekOffset: number, markedDates: Date[], now: Date): boolean => {
  if (weekOffset <= -1) return false

  return weekOffset - 1 === 0 || hasMarkedDayInWeek(weekOffset - 1, markedDates, now)
}

const buildCanNavigateForward = (weekOffset: number, markedDates: Date[], now: Date): boolean => {
  if (weekOffset >= 1) return false

  return weekOffset + 1 === 0 || hasMarkedDayInWeek(weekOffset + 1, markedDates, now)
}

export const buildWeekView = (
  profile: TrainingProfile,
  now: Date,
  weekOffset: number = 0
): WeekView => {
  const today = startOfLocalDay(now)
  const weekDays = buildWeekDays(addCalendarDays(buildWeekStart(now), weekOffset * 7))
  const weekRuns = buildWeekRuns(profile.sessions, weekDays)
  const windowRuns = buildWindowRuns(profile, now)
  const planDays = buildPlanDays(windowRuns, today)
  const markedDates = buildMarkedDates(profile, now)
  const isActive = isWindowActive(profile, now)
  const windowStart =
    profile.window.windowStart === '' ? null : new Date(profile.window.windowStart)

  const days: WeekDayView[] = weekDays.map((date, index) => {
    const isCompleted = weekRuns.some((run) => isSameLocalDay(run, date))
    const isPlanned = markedDates.some((markedDate) => isSameLocalDay(markedDate, date))
    const state: WeekDayState = isCompleted ? 'completed' : isPlanned ? 'planned' : 'idle'

    return {
      key: String(index),
      label: buildDayLetter(date),
      state,
      isToday: isSameLocalDay(date, today),
    }
  })

  return {
    days,
    recommendation: buildRecommendation(isActive, windowRuns, windowStart, planDays, today),
    canGoBack: buildCanNavigateBack(weekOffset, markedDates, now),
    canGoForward: buildCanNavigateForward(weekOffset, markedDates, now),
  }
}
