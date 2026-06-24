import { describe, it, expect } from "bun:test";
import { existsSync, readFileSync } from "fs";
import { join } from "path";

const SKILL_PATH = join(import.meta.dir, "..", "SKILL.md");
const OBSERVE_PATH = join(import.meta.dir, "..", "references/observe.md");

describe("SKILL.md spine", () => {
  it("should exist", () => {
    expect(existsSync(SKILL_PATH)).toBe(true);
  });

  it("should have frontmatter with name: effect-kit", () => {
    const content = readFileSync(SKILL_PATH, "utf-8");
    expect(content).toMatch(/^---/m);
    expect(content).toContain("name: effect-kit");
  });

  it("should have frontmatter with a description field", () => {
    const content = readFileSync(SKILL_PATH, "utf-8");
    expect(content).toMatch(/description:/);
  });

  it("should contain all 8 checklist items ([ ] 1. through [ ] 8.)", () => {
    const content = readFileSync(SKILL_PATH, "utf-8");
    for (let i = 1; i <= 8; i++) {
      expect(content).toContain(`[ ] ${i}.`);
    }
  });

  it("should link all four reference files", () => {
    const content = readFileSync(SKILL_PATH, "utf-8");
    expect(content).toContain("setup.md");
    expect(content).toContain("verify.md");
    expect(content).toContain("patterns.md");
    expect(content).toContain("observe.md");
  });

  it("should contain Makisuo attribution", () => {
    const content = readFileSync(SKILL_PATH, "utf-8");
    expect(content).toContain("Makisuo");
  });

  it("should contain the ax-measured wedge evidence (~70 turns and quera/0 advisory)", () => {
    const content = readFileSync(SKILL_PATH, "utf-8");
    // Must mention ~70 turns and the quera 0-advisory contrast
    expect(content).toMatch(/~70/);
    expect(content).toMatch(/0 (such turns|advisory|turn)|quera/i);
  });
});

describe("references/observe.md", () => {
  it("should exist", () => {
    expect(existsSync(OBSERVE_PATH)).toBe(true);
  });

  it("should cover the Instrument half (Effect.fn named spans)", () => {
    const content = readFileSync(OBSERVE_PATH, "utf-8");
    expect(content).toContain("Effect.fn");
  });

  it("should cover structured logging (Effect.log)", () => {
    const content = readFileSync(OBSERVE_PATH, "utf-8");
    expect(content).toMatch(/Effect\.log/);
  });

  it("should cover tap/tapError for span events", () => {
    const content = readFileSync(OBSERVE_PATH, "utf-8");
    expect(content).toMatch(/Effect\.tap|tapError/);
  });

  it("should cover the Maple Sink (brew install, maple start, dashboard URL)", () => {
    const content = readFileSync(OBSERVE_PATH, "utf-8");
    expect(content).toContain("brew install Makisuo/tap/maple");
    expect(content).toContain("maple start");
    expect(content).toContain("https://local.maple.dev");
  });

  it("should mention MAPLE_TRACING=true", () => {
    const content = readFileSync(OBSERVE_PATH, "utf-8");
    expect(content).toContain("MAPLE_TRACING=true");
  });

  it("should mention the TracerDisabledWhen loop guard", () => {
    const content = readFileSync(OBSERVE_PATH, "utf-8");
    expect(content).toContain("TracerDisabledWhen");
  });

  it("should end with Agent-Observe pointer to devkit", () => {
    const content = readFileSync(OBSERVE_PATH, "utf-8");
    expect(content).toContain("Agent-Observe");
    expect(content).toContain("devkit");
  });

  it("should include MIT credit to Makisuo", () => {
    const content = readFileSync(OBSERVE_PATH, "utf-8");
    expect(content).toContain("Makisuo");
    expect(content).toMatch(/MIT/);
  });
});
