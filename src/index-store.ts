import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { SearchIndex } from "./types.js";

export const INDEX_SCHEMA_VERSION = 1;

export async function writeIndex(indexPath: string, index: SearchIndex): Promise<void> {
  await mkdir(path.dirname(indexPath), { recursive: true });
  await writeFile(indexPath, `${JSON.stringify(index, null, 2)}\n`, "utf8");
}

export async function readIndex(indexPath: string): Promise<SearchIndex> {
  const parsed = JSON.parse(await readFile(indexPath, "utf8")) as SearchIndex;
  validateIndex(parsed, indexPath);
  return parsed;
}

function validateIndex(index: SearchIndex, indexPath: string): void {
  if (index.schemaVersion !== INDEX_SCHEMA_VERSION) {
    throw new Error(`Unsupported index schema in ${indexPath}: ${index.schemaVersion}`);
  }
  if (!Array.isArray(index.chunks)) {
    throw new Error(`Invalid index in ${indexPath}: chunks must be an array`);
  }
  if (!index.embedding || typeof index.embedding.dimensions !== "number") {
    throw new Error(`Invalid index in ${indexPath}: missing embedding metadata`);
  }
}
