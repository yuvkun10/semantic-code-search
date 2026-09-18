# Configuration

Create local configuration from the template:

```bash
cp .env.example .env.local
```

Set `OPENAI_API_KEY` in `.env.local` if you use `--provider openai` or `explain --ai`. Do
not commit `.env.local`. For offline testing or demos, skip the API key and pass
`--provider hash`.

## Environment variables

[`.env.example`](../.env.example) documents the supported local environment variables:

| Variable | Required | Purpose |
| --- | --- | --- |
| `OPENAI_API_KEY` | For OpenAI embeddings and `--ai` explanations | API key used by the OpenAI SDK. |
| `OPENAI_EMBEDDING_MODEL` | No | Embedding model override. Defaults to `text-embedding-3-small`. |
| `OPENAI_EXPLAIN_MODEL` | No | Responses API model used by `explain --ai`. |

## Runtime flags

Runtime flags can override index output, provider, model, dimensions, chunk size, byte
limits, search limit, ranking weight, server host, and server port. Run command-specific
help for the full option list:

```bash
npx semantic-code-search index --help
npx semantic-code-search search --help
npx semantic-code-search explain --help
npx semantic-code-search serve --help
```
