# effect-kit Setup Reference

Opinionated, one-path setup for an Effect.ts codebase using tsgo, the v4 platform surface, and the assets bundled in this kit. No lean/full profiles - one recipe.

---

## 1. Bootstrap with tsgo

Run the official bootstrapper to scaffold tsconfig, package.json defaults, and the native TypeScript compiler shim:

```sh
npx @effect/tsgo setup
```

This resolves the current versions of `@typescript/native-preview` and `typescript` and wires the tsgo runner. After it runs, `@typescript/native-preview` builds drift weekly - **pin the exact version your CI resolved** in your repo immediately (the kit teaches structure; your repo owns the pin):

```sh
# capture resolved version
TSGO_VER=$(node -p "require('@typescript/native-preview/package.json').version")
# pin it with your package manager
pnpm pkg set devDependencies["@typescript/native-preview"]="$TSGO_VER"
```

---

## 2. Merge kit devDependencies

`assets/package.deps.json` contains the full Effect toolchain at pinned beta versions. Merge its `devDependencies` block into your `package.json`:

```sh
node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const deps = JSON.parse(fs.readFileSync('node_modules/effect-kit/assets/package.deps.json', 'utf8'));
pkg.devDependencies = { ...pkg.devDependencies, ...deps.devDependencies };
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
"
```

Then install:

```sh
pnpm install        # or bun install
```

---

## 3. Version cohesion - one beta, everywhere

Every Effect package must resolve to the **same** beta. Use your package manager's catalog/override mechanism:

**pnpm** (`pnpm-workspace.yaml`):
```yaml
catalog:
  effect: "^4.0.0-beta"

packages:
  overrides:
    effect: "catalog:effect"
    "@effect/language-service": "^0.85.0"
    "@effect/tsgo": "^0.13.0"
```

See `assets/package.deps.json` for the authoritative pinned version; pin the exact build in your own repo after `@effect/tsgo setup`.

**bun** (`package.json` - bun catalogs are declared in `package.json`, not `bunfig.toml`):
```json
{
  "catalogs": {
    "effect": {
      "effect": "^4.0.0-beta",
      "@effect/language-service": "^0.85.0",
      "@effect/tsgo": "^0.13.0"
    }
  }
}
```

Reference catalog entries in your workspace packages using `"catalog:<group>"`:
```json
{
  "dependencies": {
    "effect": "catalog:effect",
    "@effect/language-service": "catalog:effect"
  }
}
```

See `assets/package.deps.json` for the authoritative pinned version; pin the exact build in your own repo after `@effect/tsgo setup`.

Wire the **prepare hook** so the package.json transformations `@effect/tsgo` requires run on every install:

```json
{
  "scripts": {
    "prepare": "effect-tsgo patch"
  }
}
```

---

## 4. Merge the tsconfig snippet

`assets/tsconfig.snippet.json` contains the `@effect/language-service` plugin block with:

- `ignoreEffectWarningsInTscExitCode: true` - `tsc --noEmit` exits 0 when only Effect advisories are present
- A `diagnosticSeverity` table that promotes all actionable Effect rules to `"error"` (covers `missingEffectServiceDependency`, `globalDateInEffect`, schema/console/fetch/timer globals, barrel imports, and more)
- `namespaceImportPackages: ["effect"]` - enforces `import * as Effect from "effect/Effect"` style

Merge it into your `tsconfig.json` plugins array:

```sh
node -e "
const fs = require('fs');
const tsconfig = JSON.parse(fs.readFileSync('tsconfig.json', 'utf8'));
const snippet = JSON.parse(fs.readFileSync('node_modules/effect-kit/assets/tsconfig.snippet.json', 'utf8'));
const existing = tsconfig.compilerOptions?.plugins ?? [];
const plugin = snippet.compilerOptions.plugins[0];
const idx = existing.findIndex(p => p.name === plugin.name);
if (idx >= 0) existing[idx] = { ...existing[idx], ...plugin };
else existing.push(plugin);
tsconfig.compilerOptions = { ...tsconfig.compilerOptions, plugins: existing };
fs.writeFileSync('tsconfig.json', JSON.stringify(tsconfig, null, 2) + '\n');
"
```

---

## 5. Run-TypeScript-directly tsconfig stance

tsgo runs TypeScript source without a prior transpile step. Your `tsconfig.json` must enable:

```json
{
  "compilerOptions": {
    "allowImportingTsExtensions": true,
    "rewriteRelativeImportExtensions": true,
    "erasableSyntaxOnly": true,
    "verbatimModuleSyntax": true,
    "exactOptionalPropertyTypes": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "module": "preserve",
    "moduleResolution": "bundler"
  }
}
```

`erasableSyntaxOnly` bans `enum` and `namespace` (not erasable at the type level). Use `const` object maps or tagged unions instead.

---

## 6. Install lint-staged and lefthook

Copy the two gate files to your repo root:

```sh
cp node_modules/effect-kit/assets/effect-lint-staged.sh ./effect-lint-staged.sh
cp node_modules/effect-kit/assets/lefthook.yml ./lefthook.yml
chmod +x ./effect-lint-staged.sh
```

Install the hooks:

```sh
npx lefthook install
```

`lefthook.yml` wires `effect-lint-staged.sh` as a pre-commit gate. The script runs tsgo (`@typescript/native-preview --noEmit`) per staged file's nearest `tsconfig.json` and filters the diagnostics down to the staged files; the commit is blocked only on `error` lines (warnings never block). oxlint (with the custom `no-inline-schema-compile` rule) and the `effect-language-service diagnostics` CLI are **separate** verify steps - see `references/verify.md` - the gate itself does not run them.

---

## 7. v4 Platform import surface

In `effect@4.0.0-beta.x` the platform stack is exposed in-core under `effect/unstable/*` (http, sql, rpc, cli, observability, process, reactivity) - prefer those imports over `@effect/platform`.

| Capability | v4 import |
|---|---|
| HTTP client/server | `effect/unstable/http` |
| SQL | `effect/unstable/sql` |
| RPC | `effect/unstable/rpc` |
| CLI | `effect/unstable/cli` |
| Observability / OTLP | `effect/unstable/observability` |
| Process | `effect/unstable/process` |
| Reactivity (atoms) | `effect/unstable/reactivity` |

Example:

```typescript
import { HttpClient } from "effect/unstable/http"
import { SqlClient } from "effect/unstable/sql"
```

Stable sub-paths (`effect/Effect`, `effect/Schema`, `effect/Layer`, etc.) are unchanged.

---

## 8. Verification

After setup, confirm the toolchain is wired:

```sh
# Type-check with tsgo (fast native compiler)
npx tsgo --noEmit

# LSP diagnostics - machine-readable, Effect-only
effect-language-service diagnostics --format json --severity error,warning,message

# Run lefthook gates manually
lefthook run pre-commit
```

See `references/verify.md` for the full agent-facing verification protocol.
