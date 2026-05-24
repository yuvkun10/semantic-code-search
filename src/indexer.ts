import path from "node:path";

import { chunkSourceFile } from "./chunker.js";
import { resolveEmbeddingProvider, type EmbeddingProvider } from "./embeddings.js";
import { INDEX_SCHEMA_VERSION, writeIndex } from "./index-store.js";
import type { EmbeddingProviderName, IndexedChunk, SearchIndex, SourceChunk } from "./types.js";
import { walkCodebase } from "./walker.js";

export interface BuildIndexOptions {
  root: string;
  out?: string | undefined;
  provider?: EmbeddingProviderName | undefined;
  model?: string | undefined;
  dimensions?: number | undefined;
  maxFileBytes?: number | undefined;
  maxTotalBytes?: number | undefined;
  maxFiles?: number | undefined;
  maxChunkLines?: number | undefined;
  cwd?: string | undefined;
}

export interface BuildIndexResult {
  index: SearchIndex;
  outPath: string;
}

export async function buildIndex(options: BuildIndexOptions): Promise<BuildIndexResult> {
  const root = path.resolve(options.cwd ?? process.cwd(), options.root);
  const outPath = path.resolve(options.cwd ?? process.cwd(), options.out ?? ".semantic-code-search/index.json");
  const provider = resolveEmbeddingProvider({
    provider: options.provider ?? "openai",
    cwd: options.cwd ?? root,
    model: options.model,
    dimensions: options.dimensions
  });

  const walked = await walkCodebase({
    root,
    maxFileBytes: options.maxFileBytes,
    maxTotalBytes: options.maxTotalBytes,
    maxFiles: options.maxFiles
  });
  const sourceChunks = walked.files.flatMap((file) =>
    chunkSourceFile({
      relativePath: file.path,
      content: file.content,
      maxChunkLines: options.maxChunkLines
    })
  );
  const embeddings = await provider.embedBatch(sourceChunks.map(embeddingInput));
  const chunks = sourceChunks.map<IndexedChunk>((chunk, index) => ({
    ...chunk,
    embedding: embeddings[index] ?? []
  }));

  const index: SearchIndex = {
    schemaVersion: INDEX_SCHEMA_VERSION,
    root,
    createdAt: new Date().toISOString(),
    embedding: {
      provider: provider.provider,
      model: provider.model,
      dimensions: provider.dimensions
    },
    stats: {
      ...walked.stats,
      chunks: chunks.length
    },
    chunks
  };

  await writeIndex(outPath, index);
  return { index, outPath };
}

export function embeddingInput(chunk: SourceChunk): string {
  return [
    `path: ${chunk.path}`,
    chunk.symbol ? `symbol: ${chunk.symbol}` : undefined,
    `kind: ${chunk.kind}`,
    chunk.content
  ]
    .filter((part): part is string => Boolean(part))
    .join("\n");
}

export async function embedQueryForIndex(options: {
  query: string;
  index: SearchIndex;
  provider?: EmbeddingProviderName | "auto" | undefined;
  model?: string | undefined;
  cwd: string;
}): Promise<{ provider: EmbeddingProvider; embedding: number[] }> {
  const providerName = options.provider === "auto" || !options.provider ? options.index.embedding.provider : options.provider;
  const provider = resolveEmbeddingProvider({
    provider: providerName,
    cwd: options.cwd,
    model: options.model ?? options.index.embedding.model,
    dimensions: options.index.embedding.dimensions
  });

  return {
    provider,
    embedding: await provider.embed(options.query)
  };
}
