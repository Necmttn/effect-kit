import { describe, expect, it } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dir, "..");
const catalog = JSON.parse(
  readFileSync(join(root, "assets", "effect-rules.json"), "utf8"),
);

const VALID_TIERS = new Set(["oxlint", "grep", "review"]);
const VALID_SEVERITY = new Set(["error", "warning", "info"]);

describe("effect-rules.json catalog", () => {
  it("every rule has the required fields", () => {
    for (const r of catalog.rules) {
      expect(typeof r.id, r.id).toBe("string");
      expect(typeof r.title, r.id).toBe("string");
      expect(VALID_TIERS.has(r.check), `${r.id} check=${r.check}`).toBe(true);
      expect(VALID_SEVERITY.has(r.severity), `${r.id} severity=${r.severity}`).toBe(true);
      // every rule carries a bad/good example and a source citation
      expect(typeof r.bad, r.id).toBe("string");
      expect(typeof r.good, r.id).toBe("string");
      expect(typeof r.source?.who, r.id).toBe("string");
    }
  });

  it("oxlint-tier rules name an existing rule file", () => {
    const ruleFiles = new Set(
      readdirSync(join(root, "assets", "oxlint-effect-rules")).map((f) =>
        f.replace(/\.ts$/, ""),
      ),
    );
    for (const r of catalog.rules.filter((r: any) => r.check === "oxlint")) {
      expect(ruleFiles.has(r.rule), `oxlint rule file for ${r.id}`).toBe(true);
    }
  });

  it("grep-tier rules carry a valid regex; review-tier rules carry a look_for", () => {
    for (const r of catalog.rules) {
      if (r.check === "grep") {
        expect(typeof r.grep, r.id).toBe("string");
        expect(() => new RegExp(r.grep), r.id).not.toThrow();
      }
      if (r.check === "review") {
        expect(typeof r.look_for, r.id).toBe("string");
      }
    }
  });

  it("rule ids are unique", () => {
    const ids = catalog.rules.map((r: any) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("oxlint plugin loader contract (index.ts)", () => {
  const index = readFileSync(
    join(root, "assets", "oxlint-effect-rules", "index.ts"),
    "utf8",
  );
  it("aggregates every rule via definePlugin under the effect-kit namespace", () => {
    expect(index).toContain("definePlugin");
    expect(index).toContain('name: "effect-kit"');
    // every oxlint-tier catalog rule must be registered in the plugin
    for (const r of catalog.rules.filter((r: any) => r.check === "oxlint")) {
      expect(index, r.rule).toContain(`"${r.rule}"`);
    }
  });
});

describe("new oxlint rules (source text)", () => {
  const read = (name: string) =>
    readFileSync(join(root, "assets", "oxlint-effect-rules", `${name}.ts`), "utf8");

  it("no-plain-error-class flags `extends Error` and names defineRule", () => {
    const src = read("no-plain-error-class");
    expect(src).toContain("defineRule");
    expect(src).toContain("Error");
    expect(src).toContain("Data.TaggedError");
  });

  it("no-layer-scoped targets Layer.scoped", () => {
    const src = read("no-layer-scoped");
    expect(src).toContain("defineRule");
    expect(src).toContain("Layer");
    expect(src).toContain("scoped");
    expect(src).toContain("Layer.effect");
  });

  it("schema-filter-needs-jsonschema targets Schema.filter arity", () => {
    const src = read("schema-filter-needs-jsonschema");
    expect(src).toContain("defineRule");
    expect(src).toContain("filter");
    expect(src).toContain("jsonSchema");
    expect(src).toContain("arguments.length");
  });
});
