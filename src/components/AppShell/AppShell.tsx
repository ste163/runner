import { useCallback, useEffect, useState, type ReactElement } from '@lynx-js/react'

import './AppShell.css'
import { BottomNav } from '../BottomNav/index.js'
import { Home } from '../../pages/home/Home.js'
import { Data } from '../../pages/data/Data.js'
import { Workout } from '../../pages/workout/Workout.js'
import { isPendingNativeStartState, runnerWorkoutTimer } from '../../native-bridge/workout-timer.js'

type Tab = 'home' | 'workout' | 'data'

const buildTabDisplay = (activeTab: Tab, tab: Tab): 'flex' | 'none' =>
  activeTab === tab ? 'flex' : 'none'

interface TabConfig {
  key: Tab
  title: string
  content: ReactElement
}

const buildActiveTabTitle = (key: Tab, tabs: TabConfig[]): string =>
  tabs.find((tab) => tab.key === key)?.title ?? ''

export const AppShell = (): ReactElement => {
  const [activeTab, setActiveTab] = useState<Tab>('home')
  const [isWorkoutLive, setIsWorkoutLive] = useState(false)
  const [workoutStartRequest, setWorkoutStartRequest] = useState(0)

  const handleHome = useCallback((): void => {
    setActiveTab('home')
  }, [])

  const handleWorkout = useCallback((): void => {
    setActiveTab('workout')
  }, [])

  const handleStartWorkout = useCallback((): void => {
    setActiveTab('workout')
    setWorkoutStartRequest((current) => current + 1)
  }, [])

  const handleData = useCallback((): void => {
    setActiveTab('data')
  }, [])

  const handleWorkoutLiveChange = useCallback((isLive: boolean): void => {
    setIsWorkoutLive(isLive)
  }, [])

  useEffect(() => {
    const timerState = runnerWorkoutTimer.loadState()

    if (timerState === null || isPendingNativeStartState(timerState)) return

    setActiveTab('workout')
  }, [])

  const tabs: TabConfig[] = [
    {
      key: 'home',
      title: 'Home',
      content: <Home onStartWorkout={handleStartWorkout} />,
    },
    {
      key: 'workout',
      title: 'Workout',
      content: (
        <Workout onLiveChange={handleWorkoutLiveChange} startRequestId={workoutStartRequest} />
      ),
    },
    { key: 'data', title: 'Data', content: <Data /> },
  ]

  return (
    <view className='appShell'>
      <view className='appShell__content'>
        <text className='appShell__tabTitle'>{buildActiveTabTitle(activeTab, tabs)}</text>
        {tabs.map((tab) => (
          <view
            key={tab.key}
            className='appShell__tab'
            style={{ display: buildTabDisplay(activeTab, tab.key) }}
            data-testid={`tab-${tab.key}`}
          >
            <scroll-view className='appShell__scroll' scroll-orientation='vertical'>
              <view className='appShell__page'>{tab.content}</view>
            </scroll-view>
          </view>
        ))}
      </view>
      {isWorkoutLive ? null : (
        <BottomNav
          activeTab={activeTab}
          onHome={handleHome}
          onWorkout={handleWorkout}
          onData={handleData}
        />
      )}
    </view>
  )
}
