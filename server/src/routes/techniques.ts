import { Hono } from "hono";
import { z } from "zod";
import { POSITIONS, TECHNIQUE_TYPES } from "../../../src/lib/types.ts";
import { newCardFields, schedule } from "../../../src/lib/srs.ts";
import { and, asc, eq } from "../db/index.ts";
import { db, schema } from "../db/index.ts";
import type { AppEnv } from "../middleware.ts";


const techniqueSchema = z.object({
  name: z.string().min(1),
  archived: z.boolean().optional(),
  position: z.enum(POSITIONS),
  type: z.enum(TECHNIQUE_TYPES),
  steps: z.string(),
  details: z.string(),
  mistakes: z.string(),
  videoUrl: z.string().optional(),
});

const reviewSchema = z.object({
  grade: z.enum(["again", "hard", "good", "easy"]),
});

export function techniqueToApi(row: typeof schema.techniques.$inferSelect) {
  return {
    id: row.id,
    name: row.name,
    archived: row.archived,
    catalogId: row.catalogId ?? undefined,
    position: row.position,
    type: row.type,
    steps: row.steps,
    details: row.details,
    mistakes: row.mistakes,
    videoUrl: row.videoUrl ?? undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    ease: row.ease,
    intervalDays: row.intervalDays,
    dueAt: row.dueAt,
    reviewCount: row.reviewCount,
  };
}

export const techniquesRoute = new Hono<AppEnv>()
  .get("/", async (c) => {
    const userId = c.get("userId");
    const rows = await db
      .select()
      .from(schema.techniques)
      .where(eq(schema.techniques.userId, userId))
      .orderBy(asc(schema.techniques.position), asc(schema.techniques.name));
    return c.json(rows.map(techniqueToApi));
  })
  .post("/", async (c) => {
    const userId = c.get("userId");
    const parsed = techniqueSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: parsed.error.message }, 400);
    const now = Date.now();
    const [row] = await db
      .insert(schema.techniques)
      .values({ ...parsed.data, userId, createdAt: now, updatedAt: now, ...newCardFields() })
      .returning();
    return c.json(techniqueToApi(row), 201);
  })
  .put("/:id", async (c) => {
    const userId = c.get("userId");
    const id = Number(c.req.param("id"));
    if (!Number.isInteger(id)) return c.json({ error: "invalid id" }, 400);
    const parsed = techniqueSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: parsed.error.message }, 400);
    const [row] = await db
      .update(schema.techniques)
      .set({ ...parsed.data, updatedAt: Date.now() })
      .where(and(eq(schema.techniques.id, id), eq(schema.techniques.userId, userId)))
      .returning();
    if (!row) return c.json({ error: "not found" }, 404);
    return c.json(techniqueToApi(row));
  })
  .delete("/:id", async (c) => {
    const userId = c.get("userId");
    const id = Number(c.req.param("id"));
    if (!Number.isInteger(id)) return c.json({ error: "invalid id" }, 400);
    await db.transaction(async tx => {
      const [state] = await tx.select().from(schema.trainingState).where(eq(schema.trainingState.userId, userId)).for('update');
      const [row] = await tx.delete(schema.techniques).where(and(eq(schema.techniques.id, id), eq(schema.techniques.userId, userId))).returning();
      if (!row) return;
      const sessions = await tx.select().from(schema.trainingSessions).where(eq(schema.trainingSessions.userId, userId));
      for (const s of sessions) if (s.techniqueIds.includes(id)) await tx.update(schema.trainingSessions).set({ techniqueIds:s.techniqueIds.filter(t => t !== id),evidence:s.evidence.filter(e => e.techniqueId !== id) }).where(eq(schema.trainingSessions.id,s.id));
      if (state) await tx.update(schema.trainingState).set({ revision:state.revision+1, gameplans:state.gameplans.map(p => ({ ...p,nodes:p.nodes.map(n => n.techniqueId === id ? { ...n,techniqueId:null } : n) })) }).where(eq(schema.trainingState.userId,userId));
    });
    return c.body(null, 204);
  })
  .post("/:id/review", async (c) => {
    const userId = c.get("userId");
    const id = Number(c.req.param("id"));
    if (!Number.isInteger(id)) return c.json({ error: "invalid id" }, 400);
    const parsed = reviewSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: parsed.error.message }, 400);

    const [existing] = await db
      .select()
      .from(schema.techniques)
      .where(and(eq(schema.techniques.id, id), eq(schema.techniques.userId, userId)))
      .limit(1);
    if (!existing) return c.json({ error: "not found" }, 404);

    const next = schedule(existing, parsed.data.grade);
    const [row] = await db
      .update(schema.techniques)
      .set(next)
      .where(and(eq(schema.techniques.id, id), eq(schema.techniques.userId, userId)))
      .returning();
    return c.json(techniqueToApi(row));
  });
