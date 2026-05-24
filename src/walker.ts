import { opendir, readFile } from "node:fs/promises";
import path from "node:path";

import { loadIgnoreMatcher, type IgnoreMatcher } from "./ignore-rules.js";
import { isLikelyBinary, normalizeRelativePath } from "./text-utils.js";
import type { CodeFile, WalkStats } from "./types.js";

export interface WalkCodebaseOptions {
  root: string;
  maxFileBytes?: number | undefined;
  maxTotalBytes?: number | undefined;
  maxFiles?: number | undefined;
  matcher?: IgnoreMatcher | undefined;
}

export interface WalkCodebaseResult {
  files: CodeFile[];
  stats: WalkStats;
}

const DEFAULT_MAX_FILE_BYTES = 250_000;
const DEFAULT_MAX_TOTAL_BYTES = 25_000_000;
const DEFAULT_MAX_FILES = 10_000;

export async function walkCodebase(options: WalkCodebaseOptions): Promise<WalkCodebaseResult> {
  const root = path.resolve(options.root);
  const matcher = options.matcher ?? (await loadIgnoreMatcher(root));
  const maxFileBytes = options.maxFileBytes ?? DEFAULT_MAX_FILE_BYTES;
  const maxTotalBytes = options.maxTotalBytes ?? DEFAULT_MAX_TOTAL_BYTES;
  const maxFiles = options.maxFiles ?? DEFAULT_MAX_FILES;
  const files: CodeFile[] = [];
  const stats: WalkStats = {
    filesScanned: 0,
    filesIndexed: 0,
    filesSkipped: 0,
    bytesIndexed: 0
  };

  await visitDirectory(root);
  return { files, stats };

  async function visitDirectory(directory: string): Promise<void> {
    const entries = await opendir(directory);
    for await (const entry of entries) {
      const absolutePath = path.join(directory, entry.name);
      const relativePath = normalizeRelativePath(root, absolutePath);

      if (entry.isSymbolicLink()) {
        stats.filesSkipped += 1;
        continue;
      }

      if (entry.isDirectory()) {
        if (matcher.ignores(`${relativePath}/`)) {
          continue;
        }
        await visitDirectory(absolutePath);
        continue;
      }

      if (!entry.isFile()) {
        stats.filesSkipped += 1;
        continue;
      }

      stats.filesScanned += 1;
      if (files.length >= maxFiles || matcher.ignores(relativePath)) {
        stats.filesSkipped += 1;
        continue;
      }

      const buffer = await readFile(absolutePath);
      if (
        buffer.byteLength > maxFileBytes ||
        stats.bytesIndexed + buffer.byteLength > maxTotalBytes ||
        isLikelyBinary(buffer)
      ) {
        stats.filesSkipped += 1;
        continue;
      }

      files.push({
        path: relativePath,
        absolutePath,
        content: buffer.toString("utf8"),
        bytes: buffer.byteLength
      });
      stats.filesIndexed += 1;
      stats.bytesIndexed += buffer.byteLength;
    }
  }
}
