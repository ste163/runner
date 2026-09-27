import type { ReactElement } from '@lynx-js/react'

import './Button.css'

type ButtonVariant = 'primary' | 'danger' | 'neutral'

export const Button = (props: {
  label: string
  onTap: () => void
  variant?: ButtonVariant
  icon?: string
  className?: string
}): ReactElement => {
  const variantClassName = `button--${props.variant ?? 'primary'}`
  const classNames =
    props.className === undefined
      ? `button ${variantClassName}`
      : `button ${variantClassName} ${props.className}`

  return (
    <view className={classNames} bindtap={props.onTap}>
      {props.icon === undefined ? null : (
        <svg content={props.icon} style={{ width: '20px', height: '20px' }} />
      )}
      <text className='button__label'>{props.label}</text>
    </view>
  )
}
