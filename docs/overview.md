# Audience and use cases

A query like "where invoices are deduplicated" can surface relevant functions, classes,
file chunks, and snippets even when the code uses different wording. Use
`--provider hash` for deterministic offline demos and tests, or the default OpenAI
provider for real semantic search over your own codebase.

## Who it is for

- Engineers joining an unfamiliar repository who need to find the right entry points quickly.
- Maintainers planning refactors who need to trace related code across files and naming conventions.
- Staff and platform engineers reviewing ownership boundaries, hidden coupling, or repeated patterns.
- Tech leads answering implementation questions without building a full hosted code intelligence stack.
- AI-assisted development workflows that need a local, inspectable code index before asking for changes.

## Real-world use cases

- Onboarding: search for "where login sessions are refreshed" or "how invoices are imported" before reading every route and service.
- Refactoring: find chunks related to "legacy CSV parsing", "retry policy", or "permission checks" even when the identifiers are inconsistent.
- Incident response: locate the code path for "webhook signature validation" or "background job dead letter handling" under time pressure.
- Architecture review: inspect how a domain concept appears across CLI commands, services, tests, and shared utilities.
- Pairing with AI tools: create a focused local index, search it, then pass only the relevant files and snippets into a coding session.
