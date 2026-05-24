import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { INDEX_SCHEMA_VERSION, readIndex, writeIndex } from "../src/index-store.js";
import type { SearchIndex } from "../src/types.js";

describe("index persistence", () => {
  it("writes and reads the embedding index JSON", async () => {
    const tempRoot = await mkdtemp(path.join(tmpdir(), "scs-index-"));
    const indexPath = path.join(tempRoot, "index.json");

    const index: SearchIndex = {
      schemaVersion: INDEX_SCHEMA_VERSION,
      root: tempRoot,
      createdAt: "2026-05-24T00:00:00.000Z",
      embedding: {
        provider: "hash",
        model: "hash-embedding-v1",
        dimensions: 32
      },
      stats: {
        filesScanned: 1,
        filesIndexed: 1,
        filesSkipped: 0,
        chunks: 1,
        bytesIndexed: 10
      },
      chunks: [
        {
          id: "src/a.ts#1-1",
          path: "src/a.ts",
          kind: "file",
          language: "typescript",
          startLine: 1,
          endLine: 1,
          hash: "abc",
          tokenCount: 2,
          content: "const a = 1;",
          embedding: [1, 0]
        }
      ]
    };

    await writeIndex(indexPath, index);
    await expect(readIndex(indexPath)).resolves.toEqual(index);
    await rm(tempRoot, { recursive: true, force: true });
  });
});
