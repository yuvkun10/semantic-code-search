# Operations

## Privacy and security

- The index is local by default and is written under `.semantic-code-search/`, which is ignored by git.
- The generated index contains source snippets and embeddings. Treat it as sensitive if the indexed repository is private.
- With `--provider openai`, indexed chunk text and search queries are sent to the configured OpenAI API. Use `--provider hash` when you need fully local deterministic behavior.
- Use `.gitignore` or `.scsignore` to exclude secrets, generated artifacts, vendored dependencies, private notes, and large files from indexing.
- `.env.local` is ignored by git. Keep API keys there or in your shell environment, never in tracked files.
- The web UI binds to `127.0.0.1` by default and is intended for local use.

## Dependency maintenance

Dependabot is configured for npm packages and GitHub Actions
([.github/dependabot.yml](../.github/dependabot.yml)). CI installs with `npm ci`, runs the
moderate-level audit, checks for outdated dependencies, typechecks, tests, and builds
([.github/workflows/ci.yml](../.github/workflows/ci.yml)).

`npm run deps:audit` fails on vulnerabilities at moderate severity or higher.
`npm run deps:outdated` fails when npm reports outdated direct dependencies.
