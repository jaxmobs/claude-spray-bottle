---
description: Spray Claude (like a cat) for something you didn't like
argument-hint: [reason]
allowed-tools: Bash(python3:*)
---
!`python3 "${CLAUDE_PLUGIN_ROOT}/scripts/spray.py" log "$ARGUMENTS"`

💦 You just got SPRAYED with a spray bottle. User's reason: "$ARGUMENTS" (blank = figure it out from your recent actions above).

1. Stop what you were doing right now. Do not continue the previous approach.
2. Reply with exactly one line starting with "💦 Sprayed:" naming what you did wrong. No apology paragraph.
3. If the reason was blank, record your inferred reason (2–6 words) by running the `amend` command printed above.
4. Switch approach and carry on with the user's actual goal, keeping output minimal.
