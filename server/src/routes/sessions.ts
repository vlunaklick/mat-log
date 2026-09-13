import { Hono } from "hono";
import { z } from "zod";
import { and, desc, eq } from "../db/index.ts";
import { db, schema } from "../db/index.ts";
import type { AppEnv } from "../middleware.ts";

const rollSchema = z.object({
  partnerName: z.string().optional(),
  partnerBelt: z.enum(["white", "blue", "purple", "brown", "black"]).optional(),
  outcome: z.enum(["dominated", "won", "even", "lost", "survived", "unknown"]),
  stuckIn: z
    .enum([
      "Standing / Takedowns",
      "Closed Guard",
      "Open Guard",
      "Half Guard",
      "Side Control",
      "Mount",
      "Back",
      "Turtle",
      "Guard Passing",
      "Leg Entanglements",
      "Escapes",
      "Other",
    ])
    .optional(),
  notes: z.string().optional(),
});

const sessionSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD"),
  style: z.enum(["gi", "nogi"]).nullable(),
  durationMin: z.number().int().nonnegative().nullable(),
  classTopic: z.string(),
  techniqueIds: z.array(z.number().int()),
  rolls: z.array(rollSchema),
  whatWorked: z.string(),
  whatFailed: z.string(),
  nextFocus: z.string(),
  energy: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]).nullable(),
});

export function sessionToApi(row: typeof schema.trainingSessions.$inferSelect) {
  return {
    id: row.id,
    date: row.date,
    style: row.style,
    durationMin: row.durationMin,
    classTopic: row.classTopic,
    techniqueIds: row.techniqueIds,
    rolls: row.rolls,
    whatWorked: row.whatWorked,
    whatFailed: row.whatFailed,
    nextFocus: row.nextFocus,
    energy: row.energy as 1 | 2 | 3 | 4 | 5 | null,
    evidence: row.evidence,
    goalNotes: row.goalNotes,
    createdAt: row.createdAt,
  };
}

export const sessionsRoute = new Hono<AppEnv>()
  .get("/", async (c) => {
    const userId = c.get("userId");
    const rows = await db
      .select()
      .from(schema.trainingSessions)
      .where(eq(schema.trainingSessions.userId, userId))
      .orderBy(desc(schema.trainingSessions.date), desc(schema.trainingSessions.createdAt));
    return c.json(rows.map(sessionToApi));
  })
  .post("/", async (c) => {
    const userId = c.get("userId");
    const parsed = sessionSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: parsed.error.message }, 400);
    const [row] = await db
      .insert(schema.trainingSessions)
      .values({ ...parsed.data, userId, createdAt: Date.now() })
      .returning();
    return c.json(sessionToApi(row), 201);
  })
  .put("/:id", async (c) => {
    const userId = c.get("userId");
    const id = Number(c.req.param("id"));
    if (!Number.isInteger(id)) return c.json({ error: "invalid id" }, 400);
    const parsed = sessionSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: parsed.error.message }, 400);
    const [row] = await db
      .update(schema.trainingSessions)
      .set(parsed.data)
      .where(and(eq(schema.trainingSessions.id, id), eq(schema.trainingSessions.userId, userId)))
      .returning();
    if (!row) return c.json({ error: "not found" }, 404);
    return c.json(sessionToApi(row));
  })
  .delete("/:id", async (c) => {
    const userId = c.get("userId");
    const id = Number(c.req.param("id"));
    if (!Number.isInteger(id)) return c.json({ error: "invalid id" }, 400);
    const [row] = await db
      .delete(schema.trainingSessions)
      .where(and(eq(schema.trainingSessions.id, id), eq(schema.trainingSessions.userId, userId)))
      .returning();
    if (!row) return c.json({ error: "not found" }, 404);
    return c.body(null, 204);
  });
