import { describe, it, expect } from "bun:test";
import { existsSync, readFileSync } from "fs";
import { join } from "path";

describe("otel-maple.layer.ts", () => {
  const layerPath = join(
    import.meta.dir,
    "..",
    "assets/otel-maple.layer.ts"
  );

  it("should have otel-maple.layer.ts file", () => {
    expect(existsSync(layerPath)).toBe(true);
  });

  it("should import from effect/unstable/observability", () => {
    const content = readFileSync(layerPath, "utf-8");
    expect(content).toContain('from "effect/unstable/observability"');
  });

  it("should use Otlp.layerJson", () => {
    const content = readFileSync(layerPath, "utf-8");
    expect(content).toContain("Otlp.layerJson");
  });

  it("should use FetchHttpClient", () => {
    const content = readFileSync(layerPath, "utf-8");
    expect(content).toContain("FetchHttpClient");
  });

  it("should NOT use @effect/opentelemetry", () => {
    const content = readFileSync(layerPath, "utf-8");
    expect(content).not.toContain("@effect/opentelemetry");
  });

  it("should contain the default Maple Local endpoint 127.0.0.1:4318", () => {
    const content = readFileSync(layerPath, "utf-8");
    expect(content).toContain("127.0.0.1:4318");
  });

  it("should contain Layer.empty for inert mode", () => {
    const content = readFileSync(layerPath, "utf-8");
    expect(content).toContain("Layer.empty");
  });
});
