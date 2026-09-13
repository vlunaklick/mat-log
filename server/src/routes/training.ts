import { Hono } from 'hono';
import { z } from 'zod';
import { db, schema, eq, and, desc } from '../db/index.ts';
import type { AppEnv } from '../middleware.ts';
import { applyPayload, confirmDraft, getState, fail } from '../training/store.ts';
import { payloadSchema, revisionSchema, draftDataSchema } from '../training/validation.ts';
export const trainingRoute = new Hono<AppEnv>()
  .get('/state', async c => c.json(await getState(c.get('userId'))))
  .put('/state', async c => {
    const { payload, revision } = z.object({ payload: payloadSchema, revision: revisionSchema }).parse(await c.req.json());
    return c.json(await db.transaction(tx => applyPayload(tx, c.get('userId'), payload, revision)));
  })
  .get('/drafts', async c => c.json(await db.select().from(schema.drafts).where(eq(schema.drafts.userId, c.get('userId'))).orderBy(desc(schema.drafts.updatedAt))))
  .get('/drafts/:id', async c => {
    const [row] = await db.select().from(schema.drafts).where(and(eq(schema.drafts.userId, c.get('userId')), eq(schema.drafts.id, c.req.param('id'))));
    if (!row) fail(404, 'Borrador no encontrado.');
    return c.json(row);
  })
  .put('/drafts/:id', async c => {
    const { revision, data, questions } = z.object({ revision: revisionSchema, data: draftDataSchema, questions: z.array(z.string().max(1000)).max(20) }).parse(await c.req.json());
    const [row] = await db.update(schema.drafts).set({ data, questions, revision: revision + 1, updatedAt: Date.now() }).where(and(
      eq(schema.drafts.userId, c.get('userId')), eq(schema.drafts.id, c.req.param('id')), eq(schema.drafts.revision, revision), eq(schema.drafts.status, 'draft'))).returning();
    if (!row) fail(409, 'El borrador cambió o ya fue confirmado. Recargá la página.');
    return c.json(row);
  })
  .post('/drafts/:id/confirm', async c => {
    const { revision } = z.object({ revision: revisionSchema }).parse(await c.req.json());
    return c.json(await confirmDraft(c.get('userId'), c.req.param('id'), revision));
  })
  .delete('/drafts/:id', async c => {
    const [row] = await db.delete(schema.drafts).where(and(eq(schema.drafts.userId, c.get('userId')), eq(schema.drafts.id, c.req.param('id')), eq(schema.drafts.status, 'draft'))).returning();
    if (!row) fail(404, 'Borrador no encontrado o ya confirmado.');
    return c.body(null, 204);
  })
  .get('/proposals', async c => c.json(await db.select().from(schema.proposals).where(eq(schema.proposals.userId, c.get('userId'))).orderBy(desc(schema.proposals.createdAt))))
  .post('/proposals/:id/:action', async c => {
    const action = z.enum(['accept', 'dismiss']).parse(c.req.param('action'));
    return c.json(await db.transaction(async tx => {
      const [proposal] = await tx.select().from(schema.proposals).where(and(eq(schema.proposals.userId, c.get('userId')), eq(schema.proposals.id, c.req.param('id')))).for('update');
      if (!proposal) fail(404, 'Propuesta no encontrada.');
      if (proposal.status !== 'pending') return proposal;
      if (action === 'accept') await applyPayload(tx, c.get('userId'), payloadSchema.parse(proposal.payload), proposal.baseRevision);
      const [saved] = await tx.update(schema.proposals).set({ status: action === 'accept' ? 'accepted' : 'dismissed' }).where(eq(schema.proposals.id, proposal.id)).returning();
      return saved;
    }));
  });
