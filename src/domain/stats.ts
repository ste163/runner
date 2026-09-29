import type { IntervalRecord, Session } from './types.js'

type PaceKind = 'run' | 'walk'
type PaceInterval = Pick<IntervalRecord, 'type' | 'durationSeconds' | 'distanceMiles'>

const sumDurationSeconds = (intervals: PaceInterval[]): number =>
  intervals.reduce((total, interval) => total + interval.durationSeconds, 0)

const sumDistanceMiles = (intervals: PaceInterval[]): number =>
  intervals.reduce((total, interval) => total + interval.distanceMiles, 0)

const isPaceKind = (interval: PaceInterval, kind: PaceKind): boolean =>
  kind === 'run' ? interval.type === 'run' : interval.type !== 'run'

export const buildIntervalRecords = (intervals: PaceInterval[]): IntervalRecord[] =>
  intervals.map((interval) => ({
    type: interval.type,
    durationSeconds: interval.durationSeconds,
    distanceMiles: interval.distanceMiles,
    avgPaceMinPerMile:
      interval.distanceMiles > 0 ? interval.durationSeconds / 60 / interval.distanceMiles : 0,
  }))

export const buildPace = (intervals: PaceInterval[], kind: PaceKind): number | null => {
  const kindIntervals = intervals.filter((interval) => isPaceKind(interval, kind))
  const distanceMiles = sumDistanceMiles(kindIntervals)

  if (distanceMiles <= 0) return null

  return sumDurationSeconds(kindIntervals) / 60 / distanceMiles
}

export const buildSessionPace = (session: Session, kind: PaceKind): number | null =>
  buildPace(session.intervals, kind)

export const buildLiveIntervals = (
  completedIntervals: PaceInterval[],
  phaseType: IntervalRecord['type'],
  phaseElapsedSeconds: number,
  totalDistanceMiles: number
): PaceInterval[] => {
  const completedDistanceMiles = sumDistanceMiles(completedIntervals)
  const phaseDistanceMiles = Math.max(totalDistanceMiles - completedDistanceMiles, 0)

  return [
    ...completedIntervals,
    { type: phaseType, durationSeconds: phaseElapsedSeconds, distanceMiles: phaseDistanceMiles },
  ]
}
