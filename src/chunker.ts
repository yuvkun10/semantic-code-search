import type { SourceChunk } from "./types.js";
import {
  countTokens,
  languageFromPath,
  sha256,
  splitLines
} from "./text-utils.js";

export interface ChunkSourceFileOptions {
  relativePath: string;
  content: string;
  maxChunkLines?: number | undefined;
}

interface Candidate {
  kind: SourceChunk["kind"];
  symbol: string;
  startLine: number;
  endLine: number;
}

const DEFAULT_MAX_CHUNK_LINES = 160;

export function chunkSourceFile(options: ChunkSourceFileOptions): SourceChunk[] {
  const maxChunkLines = Math.max(1, options.maxChunkLines ?? DEFAULT_MAX_CHUNK_LINES);
  const lines = splitLines(options.content);
  const candidates = findStructuralCandidates(lines);

  if (candidates.length > 0) {
    return candidates.map((candidate) =>
      createChunk({
        relativePath: options.relativePath,
        lines,
        kind: candidate.kind,
        symbol: candidate.symbol,
        startLine: candidate.startLine,
        endLine: candidate.endLine
      })
    );
  }

  const chunks: SourceChunk[] = [];
  for (let startIndex = 0; startIndex < lines.length; startIndex += maxChunkLines) {
    const endIndex = Math.min(startIndex + maxChunkLines, lines.length);
    chunks.push(
      createChunk({
        relativePath: options.relativePath,
        lines,
        kind: "file",
        startLine: startIndex + 1,
        endLine: endIndex
      })
    );
  }

  return chunks;
}

function findStructuralCandidates(lines: string[]): Candidate[] {
  const candidates: Candidate[] = [];
  const occupied = new Set<number>();

  for (let index = 0; index < lines.length; index += 1) {
    const lineNumber = index + 1;
    if (occupied.has(lineNumber)) {
      continue;
    }

    const line = lines[index] ?? "";
    const candidate = parseCandidate(line);
    if (!candidate) {
      continue;
    }

    const endLine = findBlockEnd(lines, index);
    for (let used = lineNumber; used <= endLine; used += 1) {
      occupied.add(used);
    }
    candidates.push({
      ...candidate,
      startLine: lineNumber,
      endLine
    });
  }

  return candidates;
}

function parseCandidate(line: string): Pick<Candidate, "kind" | "symbol"> | undefined {
  const trimmed = line.trim();
  const classMatch = trimmed.match(/^(?:export\s+)?(?:default\s+)?(?:abstract\s+)?class\s+([A-Za-z_$][\w$]*)\b/);
  if (classMatch?.[1]) {
    return { kind: "class", symbol: classMatch[1] };
  }

  const functionMatch = trimmed.match(/^(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\b/);
  if (functionMatch?.[1]) {
    return { kind: "function", symbol: functionMatch[1] };
  }

  const arrowMatch = trimmed.match(/^(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>/);
  if (arrowMatch?.[1]) {
    return { kind: "function", symbol: arrowMatch[1] };
  }

  const pythonMatch = trimmed.match(/^(?:async\s+)?def\s+([A-Za-z_][\w]*)\s*\(/);
  if (pythonMatch?.[1]) {
    return { kind: "function", symbol: pythonMatch[1] };
  }

  const goMatch = trimmed.match(/^func\s+(?:\([^)]*\)\s*)?([A-Za-z_][\w]*)\s*\(/);
  if (goMatch?.[1]) {
    return { kind: "function", symbol: goMatch[1] };
  }

  return undefined;
}

function findBlockEnd(lines: string[], startIndex: number): number {
  let braceDepth = 0;
  let sawBrace = false;
  const startIndent = indentation(lines[startIndex] ?? "");

  for (let index = startIndex; index < lines.length; index += 1) {
    const sanitized = stripInlineNoise(lines[index] ?? "");
    for (const char of sanitized) {
      if (char === "{") {
        braceDepth += 1;
        sawBrace = true;
      } else if (char === "}") {
        braceDepth -= 1;
      }
    }

    if (sawBrace && braceDepth <= 0) {
      return index + 1;
    }

    if (!sawBrace && index > startIndex) {
      const line = lines[index] ?? "";
      if (line.trim().length > 0 && indentation(line) <= startIndent) {
        return index;
      }
    }
  }

  return lines.length;
}

function indentation(line: string): number {
  return line.match(/^\s*/)?.[0].length ?? 0;
}

function stripInlineNoise(line: string): string {
  return line
    .replace(/\/\/.*$/g, "")
    .replace(/#.*$/g, "")
    .replace(/(['"`])(?:\\.|(?!\1).)*\1/g, "");
}

function createChunk(options: {
  relativePath: string;
  lines: string[];
  kind: SourceChunk["kind"];
  symbol?: string;
  startLine: number;
  endLine: number;
}): SourceChunk {
  const content = options.lines.slice(options.startLine - 1, options.endLine).join("\n").trimEnd();
  const hash = sha256(content);
  const chunk: SourceChunk = {
    id: `${options.relativePath}#${options.startLine}-${options.endLine}-${hash.slice(0, 12)}`,
    path: options.relativePath,
    kind: options.kind,
    language: languageFromPath(options.relativePath),
    startLine: options.startLine,
    endLine: options.endLine,
    content,
    hash,
    tokenCount: countTokens(content)
  };

  if (options.symbol) {
    chunk.symbol = options.symbol;
  }

  return chunk;
}
