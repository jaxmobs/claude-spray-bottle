# 🧴 Claude Spray Bottle

Train Claude like a cat. Spray it when it does something you don't like.

- **Spray button** above the prompt (or `/s`): a spray-bottle popup with a mist burst, a "psssht" sound, and a heckle ("bad bot!", "you're on thin ice pal", "watch it, Clanker"). Claude stops, says in one line what it did wrong, and switches approach.
- **`/spray [reason]`**: no reason means Claude works out what you didn't like from its recent actions.
- **It remembers**: every spray is logged to `~/.claude/spray-log.jsonl`, and each new session starts with a summary like "sprayed 3x for over-explaining".

Sound plays on macOS (`afplay`). The `/spray` plugin needs `python3`.

## Install

Install both plugins. At the prompt of a terminal Claude Code session:

```
/plugin install spray-bottle --marketplace jaxmobs/claude-spray-bottle
/plugin install spray --marketplace jaxmobs/claude-spray-bottle
```

Answer `y` to add the marketplace, then press Enter for the user scope.

From a shell:

```bash
claude plugin install spray-bottle --marketplace jaxmobs/claude-spray-bottle
claude plugin install spray --marketplace jaxmobs/claude-spray-bottle
```

In the Claude desktop app, where `/plugin` doesn't run: click **+** next to the prompt box, then **Plugins**, **Add marketplace** with `jaxmobs/claude-spray-bottle`, then **Add plugin** for both `spray-bottle` and `spray`.
