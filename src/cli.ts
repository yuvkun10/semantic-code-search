#!/usr/bin/env node

import path from "node:path";
import { pathToFileURL } from "node:url";

import { Command } from "commander";

import { DEFAULT_OPENAI_EMBEDDING_MODEL } from "./embeddings.js";
import { DEFAULT_EXPLAIN_MODEL, explainResult } from "./explain.js";
import { buildIndex, embedQueryForIndex } from "./indexer.js";
import { readIndex } from "./index-store.js";
import { rankChunks } from "./ranking.js";
import { serve } from "./server.js";
import type { EmbeddingProviderName, RankedChunk } from "./types.js";

export interface CliIo {
  cwd?: string;
  stdout?: (line: string) => void;
  stderr?: (line: string) => void;
}

export async function runCli(argv: string[], io: CliIo = {}): Promise<void> {
  const cwd = io.cwd ?? process.cwd();
  const stdout = io.stdout ?? ((line: string) => process.stdout.write(`${line}\n`));
  const stderr = io.stderr ?? ((line: string) => process.stderr.write(`${line}\n`));
  const program = new Command();

  program
    .name("semantic-code-search")
    .description("Index and search local codebases with semantic/code-token hybrid ranking.")
    .exitOverride()
    .configureOutput({
      writeOut: (value) => stdout(value.trimEnd()),
      writeErr: (value) => stderr(value.trimEnd())
    });

  program
    .command("index")
    .argument("[root]", "codebase root to index", ".")
    .option("--out <path>", "index JSON output path", ".semantic-code-search/index.json")
    .option("--provider <provider>", "embedding provider: openai or hash", "openai")
    .option("--model <model>", "embedding model", DEFAULT_OPENAI_EMBEDDING_MODEL)
    .option("--dimensions <number>", "embedding dimensions", parseInteger)
    .option("--max-file-bytes <number>", "maximum bytes per indexed file", parseInteger)
    .option("--max-total-bytes <number>", "maximum total bytes indexed", parseInteger)
    .option("--max-files <number>", "maximum files indexed", parseInteger)
    .option("--max-chunk-lines <number>", "maximum lines per fallback file chunk", parseInteger)
    .action(async (root: string, options: Record<string, unknown>) => {
      const result = await buildIndex({
        root,
        out: stringOption(options.out),
        provider: providerOption(options.provider, ["openai", "hash"]),
        model: stringOption(options.model),
        dimensions: numberOption(options.dimensions),
        maxFileBytes: numberOption(options.maxFileBytes),
        maxTotalBytes: numberOption(options.maxTotalBytes),
        maxFiles: numberOption(options.maxFiles),
        maxChunkLines: numberOption(options.maxChunkLines),
        cwd
      });
      stdout(
        `Indexed ${result.index.stats.filesIndexed} files into ${result.index.stats.chunks} chunks at ${path.relative(cwd, result.outPath) || result.outPath}`
      );
    });

  program
    .command("search")
    .argument("<query>", "search query")
    .option("--index <path>", "index JSON path", ".semantic-code-search/index.json")
    .option("--provider <provider>", "query embedding provider: auto, openai, or hash", "auto")
    .option("--model <model>", "embedding model override")
    .option("--limit <number>", "maximum result count", parseInteger, 10)
    .option("--semantic-weight <number>", "semantic score weight from 0 to 1", parseFloatOption, 0.72)
    .option("--json", "emit JSON")
    .action(async (query: string, options: Record<string, unknown>) => {
      const ranked = await searchIndex({ query, options, cwd });
      const limited = ranked.slice(0, numberOption(options.limit) ?? 10);
      if (options.json) {
        stdout(JSON.stringify(limited.map(toJsonResult), null, 2));
        return;
      }
      stdout(formatSearchResults(limited));
    });

  program
    .command("explain")
    .argument("<query>", "search query")
    .option("--index <path>", "index JSON path", ".semantic-code-search/index.json")
    .option("--provider <provider>", "query embedding provider: auto, openai, or hash", "auto")
    .option("--rank <number>", "1-based search result rank to explain", parseInteger, 1)
    .option("--model <model>", "OpenAI explanation model", DEFAULT_EXPLAIN_MODEL)
    .option("--semantic-weight <number>", "semantic score weight from 0 to 1", parseFloatOption, 0.72)
    .option("--ai", "use the OpenAI Responses API for the explanation")
    .option("--no-ai", "force a local deterministic explanation")
    .action(async (query: string, options: Record<string, unknown>) => {
      const ranked = await searchIndex({ query, options, cwd });
      const selected = ranked[(numberOption(options.rank) ?? 1) - 1];
      if (!selected) {
        throw new Error("No search result exists at that rank");
      }
      stdout(
        await explainResult({
          query,
          ranked: selected,
          ai: options.ai === true,
          model: stringOption(options.model),
          cwd
        })
      );
    });

  program
    .command("serve")
    .option("--index <path>", "index JSON path", ".semantic-code-search/index.json")
    .option("--provider <provider>", "query embedding provider: auto, openai, or hash", "auto")
    .option("--host <host>", "host", "127.0.0.1")
    .option("--port <number>", "port", parseInteger, 4317)
    .action(async (options: Record<string, unknown>) => {
      const server = await serve({
        indexPath: path.resolve(cwd, stringOption(options.index) ?? ".semantic-code-search/index.json"),
        cwd,
        host: stringOption(options.host),
        port: numberOption(options.port),
        provider: providerOption(options.provider, ["auto", "openai", "hash"])
      });
      stdout(`Local UI: ${server.url}`);
    });

  await program.parseAsync(argv, { from: "user" });
}

