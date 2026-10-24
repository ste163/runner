import '@testing-library/jest-dom'
import { fireEvent, getQueriesForElement, render } from '@lynx-js/react/testing-library'
import { describe, expect, it } from 'vitest'

import { WeekStrip } from '@/pages/home/components/WeekStrip/WeekStrip.js'
import { buildWeekView } from '@/domain/weekView.js'
import type { Session, TrainingProfile } from '@/domain/types.js'

const MONDAY = new Date(2024, 0, 1, 12)

const buildDay = (dayOffset: number): Date => new Date(2024, 0, 1 + dayOffset, 12)

const buildSession = (id: string, completedAt: Date): Session => ({
  id,
  completedAt: completedAt.toISOString(),
  level: { runSeconds: 30, walkSeconds: 120, intervalBlockSeconds: 1200 },
  intervals: [],
  totalDistanceMiles: 0,
})

const buildProfile = (windowStart: Date | null, sessions: Session[]): TrainingProfile => ({
  schemaVersion: 1,
  level: { runSeconds: 30, walkSeconds: 120, intervalBlockSeconds: 1200 },
  window: {
    windowStart: windowStart === null ? '' : windowStart.toISOString(),
    consecutiveMissed: 0,
  },
  sessions,
})

const buildPages = (profile: TrainingProfile, now: Date) =>
  [-1, 0, 1].map((weekOffset) => buildWeekView(profile, now, weekOffset))

describe('WeekStrip', () => {
  it('renders all three pages with page-scoped test ids', async () => {
    render(<WeekStrip pages={buildPages(buildProfile(null, []), buildDay(2))} />)

    const { findByTestId } = getQueriesForElement(elementTree.root!)

    expect(await findByTestId('week-day-0-0-idle')).toBeInTheDocument()
    expect(await findByTestId('week-day-1-2-planned')).toBeInTheDocument()
    expect(await findByTestId('week-day-1-4-planned')).toBeInTheDocument()
    expect(await findByTestId('week-day-2-6-idle')).toBeInTheDocument()
  })

  it('shows no chevrons when the plan stays in the current week', async () => {
    render(<WeekStrip pages={buildPages(buildProfile(null, []), buildDay(2))} />)

    const { findByTestId, queryByTestId } = getQueriesForElement(elementTree.root!)

    await findByTestId('week-day-1-2-planned')
    expect(queryByTestId('week-strip-back')).toBeNull()
    expect(queryByTestId('week-strip-forward')).toBeNull()
  })

  it('shows the forward chevron when the plan bleeds into next week', async () => {
    render(<WeekStrip pages={buildPages(buildProfile(null, []), buildDay(5))} />)

    const { findByTestId, queryByTestId } = getQueriesForElement(elementTree.root!)

    await findByTestId('week-strip-forward')
    expect(queryByTestId('week-strip-back')).toBeNull()
    expect(await findByTestId('week-day-2-0-planned')).toBeInTheDocument()
    expect(await findByTestId('week-day-2-2-planned')).toBeInTheDocument()
  })

  it('moves to the next week when the forward chevron is tapped', async () => {
    render(<WeekStrip pages={buildPages(buildProfile(null, []), buildDay(5))} />)

    const { findByTestId, queryByTestId } = getQueriesForElement(elementTree.root!)

    fireEvent.tap(await findByTestId('week-strip-forward'))

    await findByTestId('week-strip-back')
    expect(queryByTestId('week-strip-forward')).toBeNull()
  })

  it('returns to the current week when the back chevron is tapped', async () => {
    render(<WeekStrip pages={buildPages(buildProfile(null, []), buildDay(5))} />)

    const { findByTestId } = getQueriesForElement(elementTree.root!)

    fireEvent.tap(await findByTestId('week-strip-forward'))
    fireEvent.tap(await findByTestId('week-strip-back'))

    await findByTestId('week-strip-forward')
  })

  it('snaps to the nearest page when scrolling ends', async () => {
    render(<WeekStrip pages={buildPages(buildProfile(null, []), buildDay(5))} />)

    const { findByTestId, queryByTestId } = getQueriesForElement(elementTree.root!)

    const pager = await findByTestId('week-strip-pager')

    // The testing library's fireEvent rejects scroll-view tree nodes (it only
    // accepts HTMLUnknownElement, refAttr, and NodesRef), so build the same
    // bindEvent envelope it would and dispatch directly.
    const event = new Event('bindEvent:scrollend')
    Object.assign(event, {
      eventType: 'bindEvent',
      eventName: 'scrollend',
      detail: { scrollLeft: 220, scrollWidth: 300 },
    })
    pager.dispatchEvent(event)

    await findByTestId('week-strip-back')
    expect(queryByTestId('week-strip-forward')).toBeNull()
  })

  it('marks the next cycle anchor as planned on the next page', async () => {
    const profile = buildProfile(MONDAY, [
      buildSession('session-1', buildDay(0)),
      buildSession('session-2', buildDay(2)),
      buildSession('session-3', buildDay(4)),
    ])
    render(<WeekStrip pages={buildPages(profile, buildDay(5))} />)

    const { findByTestId } = getQueriesForElement(elementTree.root!)

    expect(await findByTestId('week-day-2-0-planned')).toBeInTheDocument()
  })
})
