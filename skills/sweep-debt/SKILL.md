---
name: sweep-debt
description: >
  Harvest every `shortcut:` comment in the codebase into a debt ledger, so the
  deliberate shortcuts and deferrals sweep leaves behind get tracked instead
  of rotting into "later means never". Use when the user says "sweep debt",
  "/sweep-debt", "what did sweep defer", "list the shortcuts", "sweep
  ledger", or "what did we mark to do later". One-shot report, changes nothing.
---

Every deliberate sweep shortcut is marked with a `shortcut:` comment naming
its ceiling and upgrade path. This collects them into one ledger so a deferral
can't quietly become permanent.

## Scan

Search the repo for comment markers, skipping dependencies, generated output,
and Sweep's own convention examples:

`rg -n --hidden -g '!node_modules/**' -g '!.git/**' -g '!dist/**' -g '!build/**' -g '!coverage/**' -g '!README*' -g '!skills/sweep*/SKILL.md' '(#|//|/\*|\*)\s*shortcut:' .`

Each hit is one ledger row. The comment prefix keeps prose that merely mentions
the convention out of the ledger. Discard quoted examples and generated files
that survive the globs; they are documentation, not debt.

## Output

**Lead with the rot risk.** Any `shortcut:` comment that names no upgrade path
or trigger is the one that silently becomes permanent — surface those rows
first. Then list every marker, grouped by file:

`<file>:<line>, <what was simplified>. ceiling: <the limit named>. upgrade: <the trigger to revisit>.`

The convention is `shortcut: <ceiling>, <upgrade path>`, so pull the ceiling
and the trigger straight from the comment. Want an owner per row too? add
`git blame -L<line>,<line>`.

Count a trigger only when the comment states an observable threshold or event
(`when`, `if`, `once`, a size/latency/load limit). "Improve later" has no trigger.

End with `<N> markers, <M> with no trigger.` Nothing found: `No shortcut debt. Clean ledger.`

## Boundaries

Reads and reports only, changes nothing. To persist it, ask and it writes the
ledger to a file (e.g. `SWEEP-DEBT.md`). One-shot. "stop sweep-debt" or
"normal mode" to revert.
