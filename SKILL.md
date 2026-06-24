---
name: effect-kit
description: The opinionated, agent-optimized way to set up, write, verify, and observe an Effect.ts codebase - tsgo + a central-filter gate + v4 OTLP. Use when setting up or hardening an Effect.ts repo for AI agents.
---
# effect-kit

[Evidence hook - measured via ax: a repo on the @effect/language-service plugin + raw `tsc` produced a recurring ~70-turn "is this advisory an error?" agent loop over 60 days; a sibling repo on tsgo + a central-filter gate (quera) had 0 such turns. Patterns adapted from Makisuo/skills (MIT); observability pairs with Maple (also Makisuo).]

## Pillars
- **Setup** → references/setup.md  (tsgo + gate + severity table; one opinionated full setup)
- **Write** → references/patterns.md  (Makisuo's patterns + namespace imports)
- **Verify** → references/verify.md  (diagnostics CLI + recipe pack; trust the exit code) · maintainer-pattern catalog → references/guide-maintainer-patterns.md (oxlint → grep → review)
- **Observe** → references/observe.md  (v4 Otlp.layerJson → Maple; Agent-Observe via devkit)

## Install - run this checklist top to bottom (one todo per item)
- [ ] 1. Detect package manager + Effect version (bun/pnpm/npm; effect@4 beta?)
- [ ] 2. tsgo toolchain: `npx @effect/tsgo setup` (resolves current versions); merge assets/package.deps.json; pin in-repo
- [ ] 3. tsconfig: merge assets/tsconfig.snippet.json (plugin + ignoreEffectWarningsInTscExitCode + diagnosticSeverity table)
- [ ] 4. Gate: copy assets/effect-lint-staged.sh (chmod +x) + assets/lefthook.yml; `lefthook install`
- [ ] 5. Verify wiring: `effect-language-service diagnostics --project ./tsconfig.json --severity error` (expect exit 0)
- [ ] 6. CLAUDE.md: write the managed `<!-- effect-kit:start -->` block (verify rules + pillar pointers)
- [ ] 7. (optional) Observe: "wire local tracing with Maple?" → brew install Makisuo/tap/maple · maple start · copy assets/otel-maple.layer.ts · add effect (v4) · set MAPLE_TRACING=true
- [ ] 8. Smoke check: `tsc --noEmit; echo $?` is 0 on advisory-only; stage a file and confirm the gate fires on an error
