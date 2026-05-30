import { useCallback, useEffect } from '@lynx-js/react'
import * as router from 'sparkling-navigation'

import './App.css'

export function App(props: { onMounted?: () => void }): JSX.Element {
  useEffect(() => {
    props.onMounted?.()
  }, [props.onMounted])

  const handleDone = useCallback((): void => {
    router.close()
  }, [])

  return (
    <scroll-view className='page-scroll' scroll-orientation='vertical'>
      <view className='app'>
        <view className='hero'>
          <text className='eyebrow'>How It Works</text>
          <text className='title'>Runner</text>
          <text className='subtitle'>
            Three sessions a week. Progress by consistency, not speed.
          </text>
        </view>
        <view className='card'>
          <text className='label'>Program basics</text>
          <view className='stack'>
            <text className='copy'>
              Warm up for 5 minutes, then alternate run and walk intervals for 20 minutes.
            </text>
            <text className='copy'>Start at 30 seconds running and 2 minutes walking.</text>
            <text className='copy'>
              Three sessions inside 7 days move you forward by 10%. Miss twice and the app eases
              back.
            </text>
          </view>
          <view className='primary' bindtap={handleDone}>
            <text className='primary__text'>Got it</text>
          </view>
        </view>
      </view>
    </scroll-view>
  )
}
