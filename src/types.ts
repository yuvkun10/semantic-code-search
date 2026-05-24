export type ChunkKind = "function" | "class" | "method" | "file";

export type EmbeddingProviderName = "openai" | "hash";

export interface SourceChunk {
  id: string;
  path: string;
  kind: ChunkKind;
  language: string;
  symbol?: string;
  startLine: number;
  endLine: number;
  content: string;
  hash: string;
  tokenCount: number;
}

export interface IndexedChunk extends SourceChunk {
  embedding: number[];
}

export interface SearchIndex {
  schemaVersion: number;
  root: string;
  createdAt: string;
  embedding: {
    provider: EmbeddingProviderName;
    model: string;
    dimensions: number;
  };
  stats: {
    filesScanned: number;
    filesIndexed: number;
    filesSkipped: number;
    chunks: number;
    bytesIndexed: number;
  };
  chunks: IndexedChunk[];
}

export interface RankedChunk {
  chunk: IndexedChunk;
  score: number;
  semanticScore: number;
  tokenScore: number;
  snippet: string;
}

export interface CodeFile {
  path: string;
  absolutePath: string;
  content: string;
  bytes: number;
}

export interface WalkStats {
  filesScanned: number;
  filesIndexed: number;
  filesSkipped: number;
  bytesIndexed: number;
}
