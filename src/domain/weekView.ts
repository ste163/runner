import type { Session, TrainingProfile } from './types.js'

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
}

const dayLetters = ['S', 'M', 'T', 'W', 'R', 'F', 'S']
const weekdayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const targetRunCount = 3
const restDaysBetweenRuns = 2
const weekDurationMilliseconds = 7 * 24 * 60 * 60 * 1000

const startOfLocalDay = (date: Date): Date =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate())

const addCalendarDays = (date: Date, days: number): Date =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate() + days)

const isSameLocalDay = (a: Date, b: Date): boolean =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate()

const isBeforeLocalDay = (a: Date, b: Date): boolean =>
  a.getFullYear() < b.getFullYear() ||
  (a.getFullYear() === b.getFullYear() &&
    (a.getMonth() < b.getMonth() || (a.getMonth() === b.getMonth() && a.getDate() < b.getDate())))

const buildDayLetter = (date: Date): string => dayLetters[date.getDay()] ?? ''
const buildWeekdayName = (date: Date): string => weekdayNames[date.getDay()] ?? ''

export const countWindowSessions = (profile: TrainingProfile): number => {
  if (profile.window.windowStart === '') {
    return profile.sessions.length
  }

  const windowStartMilliseconds = new Date(profile.window.windowStart).getTime()
  const windowEndMilliseconds = windowStartMilliseconds + weekDurationMilliseconds

  return profile.sessions.reduce((count, session) => {
    const completedAtMilliseconds = new Date(session.completedAt).getTime()

    return completedAtMilliseconds >= windowStartMilliseconds &&
      completedAtMilliseconds < windowEndMilliseconds
      ? count + 1
      : count
  }, 0)
}

const isWindowActive = (profile: TrainingProfile, now: Date): boolean => {
  if (profile.window.windowStart === '') return false

  const windowEndMilliseconds =
    new Date(profile.window.windowStart).getTime() + weekDurationMilliseconds

  return now.getTime() < windowEndMilliseconds
}

const buildWindowRuns = (profile: TrainingProfile, now: Date): Date[] => {
  if (!isWindowActive(profile, now)) return []

  const windowStartMilliseconds = new Date(profile.window.windowStart).getTime()
  const windowEndMilliseconds = windowStartMilliseconds + weekDurationMilliseconds

  return profile.sessions
    .map((session) => new Date(session.completedAt))
    .filter((completedAt) => {
      const completedAtMilliseconds = completedAt.getTime()

      return (
        completedAtMilliseconds >= windowStartMilliseconds &&
        completedAtMilliseconds < windowEndMilliseconds
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

export const buildWeekView = (profile: TrainingProfile, now: Date): WeekView => {
  const today = startOfLocalDay(now)
  const weekDays = buildWeekDays(buildWeekStart(now))
  const weekRuns = buildWeekRuns(profile.sessions, weekDays)
  const windowRuns = buildWindowRuns(profile, now)
  const planDays = buildPlanDays(windowRuns, today)
  const isActive = isWindowActive(profile, now)
  const windowStart =
    profile.window.windowStart === '' ? null : new Date(profile.window.windowStart)

  const days: WeekDayView[] = weekDays.map((date, index) => {
    const isCompleted = weekRuns.some((run) => isSameLocalDay(run, date))
    const isPlanned = planDays.some((planDay) => isSameLocalDay(planDay, date))
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
  }
}
