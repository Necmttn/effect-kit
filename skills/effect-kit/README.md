# effect-kit

The opinionated, agent-optimized way to set up, write, verify, and observe an Effect.ts codebase. Installs tsgo + `@effect/language-service` as your type-checker, wires a central type-filter gate (quera) that converts advisory LSP warnings into hard errors or explicit silences, brings v4-idiomatic patterns aligned with `effect` v4 beta, and ships a Maple OTLP observability layer - all as a single publishable skill.

```bash
npx skills add necmttn/effect-kit
```

## Four pillars

- **Setup** - bootstrap `npx @effect/tsgo setup`, configure the `@effect/language-service` plugin gate, add oxlint custom rules (`no-inline-schema-compile`) and lefthook pre-commit
- **Write** - v4 idiomatic patterns: `Effect.Service`, `Schema.TaggedError`, namespace imports, layer composition, and the `effect/unstable/*` import surface
- **Verify** - `effect-language-service diagnostics --format json --severity error` + `ignoreEffectWarningsInTscExitCode` gate; CI-safe tsc exit codes
- **Observe** - `MapleObservabilityLive` OTLP layer (Maple) for structured traces and metrics in production

## Why

A real-world finding tracked via ax: a repo running the `@effect/language-service` LSP plugin without a central type-filter gate produced a ~70-turn "advisory vs error" agent loop over 60 days. The agent kept second-guessing whether diagnostics were blocking errors or ignorable warnings, triggering repair cycles and re-verification. A sibling repo running tsgo + a quera gate had 0 such loops - the gate makes the answer deterministic.

The measured data: https://gist.github.com/Necmttn/59fffa53dfce94270b45bca42a7f45bf

## Credits

The **Write** patterns (`Effect.Service`, `Schema.TaggedError`, layer composition, namespace imports) and the **Observe** Maple sink are adapted from [`Makisuo/skills`](https://github.com/Makisuo/skills) `effect-best-practices` (MIT) - credit and deep appreciation to Makisuo for the original patterns and Maple.

The **Setup** (tsgo bootstrap, quera gate config), **Verify** (diagnostics CLI gate, `ignoreEffectWarningsInTscExitCode` pattern), and related originals in effect-kit are authored here and intended to be contributed back upstream to `Makisuo/skills` - bidirectional flow is the design intent.

---

Generated with [ax](https://github.com/Necmttn/ax)
