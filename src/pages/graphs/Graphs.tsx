import { useCallback } from '@lynx-js/react'
import { close } from 'sparkling-navigation'

import './Graphs.css'

type GraphSampleSize = 'small' | 'medium' | 'large'

type GraphSample = {
  size: GraphSampleSize
  glyphs: string
}

type ProgressWeek = {
  weekLabel: string
  runSeconds: number
  walkSeconds: number
  runLabel: string
  walkLabel: string
}

type GraphSection = {
  title: string
  description: string
  glyphClass: string
  samples: GraphSample[]
}

const weekProgress: ProgressWeek[] = [
  {
    weekLabel: 'Week 1',
    runSeconds: 30,
    walkSeconds: 120,
    runLabel: '30s run',
    walkLabel: '2m walk',
  },
  {
    weekLabel: 'Week 2',
    runSeconds: 33,
    walkSeconds: 108,
    runLabel: '33s run',
    walkLabel: '1m 48s walk',
  },
  {
    weekLabel: 'Week 3',
    runSeconds: 36.3,
    walkSeconds: 97.2,
    runLabel: '36.3s run',
    walkLabel: '1m 37s walk',
  },
  {
    weekLabel: 'Week 4',
    runSeconds: 39.9,
    walkSeconds: 87.5,
    runLabel: '39.9s run',
    walkLabel: '1m 27s walk',
  },
]

const graphSections: GraphSection[] = [
  {
    title: 'Braille density',
    description: 'Compact texture with strong detail in a tiny space.',
    glyphClass: 'textGraphs__glyphs--braille',
    samples: [
      { size: 'small', glyphs: '⠁⠃⠇⡇⣿' },
      { size: 'medium', glyphs: '⠋⠛⠟⠿⣿' },
      { size: 'large', glyphs: '⣀⣄⣆⣒⣶⣿' },
    ],
  },
  {
    title: 'Block density',
    description: 'Hard edges and a stronger bar-chart feel.',
    glyphClass: 'textGraphs__glyphs--blocks',
    samples: [
      { size: 'small', glyphs: '█▉▊▋▌▍▎▏' },
      { size: 'medium', glyphs: '███▉▊▋▌▍▎' },
      { size: 'large', glyphs: '████▉▊▋▌' },
    ],
  },
  {
    title: 'Dot density',
    description: 'Airier marks that can still read as a graph.',
    glyphClass: 'textGraphs__glyphs--dots',
    samples: [
      { size: 'small', glyphs: '• · • · • ·' },
      { size: 'medium', glyphs: '• • · • • ·' },
      { size: 'large', glyphs: '••• ··· •••' },
    ],
  },
  {
    title: 'Square rhythm',
    description: 'Clear on/off blocks with a simple visual cadence.',
    glyphClass: 'textGraphs__glyphs--squares',
    samples: [
      { size: 'small', glyphs: '■ □ ■ □ ■ □' },
      { size: 'medium', glyphs: '■ ■ □ □ ■ ■' },
      { size: 'large', glyphs: '■■■ □□□ ■■■' },
    ],
  },
]

const maxProgressSeconds = Math.max(
  ...weekProgress.map((week) => Math.max(week.runSeconds, week.walkSeconds))
)

const sizeLabels: Record<GraphSampleSize, string> = {
  small: 'Small',
  medium: 'Medium',
  large: 'Large',
}

const getBarHeightPercent = (amountSeconds: number): number =>
  Math.max(14, Math.round((amountSeconds / Math.max(maxProgressSeconds, 1)) * 100))

const getBarStyle = (amountSeconds: number) => ({
  height: `${getBarHeightPercent(amountSeconds)}%`,
})

export const Graphs = (): JSX.Element => {
  const handleBack = useCallback((): void => {
    close()
  }, [])

  return (
    <scroll-view className='page-scroll' scroll-orientation='vertical'>
      <view className='app textGraphs'>
        <view className='hero'>
          <text className='eyebrow'>Text graph gallery</text>
          <text className='title'>Glyph experiments</text>
          <text className='subtitle'>
            Braille, blocks, dots, squares, and a month-view example with a single chart.
          </text>
        </view>

        <view className='card textGraphs__monthCard'>
          <text className='label'>Month view</text>
          <text className='copy'>
            One chart shows change over time, with vertical run and walk bars by week.
          </text>
          <view className='textGraphs__monthChart'>
            <view className='textGraphs__monthAxisRow'>
              <view className='textGraphs__monthYAxis'>
                <text className='textGraphs__monthAxisLabel textGraphs__monthAxisLabel--top'>
                  2m
                </text>
                <view className='textGraphs__monthAxisLine' />
                <text className='textGraphs__monthAxisLabel textGraphs__monthAxisLabel--bottom'>
                  0
                </text>
              </view>
              <view className='textGraphs__progressColumns'>
                {weekProgress.map((week) => {
                  return (
                    <view className='textGraphs__progressColumn' key={week.weekLabel}>
                      <view className='textGraphs__progressWeekBars'>
                        <view className='textGraphs__progressBarTrack'>
                          <view
                            className='textGraphs__progressBarFill textGraphs__progressBarFill--run'
                            style={getBarStyle(week.runSeconds)}
                          />
                        </view>
                        <view className='textGraphs__progressBarTrack'>
                          <view
                            className='textGraphs__progressBarFill textGraphs__progressBarFill--walk'
                            style={getBarStyle(week.walkSeconds)}
                          />
                        </view>
                      </view>
                      <view className='textGraphs__progressFooter'>
                        <view className='textGraphs__progressAmountRow'>
                          <text className='textGraphs__monthAmount textGraphs__monthAmount--run'>
                            {week.runLabel}
                          </text>
                          <text className='textGraphs__monthAmount textGraphs__monthAmount--walk'>
                            {week.walkLabel}
                          </text>
                        </view>
                        <text className='textGraphs__progressWeekLabel'>{week.weekLabel}</text>
                      </view>
                    </view>
                  )
                })}
              </view>
            </view>
          </view>
        </view>

        {graphSections.map((section) => (
          <view className='card' key={section.title}>
            <text className='label'>{section.title}</text>
            <text className='copy'>{section.description}</text>
            <view className='textGraphs__samples'>
              {section.samples.map((sample) => (
                <view className='textGraphs__sampleRow' key={`${section.title}-${sample.size}`}>
                  <text className='textGraphs__sampleLabel'>{sizeLabels[sample.size]}</text>
                  <text
                    className={`textGraphs__glyphs textGraphs__glyphs--${sample.size} ${section.glyphClass}`}
                  >
                    {sample.glyphs}
                  </text>
                </view>
              ))}
            </view>
          </view>
        ))}

        <view className='primary' bindtap={handleBack}>
          <text className='primary__text'>Back Home</text>
        </view>
      </view>
    </scroll-view>
  )
}
