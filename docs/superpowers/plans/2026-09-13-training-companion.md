# Training companion implementation plan

> **For agentic workers:** Execute the tasks below in order, checking each block before committing. The user authorized full implementation and incremental commits; push only after completion. The referenced superpowers execution skills are not installed, so execution stays in this session.

**Goal:** Turn Mat Log into a conversational training companion with persistent drafts, complete searchable chat history, confirmed profile/goals/gameplans, personal technique progression and a sourced exploration catalog.

**Architecture:** Keep Hono/Drizzle/Postgres and React Query. Add validated JSON documents for profiles, drafts and gameplan branches in user-owned relational tables. All model output is untrusted, validated and proposed; explicit confirmation endpoints apply changes transactionally with revision checks. Drafts never contribute to statistics. Historical chat retrieval is a read-only AI tool without a date cutoff. Reuse Gemini for audio transcription and structured coach responses.

**Tech stack:** Existing React 19, shadcn Base UI, TanStack Query, Hono, Drizzle, Postgres, Gemini/AI SDK, Zod, native MediaRecorder and node:test.

## Confirmed scope

Voice/text entries produce editable persistent drafts with optional unanswered questions. Confirmation unlocks seen/practiced/applied techniques without implying membership in a gameplan. Unknown values remain unknown. Existing data is preserved. Coach conversations remain browsable and searchable across all time. Profile captures optional measurements/preferences, belt dates and pauses. Separate gi/no-gi gameplans have confirmed and suggested branches and active goals. Today shows the selected modality's goal/action, last focus, techniques and drafts. Explore uses the public-domain GrappleMap dataset and curated starter entries, and links to Submission Searcher and BJJ Mental Models without copying unlicensed content. Backup/restore covers all personal data, including chat.

## Task 1: Domain and persistence
- [x] Create `src/lib/training.ts` shared types and pure statistics; `server/src/training/validation.ts` Zod schemas.
- [x] Extend `server/src/db/schema.ts`; generate an additive migration preserving old chats and techniques.
- [x] Implement `server/src/routes/training.ts` profile/goals/gameplans/proposals/drafts CRUD and atomic confirmation. No AI mutation of confirmed data. Idempotent draft confirmation and stale revision rejection.
- [x] Remove GET-based technique seeding; preserve old library and allow removing unused starter entries from personal view.
- [x] Test date/pause accounting, unknown statistics, validation and confirmation boundaries with node:test. Typecheck server. Commit.

## Task 2: Catalog
- [x] Add `server/scripts/import-catalog.ts`, pinned source metadata and generated `server/src/data/catalog.json` from public-domain GrappleMap plus existing starter references.
- [x] Add `server/src/training/catalog.ts` searchable, paginated catalog, alias handling and source links; `server/src/routes/catalog.ts` authenticated browsing/import.
- [x] Test parser and filters; verify source provenance and counts. Commit.

## Task 3: Coach and audio
- [x] Replace `server/src/routes/chat.ts` with conversation-aware persistent messages and structured replies. Keep legacy messages migrated into a conversation.
- [x] Add `server/src/training/assistant.ts` read-only history/catalog tools, profile/gameplan context and proposals, plus `server/src/routes/audio.ts` bounded audio transcription.
- [x] Save user messages before model calls, support retry IDs without duplicates, persist errors/retries safely. Validate model output. No draft participates in confirmed stats.
- [x] Replace `src/features/coach/CoachPage.tsx`, add conversation history, proposal previews/actions and shared audio/text composer.
- [x] Validate API requests and mocked provider errors, audio limits and history ownership. Commit.

## Task 4: Product screens
- [x] Add `src/features/training/TodayPage.tsx`, `DraftsPage.tsx`, `DraftPage.tsx`, `GameplanPage.tsx`, `ExplorePage.tsx`, `ProfileForm.tsx`, shared query hooks/components.
- [x] Add profile/belt/pause editing to Settings; clear labels for optional stats.
- [x] Wire routes/nav and journal quick logging, personal library stages, gameplan branching and practice evidence in progress.
- [x] Use existing semantic tokens/pill design, accessible forms, loading/errors/empty states and responsive layouts. Build and lint. Commit.

## Task 5: Restore and verification
- [x] Extend backup version to preserve all new personal records and remap references transactionally; accept legacy backups without deleting newer unrelated records.
- [x] Add integration tests against isolated test Postgres for draft confirmation, duplicate/stale requests, user isolation, proposal application and backup round trips.
- [x] Run frontend build/lint, server typecheck and all tests. Run local UI with test account and inspect mobile/desktop core workflows.
- [x] Document sources, operating instructions, migrations, model/audio constraints in a new feature doc without touching pre-existing uncommitted deployment files.
- [x] Review final diff and commit final checks/fixes. Push current branch only after all work is complete. Do not deploy implicitly.

## Verification notes

Implemented in incremental commits. Details and limitations are in `docs/training-companion.md`. A real Gemini request reached Google but the local key was invalid; provider-independent behavior and SDK history-tool execution passed. Existing deployment/README changes were excluded from feature commits.
