# Semantic Code Search

Semantic Code Search is a TypeScript CLI for indexing a local repository and finding
code by meaning as well as by exact text. It combines OpenAI embeddings with code-token
overlap, writes a local JSON index, and can serve a local web UI. A deterministic hash
provider runs fully offline for demos and tests. Version 0.1.0.

## Installation

Requirements: Node.js 20 or newer and npm. An OpenAI API key is needed only for real
embeddings and `explain --ai`.

```bash
npm install
cp .env.example .env.local
npm run build
```

Environment variables: `OPENAI_API_KEY`, `OPENAI_EMBEDDING_MODEL`,
`OPENAI_EXPLAIN_MODEL`. See [docs/configuration.md](docs/configuration.md).

## Usage

```bash
npx semantic-code-search index . --out .semantic-code-search/index.json
npx semantic-code-search index . --provider hash --out .semantic-code-search/index.json
npx semantic-code-search search "where invoices are deduplicated" --index .semantic-code-search/index.json
npx semantic-code-search search "retry failed webhooks" --json
npx semantic-code-search explain "where invoices are deduplicated" --rank 1
npx semantic-code-search explain "where invoices are deduplicated" --rank 1 --ai
npx semantic-code-search serve --index .semantic-code-search/index.json
```

The first `index` line uses OpenAI embeddings; `--provider hash` makes no network calls.
`serve` starts the local web UI. `npm run dev` runs the CLI from source with tsx. There
is no deployment setup in this repository.

## Project structure

```text
├── src
│   ├── cli.ts
│   ├── walker.ts
│   ├── ignore-rules.ts
│   ├── chunker.ts
│   ├── embeddings.ts
│   ├── indexer.ts
│   ├── ranking.ts
│   ├── index-store.ts
│   ├── explain.ts
│   └── server.ts
├── tests
├── docs
│   ├── architecture.md
│   └── archive
├── .env.example
├── package.json
├── tsconfig.json
└── tsconfig.build.json
```

How the pieces fit together: [docs/architecture.md](docs/architecture.md).

## Coding style

TypeScript runs in `strict` mode and CI typechecks on pushes to `main` and on pull
requests. No linter, formatter or commit convention is configured.

```bash
npm run typecheck
```

## Test

```bash
npm test
npm run deps:audit
npm run deps:outdated
```

Vitest covers chunking, ignore rules, ranking, index storage and CLI behavior. The two
`deps:` scripts fail on moderate or higher advisories and on outdated direct
dependencies; CI runs both.

## Documentation

- [docs/README.md](docs/README.md): index of all docs
- [docs/architecture.md](docs/architecture.md): indexing, chunking, ranking and modules
- [docs/overview.md](docs/overview.md): audience and use cases
- [docs/configuration.md](docs/configuration.md): environment variables and flags
- [docs/operations.md](docs/operations.md): privacy, security and dependency maintenance

## License

MIT. See [LICENSE](LICENSE).
