import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { streamText as aiStreamText } from "ai";
import { Hono } from "hono";
import { streamText as honoStreamText } from "hono/streaming";
import { z } from "zod";
import { buildCoachSummary } from "../../../src/lib/stats.ts";
import { COACH_SYSTEM } from "../coach.ts";
import { asc, desc, eq } from "../db/index.ts";
import { db, schema } from "../db/index.ts";
import { env } from "../env.ts";
import type { AppEnv } from "../middleware.ts";
import { sessionToApi } from "./sessions.ts";
import { techniqueToApi } from "./techniques.ts";

const coachBodySchema = z.object({ message: z.string().min(1) });

const HISTORY_LIMIT = 20;

/** Streams the assistant reply, tracking whether any chunk was produced before an error. */
async function* askCoach(opts: {
  apiKey: string;
  system: string;
  history: Array<{ role: "user" | "assistant"; content: string }>;
}): AsyncGenerator<string> {
  const google = createGoogleGenerativeAI({ apiKey: opts.apiKey });

  let streamError: unknown = null;
  const result = aiStreamText({
    model: google(env.COACH_MODEL),
    system: opts.system,
    messages: opts.history,
    onError: ({ error }) => {
      streamError = error;
    },
  });

  for await (const chunk of result.textStream) {
    yield chunk;
  }

  if (streamError) {
    throw streamError instanceof Error ? streamError : new Error(String(streamError));
  }
}

export const chatRoute = new Hono<AppEnv>()
  .get("/chat", async (c) => {
    const userId = c.get("userId");
    const rows = await db
      .select()
      .from(schema.chatMessages)
      .where(eq(schema.chatMessages.userId, userId))
      .orderBy(asc(schema.chatMessages.createdAt));
    return c.json(rows.map((r) => ({ id: r.id, role: r.role, content: r.content, createdAt: r.createdAt })));
  })
  .delete("/chat", async (c) => {
    const userId = c.get("userId");
    await db.delete(schema.chatMessages).where(eq(schema.chatMessages.userId, userId));
    return c.body(null, 204);
  })
  .post("/coach", async (c) => {
    const userId = c.get("userId");
    const parsed = coachBodySchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: parsed.error.message }, 400);

    const [settingsRow] = await db.select().from(schema.userSettings).where(eq(schema.userSettings.userId, userId)).limit(1);
    const settings = {
      beltStartDate: settingsRow?.beltStartDate ?? undefined,
      weeklyGoalSessions: settingsRow?.weeklyGoalSessions ?? 3,
    };
    const sessionRows = await db.select().from(schema.trainingSessions).where(eq(schema.trainingSessions.userId, userId));
    const techniqueRows = await db.select().from(schema.techniques).where(eq(schema.techniques.userId, userId));
    const summary = buildCoachSummary(sessionRows.map(sessionToApi), techniqueRows.map(techniqueToApi), settings);

    await db.insert(schema.chatMessages).values({
      userId,
      role: "user",
      content: parsed.data.message,
      createdAt: Date.now(),
    });

    const historyRows = await db
      .select()
      .from(schema.chatMessages)
      .where(eq(schema.chatMessages.userId, userId))
      .orderBy(desc(schema.chatMessages.createdAt))
      .limit(HISTORY_LIMIT);
    const history = historyRows.reverse().map((r) => ({ role: r.role, content: r.content }));

    const system = `${COACH_SYSTEM}\n\nTrainee data (last 30 days):\n${summary}`;
    const gen = askCoach({ apiKey: env.GOOGLE_GENERATIVE_AI_API_KEY, system, history });

    let first: IteratorResult<string>;
    try {
      first = await gen.next();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return c.json({ error: message }, 502);
    }

    return honoStreamText(c, async (streamApi) => {
      let full = "";
      if (!first.done) {
        full += first.value;
        await streamApi.write(first.value);
      }
      try {
        for await (const chunk of gen) {
          full += chunk;
          await streamApi.write(chunk);
        }
      } catch (err) {
        console.error("coach stream error after first chunk", err);
      }
      await db.insert(schema.chatMessages).values({
        userId,
        role: "assistant",
        content: full,
        createdAt: Date.now(),
      });
    });
  });
