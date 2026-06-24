import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const guide = readFileSync(
  join(import.meta.dir, "..", "references", "guide-effect-at-scale.md"),
  "utf8",
);

describe("guide-effect-at-scale.md", () => {
  it("covers the seven large-codebase areas", () => {
    for (const heading of [
      "Schema",
      "Architecture",
      "Runtime",
      "Concurrency",
      "HttpApi",
      "SQL",
      "Error modeling",
    ]) {
      expect(guide, heading).toContain(heading);
    }
  });

  it("names the load-bearing v4 constructs", () => {
    for (const token of [
      "Schema.Struct",
      "makeMemoMapUnsafe",
      "HttpApiBuilder",
      "LayerNode",
      "uninterruptibleMask",
      "ransport-agnostic",
    ]) {
      expect(guide, token).toContain(token);
    }
  });

  it("cites Kit Langton's opencode PRs", () => {
    expect(guide).toContain("33571");
    expect(guide).toMatch(/opencode/);
  });
});
