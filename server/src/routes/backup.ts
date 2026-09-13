import { Hono } from "hono";
import { z } from "zod";
import { POSITIONS, TECHNIQUE_TYPES } from "../../../src/lib/types.ts";
import { newCardFields } from "../../../src/lib/srs.ts";
import { eq } from "../db/index.ts";
import { db, schema } from "../db/index.ts";
import type { AppEnv } from "../middleware.ts";
import { sessionToApi } from "./sessions.ts";
import { techniqueToApi } from "./techniques.ts";

const rollSchema = z.object({
  partnerName: z.string().optional(),
  partnerBelt: z.enum(["white", "blue", "purple", "brown", "black"]).optional(),
  outcome: z.enum(["dominated", "won", "even", "lost", "survived"]),
  stuckIn: z.enum(POSITIONS).optional(),
  notes: z.string().optional(),
});

const importSessionSchema = z.object({
  id: z.number().optional(),
  date: z.string(),
  style: z.enum(["gi", "nogi"]),
  durationMin: z.number(),
  classTopic: z.string().default(""),
  techniqueIds: z.array(z.number()).default([]),
  rolls: z.array(rollSchema).default([]),
  whatWorked: z.string().default(""),
  whatFailed: z.string().default(""),
  nextFocus: z.string().default(""),
  energy: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
  createdAt: z.number().optional(),
});

const importTechniqueSchema = z.object({
  id: z.number().optional(),
  name: z.string(),
  position: z.enum(POSITIONS),
  type: z.enum(TECHNIQUE_TYPES),
  steps: z.string().default(""),
  details: z.string().default(""),
  mistakes: z.string().default(""),
  videoUrl: z.string().optional(),
  createdAt: z.number().optional(),
  updatedAt: z.number().optional(),
  ease: z.number().optional(),
  intervalDays: z.number().optional(),
  dueAt: z.number().optional(),
  reviewCount: z.number().optional(),
});

const importSettingsSchema = z.object({
  beltStartDate: z.string().optional(),
  weeklyGoalSessions: z.number().optional(),
});

const importSchema = z.object({
  version: z.union([z.literal(1), z.literal(2)]),
  exportedAt: z.number().optional(),
  sessions: z.array(importSessionSchema),
  techniques: z.array(importTechniqueSchema),
  settings: importSettingsSchema.optional(),
});

export const backupRoute = new Hono<AppEnv>()
  .get("/export", async (c) => {
    const userId = c.get("userId");
    const sessions = await db.select().from(schema.trainingSessions).where(eq(schema.trainingSessions.userId, userId));
    const techniques = await db.select().from(schema.techniques).where(eq(schema.techniques.userId, userId));
    const [settingsRow] = await db.select().from(schema.userSettings).where(eq(schema.userSettings.userId, userId)).limit(1);
    return c.json({
      version: 2,
      exportedAt: Date.now(),
      sessions: sessions.map(sessionToApi),
      techniques: techniques.map(techniqueToApi),
      settings: {
        beltStartDate: settingsRow?.beltStartDate ?? undefined,
        weeklyGoalSessions: settingsRow?.weeklyGoalSessions ?? 3,
      },
    });
  })
  .post("/import", async (c) => {
    const userId = c.get("userId");
    const parsed = importSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: parsed.error.message }, 400);
    const data = parsed.data;

    await db.transaction(async (tx) => {
      await tx.delete(schema.trainingSessions).where(eq(schema.trainingSessions.userId, userId));
      await tx.delete(schema.techniques).where(eq(schema.techniques.userId, userId));

      const idMap = new Map<number, number>();
      for (const t of data.techniques) {
        const now = Date.now();
        const [row] = await tx
          .insert(schema.techniques)
          .values({
            userId,
            name: t.name,
            position: t.position,
            type: t.type,
            steps: t.steps,
            details: t.details,
            mistakes: t.mistakes,
            videoUrl: t.videoUrl,
            createdAt: t.createdAt ?? now,
            updatedAt: t.updatedAt ?? now,
            ease: t.ease ?? newCardFields().ease,
            intervalDays: t.intervalDays ?? newCardFields().intervalDays,
            dueAt: t.dueAt ?? newCardFields().dueAt,
            reviewCount: t.reviewCount ?? newCardFields().reviewCount,
          })
          .returning({ id: schema.techniques.id });
        if (t.id !== undefined) idMap.set(t.id, row.id);
      }

      for (const s of data.sessions) {
        const remappedIds = s.techniqueIds
          .map((oldId) => idMap.get(oldId))
          .filter((id): id is number => id !== undefined);
        await tx.insert(schema.trainingSessions).values({
          userId,
          date: s.date,
          style: s.style,
          durationMin: s.durationMin,
          classTopic: s.classTopic,
          techniqueIds: remappedIds,
          rolls: s.rolls,
          whatWorked: s.whatWorked,
          whatFailed: s.whatFailed,
          nextFocus: s.nextFocus,
          energy: s.energy,
          createdAt: s.createdAt ?? Date.now(),
        });
      }

      if (data.settings) {
        await tx
          .insert(schema.userSettings)
          .values({ userId, ...data.settings })
          .onConflictDoUpdate({ target: schema.userSettings.userId, set: data.settings });
      }
    });

    return c.body(null, 204);
  });
