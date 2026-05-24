import { describe, expect, it } from "vitest";

import { cosineSimilarity, rankChunks } from "../src/ranking.js";
import type { IndexedChunk } from "../src/types.js";

const baseChunk = {
  hash: "hash",
  language: "typescript",
  startLine: 1,
  endLine: 4,
  tokenCount: 10
} satisfies Omit<IndexedChunk, "id" | "path" | "kind" | "content" | "embedding">;

describe("ranking", () => {
  it("computes cosine similarity for vectors", () => {
    expect(cosineSimilarity([1, 0], [1, 0])).toBeCloseTo(1);
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
  });

  it("ranks chunks with semantic and code-token signals", () => {
    const chunks: IndexedChunk[] = [
      {
        ...baseChunk,
        id: "semantic-close",
        path: "src/math.ts",
        kind: "function",
        symbol: "sum",
        content: "export function sum(values: number[]) { return values.reduce((a, b) => a + b, 0); }",
        embedding: [0.91, 0.09]
      },
      {
        ...baseChunk,
        id: "token-close",
        path: "src/parser.ts",
        kind: "function",
        symbol: "parseInvoiceTotal",
        content: "function parseInvoiceTotal(text) { return extractCurrency(text); }",
        embedding: [0.65, 0.35]
      },
      {
        ...baseChunk,
        id: "distant",
        path: "src/theme.ts",
        kind: "file",
        content: "export const colors = ['red', 'blue'];",
        embedding: [0, 1]
      }
    ];

    const ranked = rankChunks({
      query: "parse invoice total",
      queryEmbedding: [0.7, 0.3],
      chunks,
      semanticWeight: 0.5
    });

    expect(ranked[0]?.chunk.id).toBe("token-close");
    expect(ranked[0]?.score).toBeGreaterThan(ranked[1]?.score ?? 0);
    expect(ranked[0]?.snippet).toContain("parseInvoiceTotal");
  });
});
