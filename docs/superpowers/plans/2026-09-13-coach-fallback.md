# Coach free fallback Implementation Plan

> Execute inline in this session. Review the plan and verify provider behavior with mocked HTTP responses before delivery.

**Goal:** Keep Gemini as the Coach's primary provider and optionally use OpenRouter's free router after a transient provider failure.

**Architecture:** Wrap only generation, including output validation, in a two-provider attempt function. Read-only tools may replay; the existing route persists messages, drafts and proposals once after generation succeeds. The fallback is disabled without a key and its model is fixed to `openrouter/free` to preserve the user's zero-cost requirement. When configured, each provider has a 60-second deadline within the existing 120-second generation budget. Without a fallback, preserve the existing 120-second timeout and one retry.

**Tech Stack:** TypeScript, Vercel AI SDK, Google provider, OpenRouter-compatible provider, node:test.

- [x] Add `server/src/training/coach-fallback.ts` and `server/tests/coach-fallback.test.ts`. Test primary success, 429/5xx/network/timeout fallback, non-transient errors, absent fallback and both providers failing. Use actual SDK HTTP errors and provider serialization, including tools and structured output.
- [x] Add the compatible provider dependency in `server/package.json` and lockfile. Add optional `OPENROUTER_API_KEY` to `server/src/env.ts`, both env examples and `docker-compose.yml`.
- [x] Update `server/src/training/assistant.ts` to replay only generation with the same context and tools, validate output inside each attempt and preserve test model overrides. Do not wrap database reads or writes in failover.
- [x] Run `cd server && npm test` and `npm run typecheck`; document any environment-dependent integration checks. Update `docs/training-companion.md` with configuration, behavior and limits. Do not deploy or claim a live fallback was verified.

Verification: 21 isolated tests pass, including actual SDK serialization with mocked Gemini 429 and OpenRouter tool calls, rejected invalid output and timeout budgets. Server typecheck passes. The full test command stops at the integration guard because no disposable `matlog_companion_test` database is configured. No live provider request or deployment was performed. Fallback activation requires an OpenRouter key.
