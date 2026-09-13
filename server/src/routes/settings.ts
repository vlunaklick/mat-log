import { Hono } from "hono";
import { z } from "zod";
import { eq } from "../db/index.ts";
import { db, schema } from "../db/index.ts";
import type { AppEnv } from "../middleware.ts";

const settingsSchema = z.object({
  beltStartDate: z.string().optional(),
  weeklyGoalSessions: z.number().int().nonnegative(),
});

const DEFAULTS = { beltStartDate: undefined as string | undefined, weeklyGoalSessions: 3 };

export const settingsRoute = new Hono<AppEnv>()
  .get("/", async (c) => {
    const userId = c.get("userId");
    const [row] = await db.select().from(schema.userSettings).where(eq(schema.userSettings.userId, userId)).limit(1);
    if (!row) return c.json(DEFAULTS);
    return c.json({ beltStartDate: row.beltStartDate ?? undefined, weeklyGoalSessions: row.weeklyGoalSessions });
  })
  .put("/", async (c) => {
    const userId = c.get("userId");
    const parsed = settingsSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: parsed.error.message }, 400);
    const [row] = await db
      .insert(schema.userSettings)
      .values({ userId, ...parsed.data })
      .onConflictDoUpdate({ target: schema.userSettings.userId, set: parsed.data })
      .returning();
    return c.json({ beltStartDate: row.beltStartDate ?? undefined, weeklyGoalSessions: row.weeklyGoalSessions });
  });
