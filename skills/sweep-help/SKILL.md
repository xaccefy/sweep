---
name: sweep-help
description: >
  Quick-reference card for all sweep modes, skills, and commands.
  One-shot display, not a persistent mode. Trigger: /sweep-help,
  "sweep help", "what sweep commands", "how do I use sweep".
---

# Sweep Help

Display this reference card when invoked. One-shot, do NOT change mode,
write flag files, or persist anything.

## Levels

| Level | Trigger | What change |
|-------|---------|-------------|
| **Lite** | `/sweep lite` | Build what's asked, name the lazier alternative in one line. |
| **Full** | `/sweep` | The ladder enforced: YAGNI → stdlib → native → one line → minimum. Default. |
| **Ultra** | `/sweep ultra` | YAGNI extremist. Deletion before addition. Challenges requirements before building. |

Level sticks until you change it.

## Skills

| Skill | Trigger | What it does |
|-------|---------|--------------|
| **sweep** | `/sweep` | Lazy mode itself. Simplest solution that works. |
| **sweep-review** | `/sweep-review` | Over-engineering review: `L42: yagni: factory, one product. Inline.` |
| **sweep-audit** | `/sweep-audit` | Whole-repo over-engineering audit: ranked list of what to delete. |
| **sweep-debt** | `/sweep-debt` | Harvest `shortcut:` comments into a tracked ledger of deferred work. |
| **sweep-gain** | `/sweep-gain` | Measured-impact scoreboard: less code, less cost, more speed. |
| **sweep-help** | `/sweep-help` | This card. |

## Deactivate

Say "stop sweep" or "normal mode". Resume anytime with `/sweep`.
`/sweep off` also works.

## Configure Default Mode

Default mode = `full`, auto-active every session. Change it:

**Environment variable** (highest priority):
```bash
export SWEEP_DEFAULT_MODE=ultra
```

**Config file** (`~/.config/sweep/config.json`, Windows: `%APPDATA%\sweep\config.json`):
```json
{ "defaultMode": "lite" }
```

Set `"off"` to disable auto-activation on session start, activate manually
with `/sweep` when wanted.

Resolution: env var > config file > `full`.

## Install (Pi)

```
pi install git:github.com/DietrichGebert/sweep
```

## More

Full docs + examples: https://github.com/DietrichGebert/sweep
