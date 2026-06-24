import { describe, it, expect } from "bun:test";
import { existsSync, readFileSync } from "fs";
import { join } from "path";

describe("diagnostics-recipes.json", () => {
  const recipesPath = join(
    import.meta.dir,
    "..",
    "assets/diagnostics-recipes.json"
  );

  it("should have diagnostics-recipes.json file", () => {
    expect(existsSync(recipesPath)).toBe(true);
  });

  it("should have valid JSON structure with name, description, version, detect, and patterns", () => {
    const content = readFileSync(recipesPath, "utf-8");
    const manifest = JSON.parse(content);

    expect(manifest.name).toBe("effect");
    expect(manifest.description).toBeDefined();
    expect(manifest.version).toBe("1");
    expect(manifest.detect).toBeDefined();
    expect(Array.isArray(manifest.detect.dependencies)).toBe(true);
    expect(manifest.detect.dependencies).toContain("effect");
    expect(Array.isArray(manifest.patterns)).toBe(true);
    expect(manifest.patterns.length).toBeGreaterThan(0);
  });

  it("should have each pattern with required fields: name, match, source, severity, title, action, example", () => {
    const content = readFileSync(recipesPath, "utf-8");
    const manifest = JSON.parse(content);

    for (const pattern of manifest.patterns) {
      expect(pattern.name).toBeDefined();
      expect(typeof pattern.name).toBe("string");
      expect(pattern.match).toBeDefined();
      expect(typeof pattern.match).toBe("string");
      expect(pattern.source).toBeDefined();
      expect(pattern.severity).toBeDefined();
      expect(pattern.title).toBeDefined();
      expect(pattern.action).toBeDefined();
      expect(pattern.example).toBeDefined();
      expect(typeof pattern.example).toBe("string");
    }
  });

  it("should have each pattern's regex match its example fixture", () => {
    const content = readFileSync(recipesPath, "utf-8");
    const manifest = JSON.parse(content);

    for (const pattern of manifest.patterns) {
      const regex = new RegExp(pattern.match);
      expect(regex.test(pattern.example)).toBe(
        true,
        `Pattern "${pattern.name}" with regex "${pattern.match}" should match example "${pattern.example}"`
      );
    }
  });

  it("should include key pattern names: service-not-found, unhandled-defect, circular-layer, rpc-handler-missing", () => {
    const content = readFileSync(recipesPath, "utf-8");
    const manifest = JSON.parse(content);

    const patternNames = manifest.patterns.map((p: any) => p.name);
    expect(patternNames).toContain("service-not-found");
    expect(patternNames).toContain("unhandled-defect");
    expect(patternNames).toContain("circular-layer");
    expect(patternNames).toContain("rpc-handler-missing");
  });

  it("should have patterns with severity in [critical, warning, info]", () => {
    const content = readFileSync(recipesPath, "utf-8");
    const manifest = JSON.parse(content);

    for (const pattern of manifest.patterns) {
      expect(["critical", "warning", "info"]).toContain(pattern.severity);
    }
  });
});
