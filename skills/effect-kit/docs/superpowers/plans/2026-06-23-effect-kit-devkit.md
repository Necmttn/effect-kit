# effect-kit devkit (Sub-project B) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract and generalize quera's `@nokta/devkit` into `effect-kit/devkit` - a reusable, config-driven Agent-Observe dev server (OTLP tee + trace/log stores + pattern-match analysis + an 8-tool MCP the running coding agent queries), ported to `effect@4`.

**Architecture:** A Bun + `effect@4` CLI app. `devkit dev` reads `devkit.config.json`, spawns config-declared processes, ingests their OTLP + stdout/stderr, stores them in ring buffers, matches against the diagnostics recipe packs, and serves an MCP stdio server (+ an internal HTTP mirror). The OTLP receiver is a **tee**: store/analyze locally AND forward upstream to a real collector (Maple Local :4318). Quera-specifics (hardcoded processes, portless, env-sync, domain detectors) become config.

**Tech Stack:** `effect@4.0.0-beta`, `effect/unstable/http` (server), `effect/unstable/cli` (commands), the v4 MCP surface (verified in Task 1), Bun (`Bun.spawn`, `BunHttpServer`), `bun test`.

**Source of truth for the port:** `/Users/necmttn/Projects/quera/apps/devkit/src/**` (effect@3.21). Each task ports specific files; read them as the reference implementation, then apply the v4 deltas + de-quera'ing below.

## Global Constraints

- `effect@4` ONLY - port from quera's 3.21 as you go; no 3.x interim.
- v4 import surface: `effect/unstable/http` (HttpRouter/HttpServer), `effect/unstable/cli`, `effect/unstable/observability`; platform-bun via the v4 Bun layer.
- Config-driven, not hardcoded: processes, ports, OTLP upstream, pattern packs, analysis detectors all come from `devkit.config.json`.
- STRIP: portless (HTTPS *.localhost + sudo proxy), env-sync-from-main-repo, worktree port-offset, `@nokta` naming, ClickStack/`just` remediation copy, the dead `@opentui/*` deps, the hardcoded backend/frontend process list + auth/bedrock domain detectors.
- Keep Bun-on-mac/linux; Windows/node portability deferred.
- The 8 MCP tool names + descriptions are the agent-facing contract - keep verbatim (fix only the quera-specific `restart_service` "backend or frontend" copy).
- Publish real `Schema`s for `HealthReport`/`EnrichedError`/`StoredSpan`/`StoredLog` (quera left tool `success` as `Schema.Unknown`).

---

## File Structure

```
effect-kit/devkit/
├── package.json                  # bin: { devkit }, effect@4 deps, bun test
├── devkit.config.example.json    # the documented config surface
├── src/
│   ├── index.ts                  # CLI entry: dev | mcp | init
│   ├── config/
│   │   ├── schema.ts             # Schema for devkit.config.json (processes[], otlp, analysis...)
│   │   └── load.ts               # read+decode config, env overrides
│   ├── lib/
│   │   ├── ring-buffer.ts        # port (pure)
│   │   ├── otlp-json.ts          # port: OTLP/JSON -> StoredSpan[]/StoredLog[]
│   │   ├── pattern-loader.ts     # port: pattern/manifest schema, compile, match, interpolate
│   │   └── stack-detector.ts     # port: detect packs from deps/lockfiles
│   ├── domain/
│   │   └── types.ts              # StoredSpan, StoredLog, HealthReport, EnrichedError (real Schemas)
│   ├── services/
│   │   ├── TraceStore.ts         # Effect.Service ring buffer
│   │   ├── LogStore.ts           # Effect.Service ring buffer
│   │   ├── PatternStore.ts       # Effect.Service: load+compile packs, reload()
│   │   ├── OtlpReceiver.ts       # Layer: v4 http server, tee+forward
│   │   ├── AnalysisService.ts    # Effect.Service: span-tree, health, issues, enrich, tail
│   │   ├── ProcessManager.ts     # Effect.Service: spawn config processes, stream stdio->LogStore
│   │   ├── McpServer.ts          # the 8-tool toolkit + stdio transport
│   │   └── InternalApi.ts        # http mirror of the tools
│   └── commands/
│       ├── dev.ts                # spawn + receive + serve (no portless/env-sync)
│       ├── mcp.ts                # mcp-only mode
│       └── init.ts               # scaffold devkit.config.json + pattern packs
└── test/**.test.ts
```

