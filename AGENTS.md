# AGENTS.md

Semantic Code Search is a TypeScript CLI that indexes a local repository and finds code by meaning and exact text, with a local JSON index, an optional web UI and an offline hash provider.

## Setup

Node.js 20 or newer and npm.

```bash
npm install
cp .env.example .env.local
npm run build
```

Variables: `OPENAI_API_KEY`, `OPENAI_EMBEDDING_MODEL`, `OPENAI_EXPLAIN_MODEL`. A key is needed only for real embeddings and `explain --ai`. See [docs/configuration.md](docs/configuration.md).

## Commands

```bash
npm run build          # tsc -p tsconfig.build.json
npm run typecheck      # tsc -p tsconfig.json --noEmit
npm test               # vitest run
npm run deps:audit     # npm audit --audit-level=moderate
npm run deps:outdated  # npm outdated
npm run dev            # tsx src/cli.ts
```

Use `--provider hash` for index runs that make no network calls.

## Project structure

- `src/cli.ts`: commands `index`, `search`, `explain`, `serve`.
- `src/walker.ts`, `src/ignore-rules.ts`, `src/chunker.ts`: file walk, ignore rules, chunking.
- `src/embeddings.ts`, `src/hash-embedding.ts`, `src/ranking.ts`: embeddings and ranking.
- `src/index-store.ts`, `src/indexer.ts`, `src/server.ts`, `src/explain.ts`.
- `tests/`: Vitest suites.

Details are in [docs/architecture.md](docs/architecture.md).

## Conventions

- TypeScript `strict`. No linter, formatter or commit convention is configured. Do not add attribution trailers.
- `DEFAULT_IGNORE_PATTERNS` in `src/ignore-rules.ts` skips `AGENTS.md` and other private files in indexed repositories. Keep that behavior unless the task is to change it.

## Testing

Before a PR run typecheck, test, `deps:audit`, `deps:outdated` and build. CI runs the same on pushes to `main` and on pull requests.

## Safety

- Never commit `.env` or `.env.local` files, API keys or `.semantic-code-search/` indexes.
- Tests must stay offline. Use the hash provider in tests.

## More

- [docs/README.md](docs/README.md): docs index
- [docs/operations.md](docs/operations.md): privacy, security and dependency maintenance
