import { mkdtemp, readFile, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { runCli } from "../src/cli.js";

describe("CLI", () => {
  it("indexes, searches, and explains with deterministic hash embeddings", async () => {
    const tempRoot = await mkdtemp(path.join(tmpdir(), "scs-cli-"));
    await mkdir(path.join(tempRoot, "src"));
    await writeFile(
      path.join(tempRoot, "src", "math.ts"),
      "export function sum(values: number[]) {\n  return values.reduce((a, b) => a + b, 0);\n}\n"
    );
    await writeFile(path.join(tempRoot, "ignored.ts"), "export const secret = true;\n");
    await writeFile(path.join(tempRoot, ".scsignore"), "ignored.ts\n");

    const indexPath = path.join(tempRoot, ".semantic-code-search", "index.json");
    const stdout: string[] = [];

    await runCli(["index", tempRoot, "--out", indexPath, "--provider", "hash"], {
      cwd: tempRoot,
      stdout: (line) => stdout.push(line),
      stderr: () => undefined
    });

    const rawIndex = await readFile(indexPath, "utf8");
    expect(rawIndex).toContain("src/math.ts");
    expect(rawIndex).not.toContain("ignored.ts");

    const searchOutput: string[] = [];
    await runCli(["search", "sum numbers", "--index", indexPath, "--provider", "hash", "--json"], {
      cwd: tempRoot,
      stdout: (line) => searchOutput.push(line),
      stderr: () => undefined
    });

    const results = JSON.parse(searchOutput.join("\n")) as Array<{ path: string; snippet: string }>;
    expect(results[0]?.path).toBe("src/math.ts");
    expect(results[0]?.snippet).toContain("sum");

    const explainOutput: string[] = [];
    await runCli(["explain", "sum numbers", "--index", indexPath, "--provider", "hash", "--no-ai"], {
      cwd: tempRoot,
      stdout: (line) => explainOutput.push(line),
      stderr: () => undefined
    });

    expect(explainOutput.join("\n")).toContain("src/math.ts");
    await rm(tempRoot, { recursive: true, force: true });
  });
});
