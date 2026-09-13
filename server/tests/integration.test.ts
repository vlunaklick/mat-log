import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { ZodError } from "zod";
import { db, schema, eq, and } from "../src/db/index.ts";
import { getState, applyPayload, confirmDraft } from "../src/training/store.ts";
import { exportData, importData, importSchema } from "../src/routes/backup.ts";
import { trainingRoute } from "../src/routes/training.ts";
import { createChatRoute } from "../src/routes/chat.ts";
import { techniquesRoute } from "../src/routes/techniques.ts";
import { sessionsRoute } from "../src/routes/sessions.ts";
import { audioRoute } from "../src/routes/audio.ts";
import type { AppEnv } from "../src/middleware.ts";
import type { DraftData } from "../../src/lib/training.ts";

if (!process.env.DATABASE_URL?.includes("matlog_companion_test"))
  throw new Error(
    "Integration tests require a disposable database named matlog_companion_test.",
  );
const owner = `test-${crypto.randomUUID()}`,
  other = `test-${crypto.randomUUID()}`;
const empty: DraftData = {
  date: "2026-09-13",
  style: "nogi",
  durationMin: null,
  energy: null,
  classTopic: "Media guardia",
  whatWorked: "",
  whatFailed: "",
  nextFocus: "",
  goalNotes: "",
  rolls: [],
  techniques: [],
};
async function draft(data: DraftData = empty) {
  const [row] = await db
    .insert(schema.drafts)
    .values({
      id: crypto.randomUUID(),
      userId: owner,
      sourceText: "Mi relato",
      data,
      questions: ["¿Cuánto duró?"],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
    .returning();
  return row;
}
function app() {
  const a = new Hono<AppEnv>();
  a.use("*", async (c, next) => {
    c.set("userId", c.req.header("x-user") || owner);
    await next();
  });
  a.route("/training", trainingRoute);
  a.route("/techniques", techniquesRoute);
  a.route("/sessions", sessionsRoute);
  a.route("/audio", audioRoute);
  a.onError((e, c) =>
    c.json(
      { error: e.message },
      e instanceof HTTPException ? e.status : e instanceof ZodError ? 400 : 500,
    ),
  );
  return a;
}
before(async () => {
  for (const id of [owner, other])
    await db
      .insert(schema.user)
      .values({ id, name: "Test athlete", email: `${id}@example.test` });
});
after(async () => {
  for (const id of [owner, other])
    await db.delete(schema.user).where(eq(schema.user.id, id));
  await db.$client.end();
});
test("parallel confirmation is idempotent, unknown values stay null and techniques deduplicate", async () => {
  const d = await draft({
    ...empty,
    techniques: [
      {
        name: "Test kimura",
        position: "Half Guard",
        type: "submission",
        stage: "practiced",
        notes: "Practiqué el agarre",
        identification: "confirmed",
        catalogId: null,
        attempts: null,
        successes: null,
      },
    ],
  });
  const results = await Promise.all([
    confirmDraft(owner, d.id, 0),
    confirmDraft(owner, d.id, 0),
  ]);
  assert.equal(results[0].sessionId, results[1].sessionId);
  const [s] = await db
    .select()
    .from(schema.trainingSessions)
    .where(eq(schema.trainingSessions.id, results[0].sessionId!));
  assert.equal(s.durationMin, null);
  assert.equal(s.energy, null);
  assert.equal(s.evidence[0].stage, "practiced");
  const d2 = await draft({ ...d.data });
  await confirmDraft(owner, d2.id, 0);
  const ts = await db
    .select()
    .from(schema.techniques)
    .where(eq(schema.techniques.userId, owner));
  assert.equal(ts.length, 1);
});
test("drafts do not enter stats; stale and cross-user confirmations fail", async () => {
  const d = await draft();
  await assert.rejects(confirmDraft(other, d.id, 0), /no encontrado/);
  await assert.rejects(confirmDraft(owner, d.id, 1), /cambió/);
  const rows = await db
    .select()
    .from(schema.trainingSessions)
    .where(eq(schema.trainingSessions.userId, other));
  assert.equal(rows.length, 0);
  const response = await app().request(`/training/drafts/${d.id}`, {
    headers: { "x-user": other },
  });
  assert.equal(response.status, 404);
});
test("proposals require confirmation and reject stale revisions and foreign technique IDs", async () => {
  const state = await getState(owner);
  const payload = {
    kind: "goal" as const,
    data: {
      id: "goal-1",
      style: "nogi" as const,
      title: "Recover guard",
      action: "Try frames",
      status: "active" as const,
      notes: "",
    },
  };
  const [p] = await db
    .insert(schema.proposals)
    .values({
      id: crypto.randomUUID(),
      userId: owner,
      title: "Focus",
      reason: "Repeated difficulty",
      payload,
      baseRevision: state.revision,
      createdAt: Date.now(),
    })
    .returning();
  assert.equal((await getState(owner)).goals.length, 0);
  const denied = await app().request(`/training/proposals/${p.id}/accept`, {
    method: "POST",
    headers: { "x-user": other },
  });
  assert.equal(denied.status, 404);
  const accepted = await app().request(`/training/proposals/${p.id}/accept`, {
    method: "POST",
  });
  assert.equal(accepted.status, 200);
  assert.equal((await getState(owner)).goals[0].title, "Recover guard");
  await assert.rejects(
    db.transaction((tx) => applyPayload(tx, owner, payload, state.revision)),
    /cambió/,
  );
  const current = await getState(owner);
  await assert.rejects(
    db.transaction((tx) =>
      applyPayload(
        tx,
        owner,
        {
          kind: "gameplan",
          data: {
            style: "gi",
            title: "Plan",
            intention: "",
            assessment: "",
            nodes: [
              {
                id: "x",
                position: "Mount",
                action: "",
                opponentResponse: "",
                next: [],
                status: "suggested",
                techniqueId: 2147483000,
                caution: "",
              },
            ],
          },
        },
        current.revision,
      ),
    ),
    /no pertenece/,
  );
});
test("backup roundtrip remaps evidence, conversations, plans and draft links without losing data", async () => {
  const state = await getState(owner),
    [t] = await db
      .select()
      .from(schema.techniques)
      .where(eq(schema.techniques.userId, owner));
  await db.transaction((tx) =>
    applyPayload(
      tx,
      owner,
      {
        kind: "gameplan",
        data: {
          style: "nogi",
          title: "My game",
          intention: "Top",
          assessment: "Try",
          nodes: [
            {
              id: "node-a",
              position: "Half Guard",
              action: "Kimura",
              opponentResponse: "Posts",
              next: [],
              status: "learned",
              techniqueId: t.id,
              caution: "",
            },
          ],
        },
      },
      state.revision,
    ),
  );
  const [conversation] = await db
    .insert(schema.conversations)
    .values({
      id: crypto.randomUUID(),
      userId: owner,
      title: "Old conversation",
      createdAt: 1,
      updatedAt: 2,
    })
    .returning();
  await db.insert(schema.chatMessages).values({
    userId: owner,
    conversationId: conversation.id,
    role: "user",
    content: "My old question",
    createdAt: 1,
  });
  const backup = await exportData(owner);
  await importData(other, backup);
  const restored = await exportData(other);
  assert.equal(restored.sessions.length, backup.sessions.length);
  assert.equal(restored.messages[0].content, "My old question");
  assert.notEqual(restored.techniques[0].id, backup.techniques[0].id);
  assert.equal(
    restored.training.gameplans[0].nodes[0].techniqueId,
    restored.techniques[0].id,
  );
  assert.equal(
    restored.sessions[0].evidence[0].techniqueId,
    restored.techniques[0].id,
  );
  assert.equal(
    restored.messages[0].conversationId,
    restored.conversations[0].id,
  );
  assert.ok(
    restored.drafts
      .filter((d) => d.status === "confirmed")
      .every((d) => restored.sessions.some((s) => s.id === d.sessionId)),
  );
  await assert.rejects(
    importData(other, {
      ...backup,
      sessions: [{ ...backup.sessions[0], techniqueIds: [987654] }],
    }),
    /Referencias/,
  );
  assert.equal(
    (await exportData(other)).sessions.length,
    restored.sessions.length,
  );
});
test("legacy import preserves chats and pending drafts; deleting techniques removes stale references", async () => {
  const original = await exportData(other);
  await db
    .insert(schema.proposals)
    .values({
      id: crypto.randomUUID(),
      userId: other,
      title: "Old gameplan",
      reason: "",
      payload: { kind: "gameplan", data: original.training.gameplans[0] },
      baseRevision: 0,
      status: "accepted",
      createdAt: 1,
    });
  await importData(other, { version: 2, sessions: [], techniques: [] });
  const after = await exportData(other);
  importSchema.parse(after);
  assert.equal(after.messages.length, original.messages.length);
  assert.equal(after.drafts.length, original.drafts.length);
  assert.equal(after.training.gameplans[0].nodes[0].techniqueId, null);
  const [tech] = await db
    .select()
    .from(schema.techniques)
    .where(eq(schema.techniques.userId, owner));
  const response = await app().request(`/techniques/${tech.id}`, {
    method: "DELETE",
  });
  assert.equal(response.status, 204);
  const state = await exportData(owner);
  assert.ok(
    state.sessions.every(
      (s) =>
        !s.techniqueIds.includes(tech.id) &&
        !s.evidence.some((e) => e.techniqueId === tech.id),
    ),
  );
});
test("coach persists input on failure and retries once without duplicated messages or drafts", async () => {
  let calls = 0;
  const a = app();
  a.route(
    "/",
    createChatRoute(async () => {
      calls++;
      if (calls === 1) throw new Error("Simulated provider failure");
      return {
        output: {
          reply: "Borrador listo",
          draft: { targetId: null, data: empty, questions: ["¿Duración?"] },
          proposal: null,
        },
        baseRevision: (await getState(owner)).revision,
        selectedDraft: null,
      };
    }),
  );
  const conversation = await (
    await a.request("/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Log class" }),
    })
  ).json();
  const body = {
    message: "Hoy entrené",
    conversationId: conversation.id,
    requestId: crypto.randomUUID(),
    localDate: "2026-09-13",
    mode: "log",
  };
  const send = () =>
    a.request("/coach", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  assert.equal((await send()).status, 502);
  assert.equal((await send()).status, 200);
  assert.equal((await send()).status, 200);
  assert.equal(calls, 2);
  const messages = await db
    .select()
    .from(schema.chatMessages)
    .where(
      and(
        eq(schema.chatMessages.userId, owner),
        eq(schema.chatMessages.conversationId, conversation.id),
      ),
    );
  assert.equal(messages.length, 2);
  const ds = await db
    .select()
    .from(schema.drafts)
    .where(eq(schema.drafts.conversationId, conversation.id));
  assert.equal(ds.length, 1);
  body.message = "Different text";
  assert.equal((await send()).status, 409);
});
test("audio rejects empty, non-audio and oversized requests before contacting provider", async () => {
  const form = new FormData();
  form.append("audio", new Blob(["bad"], { type: "text/plain" }), "bad.txt");
  assert.equal(
    (await app().request("/audio", { method: "POST", body: form })).status,
    400,
  );
  assert.equal(
    (
      await app().request("/audio", {
        method: "POST",
        body: new Uint8Array(16 * 1024 * 1024),
      })
    ).status,
    413,
  );
});

