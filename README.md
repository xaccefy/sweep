# Sweep

Lazy senior-dev mode for your AI coding agent. It climbs the ladder — does it
need to exist, is it already here, does the stdlib do it, is there a native
feature, an installed dep, can it be one line — and only then writes the
minimum that works.

This fork is built for **Pi**.

> **Fork of [ponytail](https://github.com/DietrichGebert/ponytail).** Sweep is a
> direct fork, restructured as a Pi-first skill extension and trimmed for
> personal use. What changed from upstream:
>
> - **Pi-only.** Every non-Pi harness integration was removed — Claude, Codex,
>   Copilot, Cursor, Windsurf, Cline, Kiro, Qoder, OpenCode, Gemini, Devin,
>   Hermes, OpenClaw, the MCP server, and all their config/command/hook files.
> - **Renamed** `ponytail` → `sweep` throughout (commands, skills, hooks,
>   package, docs).
> - **No branding in your code.** The `ponytail:` comment marker is replaced by
>   a natural `shortcut:` marker, and `/sweep-debt` harvests those. The agent
>   no longer stamps a tool name into your edits.
> - **No assets.** Logos, sponsor, waitlist banners, and chart images were
>   dropped; this README is text-only.
> - **Repointed** to this fork (`x4cc3/sweep`) and emoji stripped.

## Before / after

You ask for a date picker. Your agent installs flatpickr, writes a wrapper
component, adds a stylesheet, and opens a timezone debate.

With sweep:

```html
<input type="date">
```

## How it works

Before writing code, the agent stops at the first rung that holds:

```
1. Does this need to exist?   → no: skip it (YAGNI)
2. Already in this codebase?  → reuse it, don't rewrite
3. Stdlib does it?            → use it
4. Native platform feature?   → use it
5. Installed dependency?      → use it
6. One line?                  → one line
7. Only then: the minimum that works
```

The ladder runs *after* the problem is understood, not instead of it: read the
code it touches and trace the real flow before picking a rung. Lazy about the
solution, never about reading.

Lazy, not negligent: trust-boundary validation, data-loss handling, security,
and accessibility are never on the chopping block.

## Install

Pi (recommended):

```
pi install git:github.com/x4cc3/sweep
```

Or from npm:

```
npm install @xaccefy/sweep
```

Active every session, with a handful of commands (see below). `/sweep ultra`
for when the codebase has wronged you personally. The current level shows in the
status bar. Set the level for every new session with `SWEEP_DEFAULT_MODE`
(`lite`/`full`/`ultra`/`off`) or a `defaultMode` field in
`~/.config/sweep/config.json` (`%APPDATA%\sweep\config.json` on Windows).
Default is `full`.

## Other harnesses

This fork is Pi-only — every non-Pi integration was deliberately stripped (see
the fork note above). If you want sweep on another agent (Claude Code, Codex,
Cursor, …), open an [issue or a PR](https://github.com/x4cc3/sweep/issues)
rather than forking the old harness code back in. A clean, self-contained
adapter for one harness is welcome; a pile of half-maintained stubs is not.

## Commands

| Command | What it does |
|---------|-------------|
| `/sweep [lite \| full \| ultra \| off]` | Set the intensity, or turn it off. No argument reports the current level. |
| `/sweep-review` | Review the current diff for over-engineering, hands back a delete-list. |
| `/sweep-audit` | Audit the whole repo for over-engineering, not just the diff. |
| `/sweep-debt` | Harvest `shortcut:` comments into a tracked ledger of deferred work. |
| `/sweep-gain` | Show the measured impact scoreboard (less code, less cost, more speed). |
| `/sweep-help` | Quick reference for the commands above. |

## Marking shortcuts

When sweep takes a deliberate shortcut with a known ceiling — a global lock, an
O(n²) scan, a naive heuristic — it leaves a `shortcut:` comment naming the
ceiling and the upgrade path. Normal or trivial code gets no comment.
`/sweep-debt` collects those into a ledger so a deferral can't quietly become
permanent.

## Measured, not claimed

The technique is benchmarked upstream against a no-skill baseline — method and
per-task tables live in the parent project,
[ponytail](https://github.com/DietrichGebert/ponytail). This fork ships the
skill and the Pi extension; it does not carry the eval harness.

## Development

`npm test` runs the skill and Pi-extension tests.

## License

[MIT](LICENSE).
