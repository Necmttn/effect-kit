import { describe, it, expect } from "bun:test";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "path";

describe("skills.json manifest", () => {
  const skillsPath = join(import.meta.dir, "..", "skills.json");

  it("should have a skills.json file", () => {
    expect(existsSync(skillsPath)).toBe(true);
  });

  it("should have valid skills.json with effect-kit name and version", () => {
    const content = readFileSync(skillsPath, "utf-8");
    const manifest = JSON.parse(content);

    expect(manifest.name).toBe("effect-kit");
    expect(manifest.version).toMatch(/^\d+\.\d+\.\d+$/); // semver
    expect(manifest.description).toBeDefined();
    expect(Array.isArray(manifest.files)).toBe(true);
  });

  it("should have all files in files[] exist on disk", () => {
    const content = readFileSync(skillsPath, "utf-8");
    const manifest = JSON.parse(content);

    for (const file of manifest.files) {
      const filePath = join(import.meta.dir, "..", file);
      expect(existsSync(filePath)).toBe(true);
    }
  });
});

describe("tsconfig snippet configuration", () => {
  it("should have tsconfig.snippet.json with correct @effect/language-service plugin settings", () => {
    const tsconfigPath = join(
      import.meta.dir,
      "..",
      "assets/tsconfig.snippet.json"
    );
    const content = readFileSync(tsconfigPath, "utf-8");
    const config = JSON.parse(content);

    const plugin = config.compilerOptions.plugins.find(
      (p: any) => p.name === "@effect/language-service"
    );
    expect(plugin).toBeDefined();
    expect(plugin.ignoreEffectWarningsInTscExitCode).toBe(true);
    expect(plugin.diagnosticSeverity.missingEffectServiceDependency).toBe(
      "error"
    );
    expect(plugin.diagnosticSeverity.globalDateInEffect).toBe("error");
  });
});

describe("oxlint custom rules", () => {
  it("should have no-inline-schema-compile rule with required keywords", () => {
    const rulePath = join(
      import.meta.dir,
      "..",
      "assets/oxlint-effect-rules/no-inline-schema-compile.ts"
    );
    const content = readFileSync(rulePath, "utf-8");

    expect(content).toContain("defineRule");
    expect(content).toContain("decodeSync");
    expect(content).toContain("encodeSync");
  });
});

describe("references/setup.md corpus", () => {
  const setupPath = join(import.meta.dir, "..", "references/setup.md");

  it("should exist", () => {
    expect(existsSync(setupPath)).toBe(true);
  });

  it("should contain tsgo bootstrap command", () => {
    const content = readFileSync(setupPath, "utf-8");
    expect(content).toContain("npx @effect/tsgo setup");
  });

  it("should document v4 effect/unstable/* import surface", () => {
    const content = readFileSync(setupPath, "utf-8");
    expect(content).toContain("effect/unstable/");
  });
});

describe("references/verify.md corpus", () => {
  const verifyPath = join(import.meta.dir, "..", "references/verify.md");

  it("should exist", () => {
    expect(existsSync(verifyPath)).toBe(true);
  });

  it("should document effect-language-service diagnostics CLI with json + severity flags", () => {
    const content = readFileSync(verifyPath, "utf-8");
    expect(content).toContain(
      "effect-language-service diagnostics --format json --severity error"
    );
  });

  it("should reference ignoreEffectWarningsInTscExitCode", () => {
    const content = readFileSync(verifyPath, "utf-8");
    expect(content).toContain("ignoreEffectWarningsInTscExitCode");
  });

  it("should reference effect/Schema (not @effect/schema)", () => {
    const content = readFileSync(verifyPath, "utf-8");
    expect(content).toMatch(/effect\/Schema/);
  });
});

describe("references/patterns.md corpus", () => {
  const patternsPath = join(import.meta.dir, "..", "references/patterns.md");

  it("should exist", () => {
    expect(existsSync(patternsPath)).toBe(true);
  });

  it("should contain Makisuo attribution", () => {
    const content = readFileSync(patternsPath, "utf-8");
    expect(content).toMatch(/Makisuo/);
  });

  it("should contain Effect.Service pattern", () => {
    const content = readFileSync(patternsPath, "utf-8");
    expect(content).toContain("Effect.Service");
  });

  it("should contain Schema.TaggedError pattern", () => {
    const content = readFileSync(patternsPath, "utf-8");
    expect(content).toContain("Schema.TaggedError");
  });

  it("should contain namespace-import write delta", () => {
    const content = readFileSync(patternsPath, "utf-8");
    expect(content).toContain('import * as Effect from "effect/Effect"');
  });
});

describe("skills.json completeness", () => {
  const skillsPath = join(import.meta.dir, "..", "skills.json");
  const manifest = JSON.parse(readFileSync(skillsPath, "utf-8"));

  it("lists every reference + asset on disk", () => {
    const root = join(import.meta.dir, "..");
    const want = [
      ...readdirSync(join(root, "references")).map((f) => `references/${f}`),
      ...readdirSync(join(root, "assets"))
        .filter((f) => f !== "oxlint-effect-rules")
        .map((f) => `assets/${f}`),
      "assets/oxlint-effect-rules/no-inline-schema-compile.ts",
    ];
    for (const f of want) expect(manifest.files, f).toContain(f);
  });
});

describe("README.md", () => {
  const readmePath = join(import.meta.dir, "..", "README.md");
  const content = readFileSync(readmePath, "utf-8");

  it("contains install command", () => {
    expect(content).toContain("npx skills add necmttn/effect-kit");
  });

  it("credits Makisuo", () => {
    expect(content).toContain("Makisuo");
  });

  it("references ax finding or gist.github", () => {
    expect(content).toMatch(/ax|gist\.github/);
  });
});