test("AI SDK executes historical retrieval across old chats without leaking another user", async () => {
  const { MockLanguageModelV4 } = await import("ai/test");
  const { respond } = await import("../src/training/assistant.ts");
  const id = crypto.randomUUID();
  await db.insert(schema.conversations).values({
    id,
    userId: owner,
    title: "Memory check",
    createdAt: 1,
    updatedAt: 2,
  });
  await db.insert(schema.chatMessages).values([
    {
      userId: owner,
      conversationId: id,
      role: "user",
      content: "ancientneedle MY_OLD_DETAIL",
      createdAt: 1,
    },
    {
      userId: other,
      role: "user",
      content: "foreignneedle OTHER_PRIVATE_CONTENT",
      createdAt: 1,
    },
    ...Array.from({ length: 30 }, (_, i) => ({
      userId: owner,
      conversationId: id,
      role: "user" as const,
      content: `Recent message ${i}`,
      createdAt: i + 2,
    })),
  ]);
  let calls = 0;
  const model = new MockLanguageModelV4({
    doGenerate: async (options) => {
      calls++;
      const usage = {
        inputTokens: { total: 10, noCache: 10, cacheRead: 0, cacheWrite: 0 },
        outputTokens: { total: 10, text: 10, reasoning: 0 },
      };
      if (calls === 1)
        return {
          content: [
            {
              type: "tool-call",
              toolCallId: "history-call",
              toolName: "searchHistory",
              input: JSON.stringify({
                query: "ancientneedle OR foreignneedle",
                offset: 0,
              }),
            },
          ],
          finishReason: { unified: "tool-calls", raw: "tool-calls" },
          usage,
          warnings: [],
        };
      const prompt = JSON.stringify(options.prompt);
      assert.ok(prompt.includes("MY_OLD_DETAIL"));
      assert.ok(!prompt.includes("OTHER_PRIVATE_CONTENT"));
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              reply: "Encontré tu nota antigua.",
              draft: null,
              proposal: null,
            }),
          },
        ],
        finishReason: { unified: "stop", raw: "stop" },
        usage,
        warnings: [],
      };
    },
  });
  const result = await respond(owner, id, null, "2026-09-13", "chat", model);
  assert.equal(calls, 2);
  assert.equal(result.output.reply, "Encontré tu nota antigua.");
});
