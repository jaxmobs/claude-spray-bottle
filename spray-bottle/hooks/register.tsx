import type { EngineInterface, Register } from 'claude-code'


const POPUP_MS = 2200
const CORRECTION =
  "💦 SPRAYED. Stop what you're doing. In one line, say what you think you did wrong, then switch approach."

// Original spray bottle + mist burst. SMIL animates once when the popup mounts.
const LINES = ['bad bot!', "you're on thin ice pal", 'watch it, Clanker']

const bottleSvg = (line: string) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 130" width="300" height="130">
<g>
<animateTransform attributeName="transform" type="rotate" values="0 60 80;-6 60 80;3 60 80;0 60 80" dur="0.35s" fill="freeze"/>
<rect x="34" y="52" width="48" height="62" rx="10" fill="#2fa6d9"/>
<rect x="40" y="62" width="12" height="40" rx="5" fill="#ffffff" opacity="0.35"/>
<rect x="44" y="40" width="28" height="14" rx="3" fill="#1d6f93"/>
<path d="M40 22 L92 22 L100 30 L100 38 L40 38 Z" fill="#f06a4b"/>
<rect x="100" y="27" width="10" height="7" rx="2" fill="#c94c31"/>
<path d="M78 38 Q86 52 78 64 L72 62 Q78 52 72 40 Z" fill="#c94c31">
<animateTransform attributeName="transform" type="rotate" values="0 74 40;14 74 40;0 74 40" dur="0.3s" fill="freeze"/>
</path>
</g>
<g fill="#7fd3f5">
<circle cx="112" cy="30" r="3"><animate attributeName="cx" values="112;170" dur="0.7s" fill="freeze"/><animate attributeName="cy" values="30;14" dur="0.7s" fill="freeze"/><animate attributeName="r" values="3;9" dur="0.7s" fill="freeze"/><animate attributeName="opacity" values="1;0" dur="1.2s" fill="freeze"/></circle>
<circle cx="112" cy="30" r="3"><animate attributeName="cx" values="112;196" dur="0.8s" fill="freeze"/><animate attributeName="cy" values="30;30" dur="0.8s" fill="freeze"/><animate attributeName="r" values="3;12" dur="0.8s" fill="freeze"/><animate attributeName="opacity" values="1;0" dur="1.3s" fill="freeze"/></circle>
<circle cx="112" cy="30" r="2"><animate attributeName="cx" values="112;180" dur="0.75s" fill="freeze"/><animate attributeName="cy" values="30;50" dur="0.75s" fill="freeze"/><animate attributeName="r" values="2;8" dur="0.75s" fill="freeze"/><animate attributeName="opacity" values="1;0" dur="1.2s" fill="freeze"/></circle>
<circle cx="112" cy="30" r="2"><animate attributeName="cx" values="112;222" dur="0.9s" fill="freeze"/><animate attributeName="cy" values="30;18" dur="0.9s" fill="freeze"/><animate attributeName="r" values="2;7" dur="0.9s" fill="freeze"/><animate attributeName="opacity" values="1;0" dur="1.4s" fill="freeze"/></circle>
<circle cx="112" cy="30" r="2"><animate attributeName="cx" values="112;214" dur="0.85s" fill="freeze"/><animate attributeName="cy" values="30;44" dur="0.85s" fill="freeze"/><animate attributeName="r" values="2;10" dur="0.85s" fill="freeze"/><animate attributeName="opacity" values="1;0" dur="1.3s" fill="freeze"/></circle>
<circle cx="112" cy="30" r="1"><animate attributeName="cx" values="112;240" dur="1s" fill="freeze"/><animate attributeName="cy" values="30;28" dur="1s" fill="freeze"/><animate attributeName="r" values="1;6" dur="1s" fill="freeze"/><animate attributeName="opacity" values="1;0" dur="1.5s" fill="freeze"/></circle>
</g>
<text x="200" y="104" text-anchor="middle" font-family="sans-serif" font-size="19" font-weight="700" fill="#e0483a" opacity="0">${line}<animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.1;0.8;1" dur="2s" fill="freeze"/></text>
</svg>`

const isSprayCommand = (name: string | undefined) =>
  name === 'spray' || (name ?? '').endsWith(':spray')

// The popup + mist. `withSound` is false when the /spray plugin script plays it.
async function showSpray($: EngineInterface, withSound: boolean) {
  const at = await $.clock.now()
  const { value: last = null } = await $.state.get({ plugin: 'spray-bottle', key: 'sprayAt' } as const)
  if (last !== null && at - last < 2500) return false // already spraying
  await $.state.set({ plugin: 'spray-bottle', key: 'sprayAt' } as const, at)
  const { value: n = 0 } = await $.state.get({ plugin: 'spray-bottle', key: 'count' } as const)
  await $.state.set({ plugin: 'spray-bottle', key: 'count' } as const, n + 1)
  if (withSound) void $.audio.play({ asset: 'sounds/psssht.wav' }).catch(() => {})
  $.clock.after(POPUP_MS, async () => {
    const { value: now = null } = await $.state.get({ plugin: 'spray-bottle', key: 'sprayAt' } as const)
    if (now === at) await $.state.set({ plugin: 'spray-bottle', key: 'sprayAt' } as const, null)
  })
  return true
}

export const register: Register = on => {
  let runningTurn: string | undefined
  let handoff = false

  on('turn.start', ($, e, next) => {
    if (e.agentId === undefined) runningTurn = e.turnId
    return next(e)
  })

  on('turn.complete', ($, e, next) => {
    runningTurn = undefined
    return next(e)
  })

  on('session.start', async ($, e, next) => {
    const r = await next(e)
    await $.command.register({ name: 's', description: '💦 Spray Claude (shortcut for /spray)', argumentHint: '[reason]', immediate: true })
    return r
  })

  // /s: popup now, stop the running turn, then hand off to /spray (logs + sound).
  on('command.run', { command: 's' }, async ($, e) => {
    await showSpray($, false)
    if (runningTurn) await $.turn.abort({ turnId: runningTurn }).catch(() => {})
    const args = e.args
    handoff = true
    $.clock.after(50, async () => {
      try {
        await $.command.run({ command: 'spray:spray', args })
      } catch {
        try {
          await $.command.run({ command: 'spray', args })
        } catch {
          handoff = false
          void $.prompt.submit({ text: args ? `${CORRECTION} Reason: ${args}` : CORRECTION })
        }
      }
    })
    return { text: '💦 psssht!' }
  })

  // Typed /spray (from the spray plugin): show the popup alongside it.
  on('prompt.submit', async ($, e, next) => {
    if (isSprayCommand(e.command?.name)) {
      if (handoff) handoff = false
      else await showSpray($, false)
    }
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) return next(e)
    const els = $.ui.resolve(e)
    const { Box, Button, Text } = els
    const { value: at = null } = await $.state.get({ plugin: 'spray-bottle', key: 'sprayAt' } as const)
    const { value: n = 0 } = await $.state.get({ plugin: 'spray-bottle', key: 'count' } as const)

    const press = async () => {
      if (!(await showSpray($, true))) return
      if (runningTurn) await $.turn.abort({ turnId: runningTurn }).catch(() => {})
      handoff = true
      try {
        await $.command.run({ command: 'spray:spray' })
      } catch {
        try {
          await $.command.run({ command: 'spray' })
        } catch {
          handoff = false
          void $.prompt.submit({ text: CORRECTION })
        }
      }
    }

    const line = LINES[Math.max(0, n - 1) % LINES.length]
    const popup =
      at === null ? null : 'Svg' in els ? (
        <els.Svg key={`burst-${at}`} source={bottleSvg(line)} alt={`Spray bottle misting: ${line}`} width={300} height={130} isInteractive />
      ) : (
        <Text color="cyan" bold>  🧴 ∴∵∴ {line} </Text>
      )

    return (
      <Box flexDirection="column">
        {popup}
        <Box>
          <Button key="spray" label="🧴 Spray" hotkey="s" onPress={press} />
          <Text dimColor> {n > 0 ? `sprayed ${n}x this session` : 'spray Claude when it misbehaves'}</Text>
        </Box>
      </Box>
    )
  })
}
