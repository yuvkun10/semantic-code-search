import { describe, expect, it } from "vitest";

import { chunkSourceFile } from "../src/chunker.js";

describe("chunkSourceFile", () => {
  it("extracts TypeScript function and class chunks with stable line ranges", () => {
    const source = [
      "export function add(a: number, b: number) {",
      "  return a + b;",
      "}",
      "",
      "export class SearchIndex {",
      "  query(text: string) {",
      "    return text.trim();",
      "  }",
      "}"
    ].join("\n");

    const chunks = chunkSourceFile({
      relativePath: "src/search.ts",
      content: source,
      maxChunkLines: 80
    });

    expect(chunks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "function",
          symbol: "add",
          startLine: 1,
          endLine: 3
        }),
        expect.objectContaining({
          kind: "class",
          symbol: "SearchIndex",
          startLine: 5,
          endLine: 9
        })
      ])
    );
  });

  it("falls back to capped file chunks when no function-like units exist", () => {
    const content = Array.from({ length: 7 }, (_, index) => `line ${index + 1}`).join("\n");

    const chunks = chunkSourceFile({
      relativePath: "notes.txt",
      content,
      maxChunkLines: 3
    });

    expect(chunks).toHaveLength(3);
    expect(chunks.map((chunk) => [chunk.startLine, chunk.endLine])).toEqual([
      [1, 3],
      [4, 6],
      [7, 7]
    ]);
    expect(chunks.every((chunk) => chunk.kind === "file")).toBe(true);
  });
});
