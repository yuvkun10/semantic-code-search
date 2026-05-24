import { readFile } from "node:fs/promises";
import path from "node:path";

import ignore from "ignore";

import { normalizeRelativePath, toPosixPath } from "./text-utils.js";

export interface IgnoreMatcher {
  ignores(relativePath: string): boolean;
}

export interface CreateIgnoreMatcherOptions {
  root: string;
  patterns?: string[];
}

export const DEFAULT_IGNORE_PATTERNS = [
  ".git/",
  ".hg/",
  ".svn/",
  "node_modules/",
  "dist/",
  "build/",
  "coverage/",
  ".semantic-code-search/",
  ".codex/",
  "Obsidian/",
  "AGENTS.md",
  ".gitignore",
  ".scsignore",
  ".DS_Store",
  ".env",
  ".env.*",
  "!.env.example",
  "*.log",
  "*.tmp"
];

export function createIgnoreMatcher(options: CreateIgnoreMatcherOptions): IgnoreMatcher {
  const matcher = ignore().add([...DEFAULT_IGNORE_PATTERNS, ...(options.patterns ?? [])]);

  return {
    ignores: (relativePath: string) => {
      const normalized = normalizeRelativePath(options.root, relativePath);
      if (normalized.length === 0) {
        return false;
      }
      return matcher.ignores(normalized);
    }
  };
}

export async function loadIgnoreMatcher(root: string, extraPatterns: string[] = []): Promise<IgnoreMatcher> {
  const patterns = [...extraPatterns];
  for (const fileName of [".gitignore", ".scsignore"]) {
    const filePath = path.join(root, fileName);
    try {
      const content = await readFile(filePath, "utf8");
      patterns.push(...content.split(/\r?\n/).map((line) => line.trim()).filter(Boolean));
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== "ENOENT") {
        throw error;
      }
    }
  }

  return createIgnoreMatcher({
    root: toPosixPath(root),
    patterns
  });
}
