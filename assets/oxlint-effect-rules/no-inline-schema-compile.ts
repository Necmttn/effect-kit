import { defineRule } from "@oxlint/plugins"

const COMPILER_METHODS = new Set([
  "decodeSync","encodeSync","decodeUnknownSync","encodeUnknownSync",
  "is","asserts","decodeUnknownEffect","encodeUnknownEffect",
])

// Flags Schema.<compiler-method>(...) called inside a function body, because each
// call rebuilds the compiled coder. Hoist the coder to module scope instead.
export default defineRule({
  meta: { name: "no-inline-schema-compile",
    messages: { inline: "Schema.{{method}} compiles a coder on every call; hoist it to module scope." } },
  create(ctx) {
    return {
      CallExpression(node: any) {
        const callee = node.callee
        if (callee?.type !== "MemberExpression") return
        const method = callee.property?.name
        if (!COMPILER_METHODS.has(method)) return
        // inside a function body?
        let p = node.parent
        while (p) { if (/Function/.test(p.type)) {
          ctx.report({ node, messageId: "inline", data: { method } }); return } p = p.parent }
      },
    }
  },
})
