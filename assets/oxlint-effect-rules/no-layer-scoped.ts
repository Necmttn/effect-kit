import { defineRule } from "@oxlint/plugins"

// Flags `Layer.scoped(...)`. In effect@4 the dedicated `Layer.scoped` API is gone:
// `Layer.effect` itself accepts a `Scope`, so scoped resource acquisition goes
// through `Layer.effect`. Migrate `Layer.scoped(tag, effect)` -> `Layer.effect(tag, effect)`.
// Source: official Effect-TS skill (guide-layers), v4 migration.
export default defineRule({
  meta: {
    name: "no-layer-scoped",
    messages: {
      removed:
        "`Layer.scoped` was removed in effect@4 - `Layer.effect` now accepts a Scope. Use `Layer.effect(...)` instead.",
    },
  },
  create(ctx) {
    return {
      CallExpression(node: any) {
        const callee = node.callee
        if (callee?.type !== "MemberExpression") return
        if (callee.object?.name === "Layer" && callee.property?.name === "scoped") {
          ctx.report({ node, messageId: "removed" })
        }
      },
    }
  },
})
