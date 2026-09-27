import { useCallback, useEffect, useState, type ReactElement } from '@lynx-js/react'

import './Settings.css'
import { sharedProfileStore } from '../../domain/profile.js'
import type { Session, TrainingProfile } from '../../domain/types.js'

const MONTH_NAMES = [
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

interface VisibleMonth {
  year: number
  month: number
}

const buildMonthFromDate = (date: Date): VisibleMonth => ({
  year: date.getFullYear(),
  month: date.getMonth(),
})

const buildMonthLabel = (month: VisibleMonth): string =>
  `${MONTH_NAMES[month.month] ?? ''} ${month.year}`

const isSameMonth = (a: VisibleMonth, b: VisibleMonth): boolean =>
  a.year === b.year && a.month === b.month

const buildPreviousMonth = (month: VisibleMonth): VisibleMonth =>
  month.month === 0
    ? { year: month.year - 1, month: 11 }
    : { year: month.year, month: month.month - 1 }

const buildNextMonth = (month: VisibleMonth): VisibleMonth =>
  month.month === 11
    ? { year: month.year + 1, month: 0 }
    : { year: month.year, month: month.month + 1 }

const buildEarliestMonth = (sessions: Session[]): VisibleMonth | null =>
  sessions.reduce<VisibleMonth | null>((earliest, session) => {
    const sessionMonth = buildMonthFromDate(new Date(session.completedAt))

    if (earliest === null) {
      return sessionMonth
    }

    return sessionMonth.year < earliest.year ||
      (sessionMonth.year === earliest.year && sessionMonth.month < earliest.month)
      ? sessionMonth
      : earliest
  }, null)

const sortSessionsAscending = (sessions: Session[]): Session[] =>
  [...sessions].sort(
    (a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime()
  )

const filterSessionsForMonth = (sessions: Session[], month: VisibleMonth): Session[] =>
  sortSessionsAscending(
    sessions.filter((session) =>
      isSameMonth(buildMonthFromDate(new Date(session.completedAt)), month)
    )
  )

const buildIntervalSeconds = (session: Session, type: 'run' | 'walk'): number | null => {
  if (session.intervals.length === 0) {
    return null
  }

  return session.intervals.reduce(
    (total, interval) => (interval.type === type ? total + interval.durationSeconds : total),
    0
  )
}

const formatSessionDuration = (seconds: number): string => {
  const roundedSeconds = Math.round(seconds)
  const minutes = Math.floor(roundedSeconds / 60)
  const remainingSeconds = roundedSeconds % 60

  return minutes === 0 ? `${remainingSeconds}s` : `${minutes}m ${remainingSeconds}s`
}

const buildIntervalLabel = (session: Session, type: 'run' | 'walk'): string => {
  const seconds = buildIntervalSeconds(session, type)

  return seconds === null ? '—' : formatSessionDuration(seconds)
}

const formatSessionDate = (completedAt: string): string => {
  const date = new Date(completedAt)
  const monthName = MONTH_NAMES[date.getMonth()] ?? ''

  return `${monthName.slice(0, 3)} ${date.getDate()}`
}

const buildDistanceLabel = (totalDistanceMiles: number): string =>
  totalDistanceMiles === 0 ? '—' : `${totalDistanceMiles.toFixed(2)} mi`

const buildTrashIconContent = (): string =>
  `<svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" ` +
  `fill="none" stroke="#ef4444" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">` +
  `<path d="M3 6h18"/>` +
  `<path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>` +
  `<path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>` +
  `<line x1="10" x2="10" y1="11" y2="17"/>` +
  `<line x1="14" x2="14" y1="11" y2="17"/>` +
  `</svg>`

export const Settings = (): ReactElement => {
  const [profile, setProfile] = useState<TrainingProfile>(
    () => sharedProfileStore.loadOrCreate().profile
  )
  const [storageStatus, setStorageStatus] = useState('')
  const [visibleMonth, setVisibleMonth] = useState<VisibleMonth>(() =>
    buildMonthFromDate(new Date())
  )
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

  useEffect(() => {
    return sharedProfileStore.subscribe((nextProfile) => {
      setProfile(nextProfile)
    })
  }, [])

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

  const handlePreviousMonth = useCallback((): void => {
    setVisibleMonth((currentMonth) => buildPreviousMonth(currentMonth))
  }, [])

  const handleNextMonth = useCallback((): void => {
    setVisibleMonth((currentMonth) => buildNextMonth(currentMonth))
  }, [])

  const handleCancelDelete = useCallback((): void => {
    setPendingDeleteId(null)
  }, [])

  const handleConfirmDelete = useCallback((): void => {
    if (pendingDeleteId === null) {
      return
    }

    const nextProfile: TrainingProfile = {
      ...profile,
      sessions: profile.sessions.filter((session) => session.id !== pendingDeleteId),
    }

    setPendingDeleteId(null)
    sharedProfileStore.save(nextProfile)
  }, [pendingDeleteId, profile])

  const currentMonth = buildMonthFromDate(new Date())
  const visibleSessions = filterSessionsForMonth(profile.sessions, visibleMonth)
  const earliestMonth = buildEarliestMonth(profile.sessions)
  const isNextHidden = isSameMonth(visibleMonth, currentMonth)
  const isPreviousDisabled = earliestMonth === null || isSameMonth(visibleMonth, earliestMonth)

  return (
    <view className='page settings'>
      <view className='card'>
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
        </view>
        <text className='copy'>{storageStatus}</text>
      </view>

      <view className='card sessions'>
        <text className='label'>Runs</text>
        <text className='sessions__month'>{buildMonthLabel(visibleMonth)}</text>
        {visibleSessions.length === 0 ? (
          <text className='sessions__empty'>No runs this month</text>
        ) : (
          <>
            <view className='sessions__header'>
              <text className='sessions__headerText sessions__dateColumn'>Date</text>
              <text className='sessions__headerText sessions__numberColumn'>Run</text>
              <text className='sessions__headerText sessions__numberColumn'>Walk</text>
              <text className='sessions__headerText sessions__numberColumn'>Distance</text>
              <view className='sessions__iconColumn' />
            </view>
            {visibleSessions.map((session) =>
              pendingDeleteId === session.id ? (
                <view key={session.id} className='sessions__confirm'>
                  <text className='sessions__confirmText'>Delete this session?</text>
                  <view className='sessions__confirmYes' bindtap={handleConfirmDelete}>
                    <text className='sessions__confirmYesText'>Yes</text>
                  </view>
                  <view className='sessions__confirmNo' bindtap={handleCancelDelete}>
                    <text className='sessions__confirmNoText'>No</text>
                  </view>
                </view>
              ) : (
                <view key={session.id} className='sessions__row'>
                  <text className='sessions__date sessions__dateColumn'>
                    {formatSessionDate(session.completedAt)}
                  </text>
                  <text className='sessions__number sessions__numberColumn'>
                    {buildIntervalLabel(session, 'run')}
                  </text>
                  <text className='sessions__number sessions__numberColumn'>
                    {buildIntervalLabel(session, 'walk')}
                  </text>
                  <text className='sessions__number sessions__numberColumn'>
                    {buildDistanceLabel(session.totalDistanceMiles)}
                  </text>
                  <view
                    className='sessions__trash sessions__iconColumn'
                    data-testid={`trash-${session.id}`}
                    bindtap={(): void => setPendingDeleteId(session.id)}
                  >
                    <svg
                      content={buildTrashIconContent()}
                      style={{ width: '20px', height: '20px' }}
                    />
                  </view>
                </view>
              )
            )}
          </>
        )}
        {isPreviousDisabled && isNextHidden ? null : (
          <view className='sessions__nav'>
            {isPreviousDisabled ? null : (
              <view className='sessions__navButton' bindtap={handlePreviousMonth}>
                <text className='sessions__navButtonText'>Previous</text>
              </view>
            )}
            {isNextHidden ? null : (
              <view className='sessions__navButton' bindtap={handleNextMonth}>
                <text className='sessions__navButtonText'>Next</text>
              </view>
            )}
          </view>
        )}
      </view>
    </view>
  )
}
