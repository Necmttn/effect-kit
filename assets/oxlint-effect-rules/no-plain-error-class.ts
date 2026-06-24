import { defineRule } from "@oxlint/plugins"

// Flags `class X extends Error {}`. TypeScript's structural typing makes every
// bare Error subclass equivalent, so a union `A | B | Error` collapses to `Error`
// and `catchTag` can no longer discriminate. Use `Data.TaggedError("X")<{...}>`
// (or `Schema.TaggedError`) for a nominal `_tag`.
// Source: mikearnaldi, Effect-TS/effect#3742.
export default defineRule({
  meta: {
    name: "no-plain-error-class",
    messages: {
      plain:
        "`class {{name}} extends Error` collapses structurally - `{{name}} | OtherError | Error` reduces to `Error`, breaking catchTag. Use Data.TaggedError(\"{{name}}\")<{...}> instead.",
    },
  },
  create(ctx) {
    const check = (node: any) => {
      const sup = node.superClass
      // Bare `extends Error` is an Identifier named "Error".
      // `extends Data.TaggedError("X")<...>` / `Schema.TaggedError(...)` are
      // CallExpression super-classes, so they are excluded automatically.
      if (sup?.type === "Identifier" && sup.name === "Error") {
        const name = node.id?.name ?? "this class"
        ctx.report({ node, messageId: "plain", data: { name } })
      }
    }
    return { ClassDeclaration: check, ClassExpression: check }
  },
})
