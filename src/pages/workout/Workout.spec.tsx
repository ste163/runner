import '@testing-library/jest-dom'
import { getQueriesForElement, render } from '@lynx-js/react/testing-library'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { Workout } from './Workout.js'
import { sharedProfileStore } from '../../domain/profile.js'
import type { TrainingProfile } from '../../domain/types.js'
import { runnerProfileStorage } from '../../native-bridge/storage.js'

const buildProfile = (runSeconds: number, walkSeconds: number): TrainingProfile => ({
  schemaVersion: 1,
  level: { runSeconds, walkSeconds, intervalBlockSeconds: 1200 },
  window: { windowStart: '', consecutiveMissed: 0 },
  sessions: [],
})

describe('Workout', () => {
  beforeEach(() => {
    sharedProfileStore.reset()
    runnerProfileStorage.configure(null)
  })

  afterEach(() => {
    runnerProfileStorage.configure(null)
    vi.unstubAllGlobals()
  })

  it('renders the timeline from the stored profile on mount', async () => {
    sharedProfileStore.save(buildProfile(33, 90))

    render(<Workout onLiveChange={vi.fn()} startRequestId={0} />)

    const { findAllByText } = getQueriesForElement(elementTree.root!)

    expect((await findAllByText('Run 33s')).length).toBeGreaterThan(0)
    expect((await findAllByText('walk 1m 30s')).length).toBeGreaterThan(0)
  })

  it('updates the timeline when the profile changes on another page', async () => {
    render(<Workout onLiveChange={vi.fn()} startRequestId={0} />)

    const { findAllByText, queryByText } = getQueriesForElement(elementTree.root!)

    expect((await findAllByText('Run 30s')).length).toBeGreaterThan(0)

    sharedProfileStore.save(buildProfile(33, 90))

    expect((await findAllByText('Run 33s')).length).toBeGreaterThan(0)
    expect(queryByText('Run 30s')).toBeNull()
  })
})
