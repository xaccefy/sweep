---
name: sweep-gain
description: >
  Show sweep's measured impact as a compact scoreboard: less code, fewer
  tokens, lower cost, and faster delivery from the agentic benchmark.
  One-shot display, not a persistent mode, and not a per-repo number. Trigger: /sweep-gain,
  "sweep gain", "what does sweep save", "show sweep impact",
  "sweep scoreboard".
---

# Sweep Gain

Display this scoreboard when invoked. One-shot: do NOT change mode, write flag
files, or persist anything.

These numbers are gated, not raw. A "minimal" diff that drops a test,
validation, or security guard is scored **unsafe** and earns **zero** efficiency
credit — less code is only a win when it stays correct and safe. That is the
whole point, and it is what separates sweep from a one-liner prompt.

The headline figures come from the upstream agentic benchmark: 12 feature tasks
performed against a real FastAPI + React repository by Haiku 4.5, with four
runs per task. They are measured from the resulting diffs and sessions, not
computed from the current repo. Source: the upstream
[ponytail agentic benchmark](https://github.com/DietrichGebert/ponytail/blob/main/benchmarks/results/2026-06-18-agentic.md).
The safety score comes from its separate adversarial tier.

## Scoreboard

Render plain ASCII bars. The bar length shows the measured range; the label
carries the exact figure:

```
  sweep gain                  agentic mean · 12 tasks · Haiku 4.5 · n=4

  Lines of code   no-skill  ████████████████████  100%
                  sweep     █████████···········   46%   ▼ 54%
  Tokens          no-skill  ████████████████████  100%
                  sweep     ████████████████····   78%   ▼ 22%
  Cost            no-skill  ████████████████████  100%
                  sweep     ████████████████····   80%   ▼ 20%
  Time            no-skill  ████████████████████  100%
                  sweep     ███████████████·····   73%   ▼ 27%
  Safety          sweep     100%

  This repo:  /sweep-debt  (shortcuts you deferred)
              /sweep-audit (what's still cuttable)
```

## Honesty boundary

These are benchmark results, not this repo. NEVER print a per-repo savings
number ("you saved X lines/tokens here"): the unbuilt version was never
written, so there is no real baseline to subtract from in a live repo. The
only real per-repo figures come from `/sweep-debt` (a counted ledger of
`shortcut:` markers), and this card points there instead of inventing one.
The older isolated-generation benchmark found 80–94% less code, but that is a
per-task ceiling with a conversational-baseline artifact, not the headline
average. Do not present it as the overall savings figure.

## Boundaries

One-shot display. Edits nothing, changes no mode.
"stop sweep" or "normal mode": revert.
