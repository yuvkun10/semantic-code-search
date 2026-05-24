import OpenAI from "openai";

import { loadLocalEnv } from "./env.js";
import type { RankedChunk } from "./types.js";

export const DEFAULT_EXPLAIN_MODEL = "gpt-5.5";

export interface ExplainResultOptions {
  query: string;
  ranked: RankedChunk;
  ai: boolean;
  model?: string | undefined;
  cwd: string;
}

export async function explainResult(options: ExplainResultOptions): Promise<string> {
  if (!options.ai) {
    return [
      `Selected result: ${options.ranked.chunk.path}:${options.ranked.chunk.startLine}-${options.ranked.chunk.endLine}`,
      `Score: ${options.ranked.score.toFixed(3)} (semantic ${options.ranked.semanticScore.toFixed(3)}, token ${options.ranked.tokenScore.toFixed(3)})`,
      `The selected ${options.ranked.chunk.kind} chunk matches the query "${options.query}" through the ranked semantic/code-token signals.`,
      "",
      options.ranked.snippet
    ].join("\n");
  }

  loadLocalEnv(options.cwd);
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required for --ai explanations. Add it to .env.local or omit --ai.");
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const model = options.model ?? process.env.OPENAI_EXPLAIN_MODEL ?? DEFAULT_EXPLAIN_MODEL;
  const response = await client.responses.create({
    model,
    input: [
      "Explain why this code search result is relevant. Be concise and practical.",
      `Query: ${options.query}`,
      `Path: ${options.ranked.chunk.path}:${options.ranked.chunk.startLine}-${options.ranked.chunk.endLine}`,
      `Kind: ${options.ranked.chunk.kind}`,
      options.ranked.chunk.symbol ? `Symbol: ${options.ranked.chunk.symbol}` : "",
      "Code:",
      options.ranked.chunk.content
    ]
      .filter(Boolean)
      .join("\n")
  });

  return response.output_text ?? "The model returned no explanation text.";
}
