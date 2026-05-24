import http from "node:http";
import { URL } from "node:url";

import { explainResult } from "./explain.js";
import { readIndex } from "./index-store.js";
import { embedQueryForIndex } from "./indexer.js";
import { rankChunks } from "./ranking.js";
import type { EmbeddingProviderName } from "./types.js";

export interface ServeOptions {
  indexPath: string;
  cwd: string;
  host?: string | undefined;
  port?: number | undefined;
  provider?: EmbeddingProviderName | "auto" | undefined;
}

export async function serve(options: ServeOptions): Promise<{ url: string; close: () => Promise<void> }> {
  const host = options.host ?? "127.0.0.1";
  const port = options.port ?? 4317;
  const index = await readIndex(options.indexPath);

  const server = http.createServer(async (request, response) => {
    try {
      const requestUrl = new URL(request.url ?? "/", `http://${host}:${port}`);
      if (requestUrl.pathname === "/") {
        send(response, 200, "text/html; charset=utf-8", renderHtml());
        return;
      }

      if (requestUrl.pathname === "/api/search") {
        const query = requestUrl.searchParams.get("q") ?? "";
        const limit = Number(requestUrl.searchParams.get("limit") ?? "10");
        const { embedding } = await embedQueryForIndex({
          query,
          index,
          provider: options.provider,
          cwd: options.cwd
        });
        const results = rankChunks({ query, queryEmbedding: embedding, chunks: index.chunks })
          .slice(0, limit)
          .map((ranked) => ({
            path: ranked.chunk.path,
            startLine: ranked.chunk.startLine,
            endLine: ranked.chunk.endLine,
            kind: ranked.chunk.kind,
            symbol: ranked.chunk.symbol,
            score: ranked.score,
            snippet: ranked.snippet
          }));
        send(response, 200, "application/json; charset=utf-8", JSON.stringify(results));
        return;
      }

      if (requestUrl.pathname === "/api/explain") {
        const query = requestUrl.searchParams.get("q") ?? "";
        const rank = Math.max(1, Number(requestUrl.searchParams.get("rank") ?? "1"));
        const { embedding } = await embedQueryForIndex({
          query,
          index,
          provider: options.provider,
          cwd: options.cwd
        });
        const ranked = rankChunks({ query, queryEmbedding: embedding, chunks: index.chunks })[rank - 1];
        if (!ranked) {
          send(response, 404, "application/json; charset=utf-8", JSON.stringify({ error: "No result at that rank" }));
          return;
        }
        const explanation = await explainResult({ query, ranked, ai: false, cwd: options.cwd });
        send(response, 200, "application/json; charset=utf-8", JSON.stringify({ explanation }));
        return;
      }

      send(response, 404, "text/plain; charset=utf-8", "Not found");
    } catch (error) {
      send(response, 500, "application/json; charset=utf-8", JSON.stringify({ error: (error as Error).message }));
    }
  });

  await new Promise<void>((resolve) => server.listen(port, host, resolve));

  return {
    url: `http://${host}:${port}`,
    close: () => new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))
  };
}

function send(response: http.ServerResponse, status: number, contentType: string, body: string): void {
  response.writeHead(status, {
    "content-type": contentType,
    "cache-control": "no-store"
  });
  response.end(body);
}

function renderHtml(): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Semantic Code Search</title>
  <style>
    body { margin: 0; font: 14px/1.4 system-ui, sans-serif; background: #f7f7f4; color: #202124; }
    main { max-width: 1100px; margin: 0 auto; padding: 24px; }
    form { display: flex; gap: 8px; margin-bottom: 16px; }
    input { flex: 1; padding: 10px 12px; border: 1px solid #b8b8ad; border-radius: 6px; font: inherit; }
    button { padding: 10px 14px; border: 1px solid #202124; border-radius: 6px; background: #202124; color: white; font: inherit; cursor: pointer; }
    article { border-top: 1px solid #d8d8d0; padding: 14px 0; }
    h1 { font-size: 24px; margin: 0 0 16px; }
    h2 { font-size: 15px; margin: 0 0 8px; }
    pre { overflow: auto; padding: 12px; background: #101214; color: #f3f3ef; border-radius: 6px; }
    .meta { color: #5d625f; margin-bottom: 8px; }
  </style>
</head>
<body>
  <main>
    <h1>Semantic Code Search</h1>
    <form id="search-form">
      <input id="query" name="q" placeholder="Search the indexed codebase" autocomplete="off" autofocus>
      <button>Search</button>
    </form>
    <section id="results"></section>
  </main>
  <script>
    const form = document.querySelector("#search-form");
    const results = document.querySelector("#results");
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const query = new FormData(form).get("q");
      const response = await fetch("/api/search?q=" + encodeURIComponent(query));
      const data = await response.json();
      results.innerHTML = data.map((item) => \`
        <article>
          <h2>\${item.path}:\${item.startLine}-\${item.endLine}</h2>
          <div class="meta">\${item.kind} \${item.symbol ? " " + item.symbol : ""} score \${item.score.toFixed(3)}</div>
          <pre>\${escapeHtml(item.snippet)}</pre>
        </article>
      \`).join("");
    });
    function escapeHtml(value) {
      return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
    }
  </script>
</body>
</html>`;
}
