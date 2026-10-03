import { themeColors } from '../../theme.js'

export const buildPlayIconContent = (): string =>
  `<svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" ` +
  `fill="${themeColors.run}"><path d="M8 5v14l11-7z"/></svg>`

export const buildPauseIconContent = (): string =>
  `<svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" ` +
  `fill="${themeColors.run}"><path d="M6 4h4v16H6zM14 4h4v16h-4z"/></svg>`

export const buildStopIconContent = (color: string): string =>
  `<svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" ` +
  `fill="${color}"><path d="M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/></svg>`
