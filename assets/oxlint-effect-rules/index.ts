import { definePlugin } from "@oxlint/plugins"
import noInlineSchemaCompile from "./no-inline-schema-compile.ts"
import noPlainErrorClass from "./no-plain-error-class.ts"
import noLayerScoped from "./no-layer-scoped.ts"
import schemaFilterNeedsJsonschema from "./schema-filter-needs-jsonschema.ts"

// The plugin aggregator oxlint loads. Register it in `.oxlintrc.json` under the
// `jsPlugins` key (NOT `plugins`, which is for oxlint's built-ins), then enable the
// rules by their namespaced ids `effect-kit/<rule>`. See references/verify.md.
export default definePlugin({
  meta: { name: "effect-kit" },
  rules: {
    "no-inline-schema-compile": noInlineSchemaCompile,
    "no-plain-error-class": noPlainErrorClass,
    "no-layer-scoped": noLayerScoped,
    "schema-filter-needs-jsonschema": schemaFilterNeedsJsonschema,
  },
})