---

### Task 1: De-risk spike - verify the v4 API surface (http, cli, MCP)
**Files:** Create `effect-kit/devkit/package.json`, `src/spike.ts` (throwaway), `test/spike.test.ts`.
**Produces:** confirmation of the exact v4 import paths for: an HTTP server+router, a CLI command, and the MCP server/tool/toolkit (the spec flagged "verify where MCP lives in v4"). Records findings in a `PORT-NOTES.md`.
- [ ] Step 1: `package.json` with `effect@^4.0.0-beta.78` + `@types/bun`; `bun add` it.
- [ ] Step 2: write `src/spike.ts` importing candidates: `import { HttpRouter, HttpServer } from "effect/unstable/http"`, `import { Command } from "effect/unstable/cli"`, and probe MCP: try `effect/unstable/ai`, else check if `@effect/ai` has a v4 release. Run `npx @effect/tsgo --noEmit` (or tsc) - resolve which imports type-check.
- [ ] Step 3: write `PORT-NOTES.md` recording the resolved v4 paths for http/cli/MCP + any API renames vs quera's 3.x (`@effect/platform`→`effect/unstable/http`, `@effect/cli`→`effect/unstable/cli`, `@effect/ai`→?). If MCP is NOT yet in v4, record the fallback decision (pin `@effect/ai` to a v4-compatible version, or implement the stdio MCP JSON-RPC loop directly - it's a small protocol).
- [ ] Step 4: `test/spike.test.ts` asserts `PORT-NOTES.md` names a concrete MCP path/decision (so the unknown is closed before Task 8).
- [ ] Step 5: delete `src/spike.ts`; commit `chore(devkit): scaffold + v4 API surface spike (PORT-NOTES)`.

