import { themeColors } from '../../theme.js'

export const buildPlayIconContent = (): string =>
  `<svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" ` +
  `fill="${themeColors.onPrimary}"><path d="M8 5v14l11-7z"/></svg>`

export const buildPauseIconContent = (): string =>
  `<svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" ` +
  `fill="${themeColors.onPrimary}"><path d="M6 4h4v16H6zM14 4h4v16h-4z"/></svg>`
