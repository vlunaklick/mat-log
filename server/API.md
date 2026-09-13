# Mat Log API contract

Base path `/api`. JSON in and out. Every route except `/api/auth/*` and `/api/health` requires a Better Auth session cookie; otherwise `401 {"error":"unauthorized"}`. All data is scoped to the signed-in user.

Types are the ones in `src/lib/types.ts` (frontend). `id` fields are numbers. Timestamps (`createdAt`, `updatedAt`, `dueAt`) are epoch milliseconds.

## Auth
Handled by Better Auth at `/api/auth/*` (email + password, sign-up closed). Frontend uses `createAuthClient` from `better-auth/react` with `baseURL: window.location.origin`.

## Sessions (training classes)
- `GET /api/sessions` → `Session[]` newest first (by date, then createdAt).
- `POST /api/sessions` body `Omit<Session,"id"|"createdAt">` → `Session` (201).
- `PUT /api/sessions/:id` body `Omit<Session,"id"|"createdAt">` → `Session`.
- `DELETE /api/sessions/:id` → 204.

## Techniques
- `GET /api/techniques` → `Technique[]` ordered by position, name. If the user has zero techniques, the starter set (see `src/lib/seed.ts` data) is inserted first and returned.
- `POST /api/techniques` body `Pick<Technique,"name"|"position"|"type"|"steps"|"details"|"mistakes"|"videoUrl">` → `Technique` (201) with fresh SRS fields.
- `PUT /api/techniques/:id` same body → `Technique` (SRS fields preserved, `updatedAt` bumped).
- `DELETE /api/techniques/:id` → 204.
- `POST /api/techniques/:id/review` body `{ grade: "again"|"hard"|"good"|"easy" }` → updated `Technique` (applies `schedule()` from `src/lib/srs.ts`).

## Settings
- `GET /api/settings` → `{ beltStartDate?: string; weeklyGoalSessions: number }` (defaults `{ weeklyGoalSessions: 3 }`).
- `PUT /api/settings` same shape → same shape.

## Coach
- `GET /api/chat` → `ChatMessage[]` oldest first.
- `DELETE /api/chat` → 204.
- `POST /api/coach` body `{ message: string }` → `text/plain; charset=utf-8` streamed response body with the assistant reply. Server persists the user message before calling the model and the assistant message after the stream completes. Uses the last 20 messages as history and `buildCoachSummary()` from `src/lib/stats.ts` over the user's data. Errors: `502 {"error": "<message>"}` before streaming starts.

## Backup
- `GET /api/export` → `{ version: 2, exportedAt, sessions, techniques, settings }`.
- `POST /api/import` body of the same shape (or the old v1 local backup) → 204. Replaces all of the user's sessions and techniques.

## Health
- `GET /api/health` → `{ ok: true }`.
