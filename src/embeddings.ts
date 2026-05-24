import OpenAI from "openai";

import { DEFAULT_HASH_DIMENSIONS, hashEmbedding, HASH_EMBEDDING_MODEL } from "./hash-embedding.js";
import { loadLocalEnv } from "./env.js";
import type { EmbeddingProviderName } from "./types.js";

export const DEFAULT_OPENAI_EMBEDDING_MODEL = "text-embedding-3-small";

export interface EmbeddingProvider {
  provider: EmbeddingProviderName;
  model: string;
  dimensions: number;
  embed(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
}

export interface ResolveEmbeddingProviderOptions {
  provider?: EmbeddingProviderName | "auto" | undefined;
  cwd: string;
  model?: string | undefined;
  dimensions?: number | undefined;
}

export function resolveEmbeddingProvider(options: ResolveEmbeddingProviderOptions): EmbeddingProvider {
  loadLocalEnv(options.cwd);
  const provider = options.provider === "auto" || !options.provider ? "openai" : options.provider;

  if (provider === "hash") {
    return new HashEmbeddingProvider(options.dimensions ?? DEFAULT_HASH_DIMENSIONS);
  }

  return new OpenAIEmbeddingProvider({
    model: options.model ?? process.env.OPENAI_EMBEDDING_MODEL ?? DEFAULT_OPENAI_EMBEDDING_MODEL,
    dimensions: options.dimensions,
    cwd: options.cwd
  });
}

export class HashEmbeddingProvider implements EmbeddingProvider {
  readonly provider = "hash" as const;
  readonly model = HASH_EMBEDDING_MODEL;

  constructor(readonly dimensions = DEFAULT_HASH_DIMENSIONS) {}

  async embed(text: string): Promise<number[]> {
    return hashEmbedding(text, this.dimensions);
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    return texts.map((text) => hashEmbedding(text, this.dimensions));
  }
}

class OpenAIEmbeddingProvider implements EmbeddingProvider {
  readonly provider = "openai" as const;
  readonly model: string;
  readonly dimensions: number;
  private readonly client: OpenAI;

  constructor(options: { model: string; dimensions?: number | undefined; cwd: string }) {
    loadLocalEnv(options.cwd);
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is required for OpenAI embeddings. Add it to .env.local or pass --provider hash.");
    }

    this.model = options.model;
    this.dimensions = options.dimensions ?? 1536;
    this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  async embed(text: string): Promise<number[]> {
    const [embedding] = await this.embedBatch([text]);
    if (!embedding) {
      throw new Error("OpenAI returned no embedding");
    }
    return embedding;
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    const results: number[][] = [];
    const batchSize = 64;
    for (let start = 0; start < texts.length; start += batchSize) {
      const batch = texts.slice(start, start + batchSize);
      const request: OpenAI.Embeddings.EmbeddingCreateParams = {
        model: this.model,
        input: batch,
        encoding_format: "float"
      };
      if (this.dimensions !== 1536) {
        request.dimensions = this.dimensions;
      }
      const response = await this.client.embeddings.create(request);
      const ordered = [...response.data].sort((a, b) => a.index - b.index);
      results.push(...ordered.map((item) => item.embedding));
    }
    return results;
  }
}
