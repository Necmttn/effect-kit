import { defineRule } from "@oxlint/plugins"

// Flags `Schema.filter(predicate)` with no options argument. A refinement requires
// a JSON Schema annotation, so `JSONSchema.make` throws on a filter that lacks one.
// Pass `{ jsonSchema: { ...constraint } }`, or `{ jsonSchema: {} }` to explicitly
// opt out when there is no constraint to express.
// Source: gcanti, Effect-TS/effect#3915.
export default defineRule({
  meta: {
    name: "schema-filter-needs-jsonschema",
    messages: {
      missing:
        "Schema.filter without a `{ jsonSchema }` option throws in JSONSchema.make. Pass `{ jsonSchema: { ...constraint } }`, or `{ jsonSchema: {} }` to opt out.",
    },
  },
  create(ctx) {
    return {
      CallExpression(node: any) {
        const callee = node.callee
        if (callee?.type !== "MemberExpression") return
        if (callee.object?.name !== "Schema" || callee.property?.name !== "filter") return
        // A compliant call carries a second (options) argument. The predicate-only
        // form is the one that throws in JSONSchema.make.
        if (node.arguments.length < 2) {
          ctx.report({ node, messageId: "missing" })
        }
      },
    }
  },
})
