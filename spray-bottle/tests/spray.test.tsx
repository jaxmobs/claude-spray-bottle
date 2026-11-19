import { expect, test } from 'claude-code/testing'

const BAND = {
  plugin: 'spray-bottle',
  surface: 'desktop',
  component: 'AbovePrompt',
  props: { hasSurvey: false, isCollapsed: false, isWorking: true, maxRows: 12, bodyColumns: 100 },
} as const

test('mashing builds a combo with rising sounds and never interrupts Claude', async ($, on) => {
  let now = 1_000_000
  const played: string[] = []
  const interrupted: string[] = []
  on('clock.now', () => ({ value: (now += 400) }))
  on('clock.after', () => ({ deny: 'popup stays up for the assertions' }))
  on('audio.play', (_, e) => {
    played.push('asset' in e.clip ? String(e.clip.asset) : '?')
    return { value: undefined }
  })
  on('turn.abort', () => { interrupted.push('abort'); return { value: undefined } })
  on('command.run', (_, e) => { interrupted.push(`/${e.command}`); return { text: '' } })

  const ui = await $.ui.mount(BAND as never)
  for (let i = 0; i < 6; i++) await ui.press({ key: 'spray' })

  const svg = await ui.find({ type: 'Svg' })
  expect(svg).toBeDefined()
  const source = String((svg as unknown as { props: { source: string } }).props.source)
  expect(source).toContain('x6 COMBO')
  expect(source).toContain('BAD. BOT.')
  expect(played).toEqual([
    'sounds/psssht-0.wav', 'sounds/psssht-1.wav', 'sounds/psssht-2.wav',
    'sounds/psssht-3.wav', 'sounds/psssht-4.wav', 'sounds/psssht-4.wav',
  ])
  expect(interrupted).toEqual([])
  await ui.unmount()
})
