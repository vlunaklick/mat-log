import { Hono } from "hono";
import { z } from "zod";
import type { AppEnv } from "../middleware.ts";
import { catalog, searchCatalog } from "../training/catalog.ts";
import { db, schema, eq, and } from "../db/index.ts";
import { ensureState, fail } from "../training/store.ts";
import { newCardFields } from "../../../src/lib/srs.ts";
export const catalogRoute = new Hono<AppEnv>()
  .get("/", (c) => {
    const params = z
      .object({
        q: z.string().max(200).default(""),
        style: z.enum(["gi", "nogi", "all"]).default("all"),
        position: z.string().default("all"),
        offset: z.coerce.number().int().min(0).default(0),
      })
      .parse(c.req.query());
    return c.json(
      searchCatalog(params.q, params.style, params.position, params.offset),
    );
  })
  .post("/:id/unlock", async (c) => {
    const entry = catalog.find((e) => e.id === c.req.param("id"));
    if (!entry) fail(404, "Referencia no encontrada.");
    const userId = c.get("userId");
    return c.json(
      await db.transaction(async (tx) => {
        await ensureState(userId, tx);
        await tx
          .select()
          .from(schema.trainingState)
          .where(eq(schema.trainingState.userId, userId))
          .for("update");
        const [existing] = await tx
          .select()
          .from(schema.techniques)
          .where(
            and(
              eq(schema.techniques.userId, userId),
              eq(schema.techniques.catalogId, entry.id),
            ),
          );
        if (existing) {
          const [saved] = await tx
            .update(schema.techniques)
            .set({ archived: false })
            .where(eq(schema.techniques.id, existing.id))
            .returning();
          return saved;
        }
        const now = Date.now();
        const [row] = await tx
          .insert(schema.techniques)
          .values({
            userId,
            name: entry.name,
            position: entry.position,
            type: entry.type,
            catalogId: entry.id,
            details: entry.description,
            videoUrl: entry.references.flatMap(
              (r) => r.match(/https?:\/\/[^\s]+/g) ?? [],
            )[0],
            createdAt: now,
            updatedAt: now,
            ...newCardFields(),
          })
          .returning();
        return row;
      }),
    );
  });
