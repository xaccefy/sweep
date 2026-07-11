---
name: sweep-gain
description: >
  Show sweep's measured impact as a compact scoreboard: less code, less
  cost, more speed, from the benchmark medians. One-shot display, not a
  persistent mode, and not a per-repo number. Trigger: /sweep-gain,
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

The figures are the published benchmark medians (5 everyday tasks: email
validator, debounce, CSV sum, countdown timer, rate limiter; three models:
Haiku, Sonnet, Opus). They are measured, not computed from the current repo.
Source: the upstream [ponytail](https://github.com/DietrichGebert/ponytail) benchmark.

## Scoreboard

Render plain ASCII bars. The bar length shows the measured range; the label
carries the exact figure:

```
  sweep gain                      benchmark median · 5 tasks · 3 models

  Lines of code   no-skill  ███████████████████  100%
                  sweep    ██▌·················    6–20%   ▼ 80–94%
  Cost            no-skill  ███████████████████  100%
                  sweep    ████▌··············   23–53%  ▼ 47–77%
  Speed           sweep    ▸ 3–6× faster

  This repo:  /sweep-debt  (shortcuts you deferred)
              /sweep-audit (what's still cuttable)
```

## Honesty boundary

These are benchmark medians, not this repo. NEVER print a per-repo savings
number ("you saved X lines/tokens here"): the unbuilt version was never
written, so there is no real baseline to subtract from in a live repo. The
only real per-repo figures come from `/sweep-debt` (a counted ledger of
`shortcut:` markers), and this card points there instead of inventing one.

## Boundaries

One-shot display. Edits nothing, changes no mode.
"stop sweep" or "normal mode": revert.
