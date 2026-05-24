import type { IndexedChunk, RankedChunk } from "./types.js";
import { clamp, splitLines, tokenizeCode } from "./text-utils.js";

export interface RankChunksOptions {
  query: string;
  queryEmbedding: number[];
  chunks: IndexedChunk[];
  semanticWeight?: number | undefined;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  const length = Math.min(a.length, b.length);
  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let index = 0; index < length; index += 1) {
    const aValue = a[index] ?? 0;
    const bValue = b[index] ?? 0;
    dot += aValue * bValue;
    normA += aValue * aValue;
    normB += bValue * bValue;
  }

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function rankChunks(options: RankChunksOptions): RankedChunk[] {
  const semanticWeight = clamp(options.semanticWeight ?? 0.72, 0, 1);
  const tokenWeight = 1 - semanticWeight;
  const queryTokens = unique(tokenizeCode(options.query));

  return options.chunks
    .map((chunk) => {
      const semanticScore = normalizeCosine(cosineSimilarity(options.queryEmbedding, chunk.embedding));
      const tokenScore = codeTokenScore(queryTokens, chunk);
      const score = semanticScore * semanticWeight + tokenScore * tokenWeight;
      return {
        chunk,
        score,
        semanticScore,
        tokenScore,
        snippet: buildSnippet(chunk.content, queryTokens)
      };
    })
    .sort((a, b) => b.score - a.score || a.chunk.path.localeCompare(b.chunk.path));
}

function normalizeCosine(value: number): number {
  return clamp((value + 1) / 2, 0, 1);
}

function codeTokenScore(queryTokens: string[], chunk: IndexedChunk): number {
  if (queryTokens.length === 0) {
    return 0;
  }

  const haystack = unique([
    ...tokenizeCode(chunk.path),
    ...tokenizeCode(chunk.symbol ?? ""),
    ...tokenizeCode(chunk.content)
  ]);
  const haystackSet = new Set(haystack);
  const matches = queryTokens.filter((token) => haystackSet.has(token)).length;
  const overlap = matches / queryTokens.length;
  const symbolBoost = queryTokens.some((token) => tokenizeCode(chunk.symbol ?? "").includes(token)) ? 0.15 : 0;
  const pathBoost = queryTokens.some((token) => tokenizeCode(chunk.path).includes(token)) ? 0.08 : 0;

  return clamp(overlap + symbolBoost + pathBoost, 0, 1);
}

function buildSnippet(content: string, queryTokens: string[]): string {
  const lines = splitLines(content);
  if (lines.length === 0) {
    return "";
  }

  const querySet = new Set(queryTokens);
  let bestIndex = 0;
  let bestScore = -1;

  lines.forEach((line, index) => {
    const tokens = tokenizeCode(line);
    const score = tokens.filter((token) => querySet.has(token)).length;
    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  });

  const start = Math.max(0, bestIndex - 1);
  const end = Math.min(lines.length, bestIndex + 2);
  return lines
    .slice(start, end)
    .map((line, offset) => `${start + offset + 1}: ${line}`)
    .join("\n");
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}