### Task 2: Config schema + loader (`devkit.config.json`)
**Files:** Create `src/config/schema.ts`,`src/config/load.ts`,`devkit.config.example.json`; Test `test/config.test.ts`.
**Produces:** `DevkitConfig` Schema + `loadConfig(path): Effect<DevkitConfig, ConfigError>`. Shape: `{ version, processes: [{name,command:string[],cwd,port?,color?,env?}], otlp:{port=4328,upstream="http://localhost:4318",forwardMetrics?}, apiPort=4319, patterns:{packs:string[],localDir?}, analysis:{slowThresholdMs=5000,keyAttributes:string[],serviceDetectors:[{match,name}]} }`. Env overrides: `DEVKIT_OTLP_PORT/API_PORT/OTLP_UPSTREAM/SLOW_THRESHOLD_MS`.
- [ ] Step 1: failing test - `loadConfig` on `devkit.config.example.json` decodes; a missing `processes` fails; `DEVKIT_OTLP_PORT=9999` env overrides the file value.
- [ ] Step 2: run - FAIL.
- [ ] Step 3: write `schema.ts` (Effect `Schema.Struct` per shape above; this is the GENERALIZATION of quera's `process-config.ts` + `devkit-config.ts` - processes are data, not code) + `load.ts` (read file via Bun, `Schema.decodeUnknown`, layer env overrides on top) + the example config.
- [ ] Step 4: run - PASS.
- [ ] Step 5: commit `feat(devkit): config schema + loader (replaces hardcoded process-config)`.

### Task 3: Pure libs - ring-buffer, otlp-json (port)
**Files:** Create `src/lib/ring-buffer.ts`,`src/lib/otlp-json.ts`,`src/domain/types.ts`; Test `test/ring-buffer.test.ts`,`test/otlp-json.test.ts`.
**Produces:** `RingBuffer<T>` (capacity, push, filter, snapshot); `parseTracePayload(json): StoredSpan[]`, `parseLogsPayload(json): StoredLog[]`; real `Schema`s `StoredSpan`/`StoredLog` in `domain/types.ts`.
- [ ] Step 1: failing tests - RingBuffer overwrites at capacity + `filter` works; `parseTracePayload` on a sample OTLP/JSON trace yields a span with `traceId`, `name`, `durationMs` (nano→ms), `status`; `parseLogsPayload` maps severity.
- [ ] Step 2: run - FAIL.
- [ ] Step 3: port `lib/ring-buffer.ts` + `lib/otlp-json.ts` from quera (pure, domain-free; attribute-union decode, nano→ms, severity/status mapping). Define `StoredSpan`/`StoredLog` as real `Schema.Struct` in `domain/types.ts` (quera used loose types). Use a committed OTLP/JSON fixture (capture one from `maple` or hand-write minimal).
- [ ] Step 4: run - PASS.
- [ ] Step 5: commit `feat(devkit): ring-buffer + otlp-json parser (ported) + Stored* schemas`.

### Task 4: pattern-loader + PatternStore + stack-detector (port)
**Files:** Create `src/lib/pattern-loader.ts`,`src/lib/stack-detector.ts`,`src/services/PatternStore.ts`; Test `test/pattern-loader.test.ts`,`test/pattern-store.test.ts`.
**Produces:** `compilePattern`, `matchPattern(text): Match|null`, `interpolate(title, captures)`; `PatternStore` Effect.Service `{ getPatterns(), reload() }`; `detectStack(root): string[]` (packs from deps/lockfiles). Reuses the SAME recipe format as Plan A's `diagnostics-recipes.json`.
- [ ] Step 1: failing tests - a recipe regex matches a sample line + interpolates `$1` into title; `PatternStore.getPatterns()` loads a packs dir; `detectStack` returns `["effect"]` when `package.json` deps include `effect`.
- [ ] Step 2: run - FAIL.
- [ ] Step 3: port `lib/pattern-loader.ts` + `lib/stack-detector.ts` + `services/PatternStore.ts` from quera (Effect.Service tag `devkit/PatternStore`); load packs from `config.patterns.packs` + bundled fallback. Bundle effect/node/database packs (NOT quera's surrealdb-flavored ones unless generic).
- [ ] Step 4: run - PASS.
- [ ] Step 5: commit `feat(devkit): pattern-loader + PatternStore + stack-detector (ported)`.

### Task 5: TraceStore + LogStore (Effect.Service ring buffers)
**Files:** Create `src/services/TraceStore.ts`,`src/services/LogStore.ts`; Test `test/stores.test.ts`.
**Produces:** `TraceStore` `{ add, query(opts), getTrace(traceId), stats() }`, `LogStore` `{ add, addMany, query(opts), stats() }` (Effect.Service tags `devkit/TraceStore`,`devkit/LogStore`), backed by `RingBuffer`.
- [ ] Step 1: failing tests - add spans then `query({service, minDurationMs, status})` filters correctly; `getTrace(id)` returns all spans of a trace; LogStore `query({level, search, source})` filters; `stats()` counts.
- [ ] Step 2: run - FAIL.
- [ ] Step 3: port both services from quera (3→4 Effect.Service mechanical changes); back with `RingBuffer` (Task 3).
- [ ] Step 4: run - PASS.
- [ ] Step 5: commit `feat(devkit): TraceStore + LogStore services (ported to v4)`.

### Task 6: AnalysisService - the brain, with config-driven detectors
**Files:** Create `src/services/AnalysisService.ts`; Test `test/analysis.test.ts`.
**Produces:** `AnalysisService` `{ healthCheck(sinceMin): HealthReport, getSpanTree(traceId), formatSpanTree(traceId): string, getEnrichedError(...): EnrichedError, tail(sinceMin) }`. `HealthReport`/`EnrichedError` are real Schemas in `domain/types.ts`.
- [ ] Step 1: failing tests - `formatSpanTree` renders a parent/child waterfall with timing + an "unaccounted gap"; `healthCheck` returns `red` when an error span exists, `green` when clean; a config `serviceDetectors:[{match:"/api/auth",name:"auth"}]` tags a span's service "auth" (proving the de-quera'ing - detectors are CONFIG now, not hardcoded `BetterAuth`/`bedrock`).
- [ ] Step 2: run - FAIL.
- [ ] Step 3: port `services/AnalysisService.ts` from quera. KEEP: span-tree build, issue-detection (pattern match + slow-query over `config.analysis.slowThresholdMs` + crash), error enrichment, tail deltas. MOVE TO CONFIG: the auth/bedrock service-detection (→ `config.analysis.serviceDetectors[]`), the key-attribute allowlist (→ `config.analysis.keyAttributes[]`); keep generic `db.system`/`gen_ai`/`http` detection as defaults. Define `HealthReport`/`EnrichedError` Schemas.
- [ ] Step 4: run - PASS.
- [ ] Step 5: commit `feat(devkit): AnalysisService with config-driven detectors (de-quera'd)`.

### Task 7: OtlpReceiver - v4 http server, tee + forward
**Files:** Create `src/services/OtlpReceiver.ts`; Test `test/otlp-receiver.test.ts`.
**Produces:** `OtlpReceiverLive: Layer` - a v4 `HttpServer` on `config.otlp.port` (4328) with `POST /v1/{traces,logs,metrics}` (JSON only) + `GET /health`; stores traces→TraceStore, logs→LogStore; **tees** the raw body to `config.otlp.upstream` (best-effort `fetch`); self-loop guard (disable forward if upstream port == bound port).
- [ ] Step 1: failing test - POST a sample OTLP/JSON trace to the receiver (in-process via the test http client) → it lands in TraceStore; with `upstream` set to a stub server, the raw body is forwarded; with `upstream` port == otlp port, no forward.
- [ ] Step 2: run - FAIL.
- [ ] Step 3: port `services/OtlpReceiver.ts` to v4 `effect/unstable/http` (HttpRouter/HttpServer per Task 1's PORT-NOTES). Move the module-level `forwardStats` + `console.*` into the Effect/config world. Keep the tee semantics + self-loop guard. Metrics are forward-only (not stored), per quera.
- [ ] Step 4: run - PASS.
- [ ] Step 5: commit `feat(devkit): OtlpReceiver v4 http tee + forward`.

### Task 8: McpServer (8 tools) + InternalApi
**Files:** Create `src/services/McpServer.ts`,`src/services/InternalApi.ts`; Test `test/mcp-toolkit.test.ts`,`test/internal-api.test.ts`.
**Produces:** the MCP toolkit (server name `effect-kit-devkit`, stdio) with the 8 tools - `health_check`, `get_errors`, `get_span_tree(trace_id)`, `get_traces`, `get_logs`, `tail`, `get_status`, `restart_service` - each wired to TraceStore/LogStore/AnalysisService/ProcessManager; `InternalApi` mirrors them over HTTP on `config.apiPort`.
- [ ] Step 1: failing test - the toolkit defines exactly those 8 tool names with their param schemas (e.g. `get_span_tree` requires `trace_id: string`; `get_traces` accepts `since_minutes/limit/service/operation/min_duration_ms/status`); calling `health_check` against a store with an error span returns status `red`.
- [ ] Step 2: run - FAIL.
- [ ] Step 3: implement using the MCP path resolved in Task 1 (v4 `@effect/ai`/`effect/unstable/ai` or the direct stdio JSON-RPC fallback). Port the tool wiring from quera's `McpServer.ts` (the handlers call the same store/analysis methods). Replace `success: Schema.Unknown` with the real `HealthReport`/`EnrichedError`/`StoredSpan`/`StoredLog` schemas. Fix `restart_service` description (drop "backend or frontend" → "a managed process by name"). Port `InternalApi.ts` (HTTP GET/POST mirror, compact vs `?detail=full`).
- [ ] Step 4: run - PASS.
- [ ] Step 5: commit `feat(devkit): 8-tool MCP toolkit + internal HTTP API (typed payloads)`.

### Task 9: ProcessManager - spawn config-declared processes
**Files:** Create `src/services/ProcessManager.ts`; Test `test/process-manager.test.ts`.
**Produces:** `ProcessManager` `{ start(proc), stop(name), restart(name), status(), getProcess(name), stopAll() }` - spawns each `config.processes[]` via `Bun.spawn`, streams stdout/stderr into LogStore (with multi-line stack-trace grouping), crash detection.
- [ ] Step 1: failing test - start a trivial process (`{name:"echo",command:["bash","-c","echo hi; sleep 0.1"]}`) → its stdout lands in LogStore as a log line tagged service "echo"; `status()` reports it; `restart` works.
- [ ] Step 2: run - FAIL.
- [ ] Step 3: port `services/ProcessManager.ts`. STRIP the `backend`/`frontend` color map (colors come from `config.processes[].color`); keep the spawn/track/stderr-stack-grouping/crash-detection mechanism. No portless wrapping - spawn the command directly.
- [ ] Step 4: run - PASS.
- [ ] Step 5: commit `feat(devkit): ProcessManager over config-declared processes (no portless)`.

### Task 10: `dev` + `mcp` + `init` commands + bin (integration)
**Files:** Create `src/commands/dev.ts`,`src/commands/mcp.ts`,`src/commands/init.ts`,`src/index.ts`; Test `test/dev-integration.test.ts`.
**Consumes:** every service. **Produces:** the CLI. `devkit dev` = load config → ProcessManager.start all + OtlpReceiver + AnalysisService + McpServer + InternalApi (one Layer graph); `devkit mcp` = MCP-only; `devkit init` = scaffold `devkit.config.json` + pattern packs; `bin: { devkit: "./src/index.ts" }`.
- [ ] Step 1: failing integration test - boot the `dev` layer graph against a config with one trivial process + an in-process OTLP POST; assert (a) the process log is queryable via the InternalApi `/internal/logs`, (b) the trace is queryable, (c) `health_check` reflects it. (Drives the whole graph end-to-end.)
- [ ] Step 2: run - FAIL.
- [ ] Step 3: write `commands/dev.ts` = the v4 port of quera's `dev.ts` with `SharedLayer`/`SharedStores` (TraceStore+LogStore+OtlpReceiver+InternalApi+AnalysisService+PatternStore+ProcessManager+config), driven by `effect/unstable/cli` `Command`. DROP entirely: `runPortlessMode`, `PortlessLayer`, `waitForPortlessRoute`, the `--portless` flag, `syncEnvFromMainRepo`, worktree port-offset. `commands/mcp.ts` = stores+analysis+McpServer only. `commands/init.ts` = write `devkit.config.json` (from `detectStack`) + copy bundled packs. `index.ts` = `Command` group `dev|mcp|init`, `bin`.
- [ ] Step 4: run the FULL suite `bun test` - PASS.
- [ ] Step 5: commit `feat(devkit): dev/mcp/init commands + bin - agent-observe server complete`.

### Task 11: Wire the unification + README
**Files:** Create `README.md`; Modify `devkit.config.example.json` (Maple upstream default).
**Produces:** docs showing the tee: app `OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4328` → devkit (agent MCP) → forward `http://127.0.0.1:4318` (Maple). MCP registration snippet for Claude/Codex.
- [ ] Step 1: failing test - `test/readme.test.ts` asserts README contains the tee diagram (`:4328` and `:4318`), the MCP registration command, and the 8 tool names.
- [ ] Step 2: run - FAIL.
- [ ] Step 3: author README - install (`bun add` / link the bin), `devkit init`, `devkit dev`, point the app's OTLP endpoint at `:4328`, register `devkit mcp` as an MCP server in the agent; the 8 tools; the Maple tee. Set `devkit.config.example.json` `otlp.upstream` default to `http://127.0.0.1:4318`.
- [ ] Step 4: run `bun test` - PASS.
- [ ] Step 5: commit `docs(devkit): README - Maple tee + MCP registration + tool surface`.

---

## Self-Review

**Spec coverage (Sub-project B section):** reusable core (OtlpReceiver/stores/analysis/pattern/MCP/InternalApi/ProcessManager) → Tasks 3–10 ✔ · config-declared processes replacing process-config.ts → Task 2 ✔ · strip portless/env-sync/worktree-offset → Tasks 9,10 ✔ · config-drive domain detectors → Task 6 ✔ · 8-tool MCP contract → Task 8 ✔ · tee→Maple unification → Tasks 7,11 ✔ · v4-only port → Global Constraints + Task 1 spike ✔ · typed payloads (real Schemas) → Tasks 3,6,8 ✔ · drop @opentui dead deps → Task 1 package.json ✔.
**Placeholder scan:** no TBD/TODO; "port from quera file X" is a concrete sourcing action (the reference impl exists at the cited path) + each task states the explicit v4 delta and de-quera'ing.
**Type consistency:** service tags `devkit/{TraceStore,LogStore,PatternStore,AnalysisService,ProcessManager}` consistent; `StoredSpan`/`StoredLog`/`HealthReport`/`EnrichedError` defined in `domain/types.ts` (Task 3/6) and consumed by McpServer (Task 8); the 8 tool names identical in Task 8 test, McpServer, and README (Task 11).
**Riskiest unknown closed first:** Task 1 spike resolves the v4 MCP/http/cli surface before any port work - if MCP isn't in v4 yet, the fallback (pin @effect/ai or direct stdio JSON-RPC) is decided there, not discovered mid-port.
**Cross-plan:** the recipe-pack format is shared with Plan A's `diagnostics-recipes.json` (Task 4 reuses it) - keep the schema identical across both plans.
