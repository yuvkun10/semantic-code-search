import { describe, expect, it } from "vitest";

import { createIgnoreMatcher } from "../src/ignore-rules.js";

describe("createIgnoreMatcher", () => {
  it("ignores defaults, env files, generated indexes, and custom patterns", () => {
    const matcher = createIgnoreMatcher({
      root: "/repo",
      patterns: ["secrets/**", "*.snap"]
    });

    expect(matcher.ignores("node_modules/pkg/index.js")).toBe(true);
    expect(matcher.ignores(".git/config")).toBe(true);
    expect(matcher.ignores(".semantic-code-search/index.json")).toBe(true);
    expect(matcher.ignores(".env.local")).toBe(true);
    expect(matcher.ignores("secrets/key.txt")).toBe(true);
    expect(matcher.ignores("src/output.snap")).toBe(true);
    expect(matcher.ignores("src/index.ts")).toBe(false);
  });
});
