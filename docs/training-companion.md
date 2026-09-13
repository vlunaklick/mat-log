# Mat Log training companion

The app now opens on **Hoy entreno**. It shows the selected modality's persistent goal, the previous class's next focus, linked techniques, pending drafts and separate gi/no-gi gameplans. Goals can be paused, resumed or marked complete. The journal and manual session editor remain available.

## Conversational logging

Write or record audio in any coach conversation. When a class is described, the coach produces an editable draft and follow-up questions. Drafts are stored on the server and can be resumed from the journal, Today, the drafts list or their conversation. Answers can be text or audio. Saving and confirming are separate actions; unanswered questions do not prevent confirmation, but the class date is required. Unknown modality, duration, energy, counts and roll results stay unknown.

Confirmation atomically creates the session, links/unlocks techniques and records seen/practiced/applied evidence. Repeating confirmation returns the same session. Stale edits receive a conflict instead of overwriting newer work. Editing confirmed evidence updates derived technique progress; removing a class removes its contribution. Saving a catalog reference does not assert that it was learned or used in a roll.

Audio uses native MediaRecorder with a five-minute recording limit, or file upload up to 15 MB. Supported MIME types: WebM, MP4/M4A, MP3, WAV and OGG. The transcription appears in the composer for review before sending. Microphone access needs localhost or HTTPS and a compatible browser. Audio is sent to the configured Gemini provider for transcription and is not persisted by Mat Log. Chat text/transcriptions sent by the user are retained. Provider-side retention is governed by the configured Google account, not this app. A failed transcription can be retried or replaced with text.

## Coach memory and confirmation

Conversations and messages are persisted, browsable and searchable. Existing pre-upgrade messages migrate to **Conversaciones anteriores**. The coach receives recent context and can invoke user-scoped, read-only tools to search all historical messages, read any owned conversation in pages, and search confirmed sessions without an age cutoff. Full-text search uses Postgres GIN indexes. Recent context is bounded, but older data remains accessible through tools.

The profile contains optional training start, birth year, height, weight, preferences, ambitions, limitations, belt dates and pauses. Pause duration merges overlapping periods and distinguishes elapsed time from time excluding pauses; neither is a count of attended days. Existing settings start date initializes the profile once.

AI changes to profile, goals or a gameplan are saved as proposals. The user reviews their full content and confirms or dismisses them. A state revision prevents accepting a stale proposal that would overwrite a newer profile or plan. One proposal is generated per response. Acceptance of another proposal may make older pending proposals stale; ask the coach to regenerate those using current data.

Gi and no-gi have separate gameplans. Each has an intention, a coach assessment, nodes with positions/actions/opponent responses/cautions and links to next nodes. Suggested branches stay distinct from learned branches. The interactive step view follows alternatives; the manual editor can add/remove/connect nodes and associate personal techniques. AI assessments are hypotheses to test in training.

## Catalog sources

- **GrappleMap**: 1,751 named positions and transitions imported from public-domain data, not 1,751 distinct techniques. Unfinished placeholders tagged as stubs/WIP are excluded. Upstream: https://github.com/Eelis/GrappleMap . Snapshot commit: `032c8f91809786b7b784852abd07cf3e10c0ea35`. The generated JSON records the source URL, checksum, source references and labels. It contains no animation coordinates. The source is focused on no-gi and simplifies timing, grips and continuous movement.
- **Mat Log**: the existing starter curriculum is available in Explore instead of being automatically inserted into every personal library. Existing personal rows are preserved. Selected Spanish aliases help discovery. Position/type classifications of imported records use conservative text rules and can be corrected when incorporated into a personal technique.
- **Submission Searcher**: https://submissionsearcher.com/ . External video reference directory, linked from Explore; its content is not bulk-imported.
- **BJJ Mental Models**: https://www.bjjmentalmodels.com/database . External concept reference directory, linked from Explore; its content is not bulk-imported.

The coach's local catalog tool searches the imported catalog. It does not claim to have read the external directories' pages. Gi coverage is smaller. References, technical identification and suggested branches can be incomplete; the user can preserve provisional names and questions for their instructor.

Rebuild the pinned catalog with `npm run catalog:import --prefix server`. Review the generated changes before updating the pinned commit. Upstream license applies to its data/code; linked instructional materials retain their own rights.

## Data and deployment

New Drizzle migrations are additive: nullable unreported session fields, profile/state, conversations, drafts, proposals, evidence, source IDs and history-search/idempotency indexes. Apply with `npm run db:migrate --prefix server` before starting the updated API. The existing Docker entrypoint already runs migrations. No deployment configuration changes are required for this feature. Frontend and API should be released together; the coach endpoint now returns structured JSON rather than a text stream.

The same server-side `GOOGLE_GENERATIVE_AI_API_KEY` and `COACH_MODEL` configure coaching and audio. Coach requests time out after 120 seconds and transcription after 90 seconds. User input is persisted before generation. Retry IDs prevent duplicate messages, drafts and proposals when replaying a successful request. Provider errors are shown as recoverable failures; confirmed data is not mutated on failure.

Backup **version 3** includes sessions, techniques/evidence, settings, profile, goals, gameplans, conversations, messages, drafts and proposals. Export uses a consistent transaction snapshot. Import validates references, replaces those resources for the signed-in user in a single transaction, and remaps IDs. A malformed backup rolls back without partial replacement. V1/V2 imports continue to replace sessions/techniques/settings, preserve chats and drafts, detach now-invalid technique links and invalidate old proposals. Export a backup before replacement. No authentication credentials or provider keys are exported.

## Verification

- `npm run build`: frontend TypeScript and production build.
- `npm run lint`: existing lint warnings remain in shared UI components and the old mobile hook; no lint errors.
- `npm run typecheck --prefix server`.
- Unit/integration tests: `DATABASE_URL=postgresql://.../matlog_companion_test npm test --prefix server`. Use an isolated database with this exact name and run migrations first; tests refuse other databases. Tests cover overlap accounting, unknown counts, date/graph validation, catalog filters, atomic duplicate confirmations, user isolation, stale proposals, restoration/remapping, legacy import, provider failure/retry, audio rejection, and actual AI SDK tool execution retrieving old messages without cross-user leakage.
- `server/tests/seed-ui.ts` creates a fixture only in that disposable database, for the test user `companion-test@example.test`. It replaces that test user's training data. Create that test account with the existing bootstrap script first.
- Browser checks at 1440px and 390px: all main screens, accepting goals, editing/resuming/confirming drafts, library progression, gameplan branches/manual edits and profile persistence. No uncaught browser exceptions or horizontal overflow were observed.

The local Gemini key was rejected by Google (`API_KEY_INVALID`) during a real-provider smoke test. End-to-end live model generation and live transcription remain unverified with a valid key. Structured generation/tool behavior, persistence, failure handling and UI flows were tested with controlled fixtures. A valid deployment key is needed for the AI features.
