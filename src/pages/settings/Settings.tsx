import { useCallback, useEffect, useState, type ReactElement } from '@lynx-js/react'

import './Settings.css'
import { sharedProfileStore } from '../../domain/profile.js'
import type { TrainingProfile } from '../../domain/types.js'

export const Settings = (): ReactElement => {
  const [profile, setProfile] = useState<TrainingProfile>(
    () => sharedProfileStore.loadOrCreate().profile
  )
  const [storageStatus, setStorageStatus] = useState('')
  const [debugJson, setDebugJson] = useState('')

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

  const handleShowCurrentJson = useCallback((): void => {
    setDebugJson(JSON.stringify(profile, null, 2))
  }, [profile])

  return (
    <view className='page settings'>
      <view className='hero hero--tight'>
        <text className='eyebrow'>Settings</text>
        <text className='title'>Runner</text>
        <text className='subtitle'>Back up or restore your training profile.</text>
      </view>

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
          <view className='secondary' bindtap={handleShowCurrentJson}>
            <text className='secondary__text'>Show current JSON</text>
          </view>
        </view>
        <text className='copy'>{storageStatus}</text>
        {debugJson ? <text className='result pill--mono'>{debugJson}</text> : null}
      </view>
    </view>
  )
}
