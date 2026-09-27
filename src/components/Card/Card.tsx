import type { ReactElement, ReactNode } from '@lynx-js/react'

import './Card.css'

export const Card = (props: {
  title?: string
  subtitle?: string
  headerContent?: ReactNode
  className?: string
  children?: ReactNode
}): ReactElement => {
  const classNames = props.className === undefined ? 'card' : `card ${props.className}`

  return (
    <view className={classNames}>
      {props.title === undefined ? null : (
        <view className='card__header'>
          <view className='card__heading'>
            <text className='card__title'>{props.title}</text>
            {props.subtitle === undefined ? null : (
              <text className='card__subtitle'>{props.subtitle}</text>
            )}
          </view>
          {props.headerContent}
        </view>
      )}
      {props.children}
    </view>
  )
}
