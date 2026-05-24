import { tokenizeCode } from "./text-utils.js";

export const HASH_EMBEDDING_MODEL = "hash-embedding-v1";
export const DEFAULT_HASH_DIMENSIONS = 256;

export function hashEmbedding(input: string, dimensions = DEFAULT_HASH_DIMENSIONS): number[] {
  const vector = Array.from({ length: dimensions }, () => 0);
  const tokens = tokenizeCode(input);

  if (tokens.length === 0) {
    return vector;
  }

  for (const token of tokens) {
    const hash = fnv1a(token);
    const index = hash % dimensions;
    const sign = hash & 1 ? 1 : -1;
    const weight = 1 + Math.min(token.length, 24) / 24;
    vector[index] = (vector[index] ?? 0) + sign * weight;
  }

  const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  if (norm === 0) {
    return vector;
  }

  return vector.map((value) => Number((value / norm).toFixed(8)));
}

function fnv1a(value: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}
