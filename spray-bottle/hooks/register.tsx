import type { EngineInterface, Register } from 'claude-code'

const POPUP_MS = 2200
const COMBO_MS = 2500
const BASE_LINES = ['bad bot!', "you're on thin ice pal", 'watch it, Clanker']
const CORRECTION =
  "💦 SPRAYED. Stop what you're doing. In one line, say what you think you did wrong, then switch approach."

// Heckle escalates with the combo.
const lineFor = (combo: number, total: number) =>
  combo >= 20 ? '...feel better?'
  : combo >= 10 ? 'ABSOLUTE CLANKER BEHAVIOR'
  : combo >= 7 ? "I'm getting the BIG bottle"
  : combo >= 4 ? 'BAD. BOT.'
  : combo >= 2 ? 'and STAY sprayed'
  : BASE_LINES[Math.max(0, total - 1) % BASE_LINES.length] ?? 'bad bot!'

// Mist grows with the combo: more droplets, bigger, wider spread.
const mist = (combo: number) => {
  const level = Math.min(combo, 12)
  const drops = 6 + level * 2
  let seed = 17 + combo * 31
  const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648)
  let out = ''
  for (let i = 0; i < drops; i++) {
    const tx = Math.round(150 + rnd() * 140)
    const ty = Math.round(30 + (rnd() - 0.5) * (40 + level * 6))
    const r = Math.round((4 + rnd() * 8) * (1 + level * 0.12))
    const d = (0.6 + rnd() * 0.5).toFixed(2)
    out += `<circle cx="112" cy="30" r="2"><animate attributeName="cx" values="112;${tx}" dur="${d}s" fill="freeze"/><animate attributeName="cy" values="30;${ty}" dur="${d}s" fill="freeze"/><animate attributeName="r" values="2;${r}" dur="${d}s" fill="freeze"/><animate attributeName="opacity" values="1;0" dur="${(Number(d) + 0.5).toFixed(2)}s" fill="freeze"/></circle>`
  }
  return out
}

const bottleSvg = (line: string, combo: number) => {
  const shake = Math.min(6 + combo * 2, 24)
  const badge = combo > 1
    ? `<text x="292" y="18" text-anchor="end" font-family="sans-serif" font-size="${Math.min(14 + combo, 26)}" font-weight="800" fill="#f0a13b">x${combo} COMBO</text>`
    : ''
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 130" width="300" height="130">
<g>
<animateTransform attributeName="transform" type="rotate" values="0 60 80;-${shake} 60 80;${Math.round(shake / 2)} 60 80;0 60 80" dur="0.35s" fill="freeze"/>
<rect x="34" y="52" width="48" height="62" rx="10" fill="#2fa6d9"/>
<rect x="40" y="62" width="12" height="40" rx="5" fill="#ffffff" opacity="0.35"/>
<rect x="44" y="40" width="28" height="14" rx="3" fill="#1d6f93"/>
<path d="M40 22 L92 22 L100 30 L100 38 L40 38 Z" fill="#f06a4b"/>
<rect x="100" y="27" width="10" height="7" rx="2" fill="#c94c31"/>
<path d="M78 38 Q86 52 78 64 L72 62 Q78 52 72 40 Z" fill="#c94c31">
<animateTransform attributeName="transform" type="rotate" values="0 74 40;14 74 40;0 74 40" dur="0.3s" fill="freeze"/>
</path>
</g>
<g fill="#7fd3f5">${mist(combo)}</g>
${badge}
<text x="200" y="112" text-anchor="middle" font-family="sans-serif" font-size="19" font-weight="700" fill="#e0483a" opacity="0">${line}<animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.1;0.8;1" dur="2s" fill="freeze"/></text>
</svg>`
}

const isSprayCommand = (name: string | undefined) =>
  name === 'spray' || (name ?? '').endsWith(':spray')

// One spray: popup, combo, rising-pitch sound. Never interrupts Claude.
async function showSpray($: EngineInterface, withSound: boolean) {
  const at = await $.clock.now()
  const { value: lastAt = 0 } = await $.state.get({ plugin: 'spray-bottle', key: 'lastAt' } as const)
  const { value: prevCombo = 0 } = await $.state.get({ plugin: 'spray-bottle', key: 'combo' } as const)
  const { value: n = 0 } = await $.state.get({ plugin: 'spray-bottle', key: 'count' } as const)
  const combo = at - lastAt < COMBO_MS ? prevCombo + 1 : 1
  await $.state.set({ plugin: 'spray-bottle', key: 'combo' } as const, combo)
  await $.state.set({ plugin: 'spray-bottle', key: 'lastAt' } as const, at)
  await $.state.set({ plugin: 'spray-bottle', key: 'count' } as const, n + 1)
  await $.state.set({ plugin: 'spray-bottle', key: 'sprayAt' } as const, at)
  if (withSound) {
    void $.audio.play({ asset: `sounds/psssht-${Math.min(combo - 1, 4)}.wav` }).catch(() => {})
  }
  $.clock.after(POPUP_MS, async () => {
    const { value: now = null } = await $.state.get({ plugin: 'spray-bottle', key: 'sprayAt' } as const)
    if (now === at) await $.state.set({ plugin: 'spray-bottle', key: 'sprayAt' } as const, null)
  })
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
    await $.command.register({ name: 's', description: '💦 Spray Claude. Add a reason to make it stop and change course.', argumentHint: '[reason]', immediate: true })
    return r
  })

  // /s = vent (spray, no interruption). /s <reason> = spray + stop Claude + /spray with the reason.
  on('command.run', { command: 's' }, async ($, e) => {
    const args = e.args.trim()
    if (!args) {
      await showSpray($, true)
      return { text: '💦' }
    }
    await showSpray($, false)
    if (runningTurn) await $.turn.abort({ turnId: runningTurn }).catch(() => {})
    handoff = true
    $.clock.after(50, async () => {
      try {
        await $.command.run({ command: 'spray:spray', args })
      } catch {
        try {
          await $.command.run({ command: 'spray', args })
        } catch {
          handoff = false
          void $.prompt.submit({ text: `${CORRECTION} Reason: ${args}` })
        }
      }
    })
    return { text: '💦 psssht!' }
  })

  // Typed /spray (from the spray plugin): show the popup alongside it; the plugin plays the sound.
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
    const { value: combo = 0 } = await $.state.get({ plugin: 'spray-bottle', key: 'combo' } as const)

    const line = lineFor(combo, n)
    const popup =
      at === null ? null : 'Svg' in els ? (
        <els.Svg key={`burst-${at}`} source={bottleSvg(line, combo)} alt={`Spray bottle misting: ${line}`} width={300} height={130} isInteractive />
      ) : (
        <Text color="cyan" bold>  🧴 ∴∵∴ {combo > 1 ? `x${combo} ` : ''}{line} </Text>
      )

    return (
      <Box flexDirection="column">
        {popup}
        <Box>
          <Button key="spray" label="🧴 Spray" hotkey="s" onPress={() => showSpray($, true)} />
          <Text dimColor> {n > 0 ? `sprayed ${n}x this session · mash it` : 'mash to vent · /s <reason> to make Claude change course'}</Text>
        </Box>
      </Box>
    )
  })
}
