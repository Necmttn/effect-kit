import { describe, it, expect } from "bun:test";
import { existsSync, readFileSync } from "fs";
import { join } from "path";

describe("lint-staged-gate", () => {
  const gateScriptPath = join(import.meta.dir, "..", "assets", "effect-lint-staged.sh");

  it("should have the gate script file", () => {
    expect(existsSync(gateScriptPath)).toBe(true);
  });

  it("should use @typescript/native-preview (tsgo), not bare tsc --noEmit", () => {
    const content = readFileSync(gateScriptPath, "utf-8");
    expect(content).toContain("@typescript/native-preview");
    expect(content).not.toContain("tsc --noEmit");
  });

  it("should grep for both error and warning lines from staged files", () => {
    const content = readFileSync(gateScriptPath, "utf-8");
    expect(content).toContain('grep -E "($pattern).*: (error|warning) "');
  });

  it("should exit 1 only on error lines, not warnings", () => {
    const content = readFileSync(gateScriptPath, "utf-8");
    expect(content).toContain('grep -E "($pattern).*: error "');
    // Should check for error output and exit 1 only if errors are found
    expect(content).toContain("exit 1");
    // Should have logic to exit 1 only when errors are present
    expect(content).toContain(">/dev/null");
  });

  it("should handle pattern escaping for file paths", () => {
    const content = readFileSync(gateScriptPath, "utf-8");
    // Should escape special regex characters in file paths
    expect(content).toContain("sed 's/[.");
    expect(content).toContain("\\&/g'");
  });

  it("should walk up directory tree to find nearest tsconfig.json", () => {
    const content = readFileSync(gateScriptPath, "utf-8");
    expect(content).toContain("while [ \"$d\" != \".\" ]");
    expect(content).toContain("[ -f \"$d/tsconfig.json\" ]");
  });

  it("should have lefthook.yml with correct configuration", () => {
    const lefthookPath = join(import.meta.dir, "..", "assets", "lefthook.yml");
    expect(existsSync(lefthookPath)).toBe(true);
    const content = readFileSync(lefthookPath, "utf-8");
    expect(content).toContain("parallel: true");
    expect(content).toContain("*.{ts,tsx}");
    expect(content).toContain("{staged_files}");
  });
});
