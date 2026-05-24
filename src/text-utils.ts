import crypto from "node:crypto";
import path from "node:path";

export function toPosixPath(value: string): string {
  return value.replaceAll(path.sep, "/").replaceAll("\\", "/");
}

export function normalizeRelativePath(root: string, target: string): string {
  const relative = path.isAbsolute(target) ? path.relative(root, target) : target;
  return toPosixPath(relative).replace(/^\.?\//, "");
}

export function sha256(value: string | Buffer): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function splitLines(content: string): string[] {
  if (content.length === 0) {
    return [""];
  }
  return content.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
}

export function languageFromPath(filePath: string): string {
  const extension = path.extname(filePath).toLowerCase();
  const languages: Record<string, string> = {
    ".c": "c",
    ".cc": "cpp",
    ".cpp": "cpp",
    ".cs": "csharp",
    ".css": "css",
    ".go": "go",
    ".html": "html",
    ".java": "java",
    ".js": "javascript",
    ".jsx": "javascript",
    ".json": "json",
    ".md": "markdown",
    ".php": "php",
    ".py": "python",
    ".rb": "ruby",
    ".rs": "rust",
    ".scss": "scss",
    ".sh": "shell",
    ".sql": "sql",
    ".svelte": "svelte",
    ".swift": "swift",
    ".ts": "typescript",
    ".tsx": "typescript",
    ".vue": "vue",
    ".yaml": "yaml",
    ".yml": "yaml"
  };

  return languages[extension] ?? (extension.replace(/^\./, "") || "text");
}

export function tokenizeCode(value: string): string[] {
  const spaced = value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_./\\:-]+/g, " ")
    .toLowerCase();
  return spaced.match(/[a-z0-9]+/g) ?? [];
}

export function countTokens(value: string): number {
  return tokenizeCode(value).length;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function isLikelyBinary(buffer: Buffer): boolean {
  if (buffer.includes(0)) {
    return true;
  }

  const sampleLength = Math.min(buffer.length, 8192);
  let suspicious = 0;
  for (let index = 0; index < sampleLength; index += 1) {
    const byte = buffer[index];
    if (byte === undefined) {
      continue;
    }
    const isControl = byte < 7 || (byte > 13 && byte < 32);
    if (isControl) {
      suspicious += 1;
    }
  }

  return sampleLength > 0 && suspicious / sampleLength > 0.08;
}
