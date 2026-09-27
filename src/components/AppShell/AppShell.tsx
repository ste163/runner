import { useCallback, useState, type ReactElement } from '@lynx-js/react'

import './AppShell.css'
import { BottomNav } from '../BottomNav/index.js'
import { Home } from '../../pages/home/Home.js'
import { Onboarding } from '../../pages/onboarding/Onboarding.js'
import { Settings } from '../../pages/settings/Settings.js'
import { Workout } from '../../pages/workout/Workout.js'

type Tab = 'home' | 'workout' | 'settings'

const buildTabDisplay = (activeTab: Tab, tab: Tab): 'flex' | 'none' =>
  activeTab === tab ? 'flex' : 'none'

export const AppShell = (): ReactElement => {
  const [activeTab, setActiveTab] = useState<Tab>('home')
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [isWorkoutLive, setIsWorkoutLive] = useState(false)

  const handleHome = useCallback((): void => {
    setActiveTab('home')
  }, [])

  const handleWorkout = useCallback((): void => {
    setActiveTab('workout')
  }, [])

  const handleSettings = useCallback((): void => {
    setActiveTab('settings')
  }, [])

  const handleOpenOnboarding = useCallback((): void => {
    setShowOnboarding(true)
  }, [])

  const handleCloseOnboarding = useCallback((): void => {
    setShowOnboarding(false)
  }, [])

  const handleWorkoutLiveChange = useCallback((isLive: boolean): void => {
    setIsWorkoutLive(isLive)
  }, [])

  return (
    <view className='appShell'>
      <view className='appShell__content'>
        <view className='appShell__tab' style={{ display: buildTabDisplay(activeTab, 'home') }}>
          <Home onOpenOnboarding={handleOpenOnboarding} onStartWorkout={handleWorkout} />
        </view>
        <view className='appShell__tab' style={{ display: buildTabDisplay(activeTab, 'workout') }}>
          <Workout onLiveChange={handleWorkoutLiveChange} />
        </view>
        <view className='appShell__tab' style={{ display: buildTabDisplay(activeTab, 'settings') }}>
          <Settings />
        </view>
        {showOnboarding ? (
          <view className='appShell__overlay'>
            <Onboarding onClose={handleCloseOnboarding} />
          </view>
        ) : null}
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
