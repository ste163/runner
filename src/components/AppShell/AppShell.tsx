import { useCallback, useState, type ReactElement } from '@lynx-js/react'

import './AppShell.css'
import { BottomNav } from '../BottomNav/index.js'
import { Home } from '../../pages/home/Home.js'
import { Settings } from '../../pages/settings/Settings.js'
import { Workout } from '../../pages/workout/Workout.js'

type Tab = 'home' | 'workout' | 'settings'

const buildTabDisplay = (activeTab: Tab, tab: Tab): 'flex' | 'none' =>
  activeTab === tab ? 'flex' : 'none'

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

  const handleSettings = useCallback((): void => {
    setActiveTab('settings')
  }, [])

  const handleWorkoutLiveChange = useCallback((isLive: boolean): void => {
    setIsWorkoutLive(isLive)
  }, [])

  return (
    <view className='appShell'>
      <view className='appShell__content'>
        <view className='appShell__tab' style={{ display: buildTabDisplay(activeTab, 'home') }}>
          <scroll-view className='appShell__scroll' scroll-orientation='vertical'>
            <view className='appShell__page'>
              <Home onStartWorkout={handleStartWorkout} />
            </view>
          </scroll-view>
        </view>
        <view className='appShell__tab' style={{ display: buildTabDisplay(activeTab, 'workout') }}>
          <scroll-view className='appShell__scroll' scroll-orientation='vertical'>
            <view className='appShell__page'>
              <Workout
                onLiveChange={handleWorkoutLiveChange}
                startRequestId={workoutStartRequest}
              />
            </view>
          </scroll-view>
        </view>
        <view className='appShell__tab' style={{ display: buildTabDisplay(activeTab, 'settings') }}>
          <scroll-view className='appShell__scroll' scroll-orientation='vertical'>
            <view className='appShell__page'>
              <Settings />
            </view>
          </scroll-view>
        </view>
      </view>
      {isWorkoutLive ? null : (
        <BottomNav
          activeTab={activeTab}
          onHome={handleHome}
          onWorkout={handleWorkout}
          onSettings={handleSettings}
        />
      )}
    </view>
  )
}
