# Semantic Code Search

A production-grade TypeScript CLI that indexes a local codebase with OpenAI embeddings and searches it with a semantic plus code-token hybrid ranker.

## Features

- `index` walks a repository safely, applies ignore rules, chunks functions and files, and writes a portable JSON embedding index.
- `search` ranks indexed chunks with cosine similarity and code-token matching, then prints paths and snippets.
- `explain` selects a search result and can ask an OpenAI model to explain why the code matches the query.
- `serve` starts an optional local-only web UI for searching an existing index.
- Tests use deterministic hash embeddings, so CI does not need an API key.

## Setup

```bash
npm install
cp .env.example .env.local
```

Set `OPENAI_API_KEY` in `.env.local` for real embedding and AI explanation calls. The default embedding model is `text-embedding-3-small`.

## Usage

```bash
npm run build
npx semantic-code-search index . --out .semantic-code-search/index.json
npx semantic-code-search search "where invoices are deduplicated" --index .semantic-code-search/index.json
npx semantic-code-search explain "where invoices are deduplicated" --index .semantic-code-search/index.json --ai
npx semantic-code-search serve --index .semantic-code-search/index.json
```

For deterministic local tests or offline demos, pass `--provider hash` to `index`, `search`, and `explain`.

## Ignore Rules And Safety

The walker always skips heavy or unsafe directories such as `.git`, `node_modules`, `dist`, `coverage`, and `.semantic-code-search`. It also reads `.gitignore` and `.scsignore` from the indexed root. Files are capped by size and total indexed bytes, binary files are skipped, and symlinks are ignored by default.

## Commands

```bash
semantic-code-search index [root]
semantic-code-search search <query>
semantic-code-search explain <query>
semantic-code-search serve
```

Run `semantic-code-search <command> --help` for command-specific options.