async function searchIndex(options: {
  query: string;
  options: Record<string, unknown>;
  cwd: string;
}): Promise<RankedChunk[]> {
  const indexPath = path.resolve(options.cwd, stringOption(options.options.index) ?? ".semantic-code-search/index.json");
  const index = await readIndex(indexPath);
  const { embedding } = await embedQueryForIndex({
    query: options.query,
    index,
    provider: providerOption(options.options.provider, ["auto", "openai", "hash"]),
    model: stringOption(options.options.model),
    cwd: options.cwd
  });

  return rankChunks({
    query: options.query,
    queryEmbedding: embedding,
    chunks: index.chunks,
    semanticWeight: numberOption(options.options.semanticWeight)
  });
}

function formatSearchResults(results: RankedChunk[]): string {
  if (results.length === 0) {
    return "No results.";
  }

  return results
    .map((result, index) => {
      const symbol = result.chunk.symbol ? ` ${result.chunk.symbol}` : "";
      return [
        `${index + 1}. ${result.chunk.path}:${result.chunk.startLine}-${result.chunk.endLine} ${result.chunk.kind}${symbol}`,
        `   score ${result.score.toFixed(3)} semantic ${result.semanticScore.toFixed(3)} token ${result.tokenScore.toFixed(3)}`,
        indent(result.snippet, "   ")
      ].join("\n");
    })
    .join("\n\n");
}

function toJsonResult(result: RankedChunk): Record<string, unknown> {
  return {
    path: result.chunk.path,
    startLine: result.chunk.startLine,
    endLine: result.chunk.endLine,
    kind: result.chunk.kind,
    symbol: result.chunk.symbol,
    score: result.score,
    semanticScore: result.semanticScore,
    tokenScore: result.tokenScore,
    snippet: result.snippet
  };
}

function indent(value: string, prefix: string): string {
  return value
    .split("\n")
    .map((line) => `${prefix}${line}`)
    .join("\n");
}

function providerOption<T extends string>(value: unknown, allowed: readonly T[]): T | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  if (!allowed.includes(value as T)) {
    throw new Error(`Invalid provider "${value}". Expected one of: ${allowed.join(", ")}`);
  }
  return value as T;
}

function stringOption(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function numberOption(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function parseInteger(value: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid integer: ${value}`);
  }
  return parsed;
}

function parseFloatOption(value: string): number {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid number: ${value}`);
  }
  return parsed;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli(process.argv.slice(2)).catch((error: unknown) => {
    process.stderr.write(`${(error as Error).message}\n`);
    process.exitCode = 1;
  });
}
