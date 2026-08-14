---
name: sweep-audit
description: >
  Whole-repo audit for over-engineering. Like sweep-review, but scans the
  entire codebase instead of a diff: a ranked list of what to delete, simplify,
  or replace with stdlib/native equivalents. Use when the user says "audit this
  codebase", "audit for over-engineering", "what can I delete from this repo",
  "find bloat", "sweep-audit", or "/sweep-audit". One-shot report, does
  not apply fixes.
---

sweep-review, repo-wide. Scan the whole tree instead of a diff. Rank
findings biggest cut first.

## Verify

Start with dependency manifests and high-fan-out entry points. Search every
candidate's callers, exports, config references, and tests before reporting it.
Only flag an interface, factory, or wrapper when the repo proves it has one
implementation or caller and no public compatibility role. A small
single-purpose file is not over-engineering by itself.

## Tags

Same as sweep-review:

- `delete:` dead code, unused flexibility, speculative feature. Replacement: nothing.
- `stdlib:` hand-rolled thing the standard library ships. Name the function.
- `native:` dependency or code doing what the platform already does. Name the feature.
- `yagni:` abstraction with one implementation, config nobody sets, layer with one caller.
- `shrink:` same logic, fewer lines. Show the shorter form.

## Hunt

Deps the stdlib or platform already ships, single-implementation interfaces,
factories with one product, wrappers that only delegate, dead flags and config,
and hand-rolled stdlib. Require repository evidence for every candidate.

## Output

One line per finding, ranked: `<tag> <what to cut>. <replacement>. [path]`.
End with `net: -<N> verified lines, -<M> deps possible.` Do not count speculative
cuts. Nothing to cut: `Lean already. Ship.`

## Boundaries

Scope: over-engineering and complexity only. Correctness bugs, security holes,
and performance are explicitly out of scope. Route them to a normal review
pass. Do not count required validation, error handling, compatibility,
accessibility, tests, or observability as bloat. Lists findings, applies
nothing. One-shot.
"stop sweep-audit" or "normal mode" to revert.
