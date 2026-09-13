import { Hono } from 'hono';
import { z } from 'zod';
import { db, schema, eq, and, desc, sql } from '../db/index.ts';
import type { AppEnv } from '../middleware.ts';
import { fail } from '../training/store.ts';
import { dateSchema } from '../training/validation.ts';
import { respond } from '../training/assistant.ts';
import { catalog } from '../training/catalog.ts';

export const chatRoute = new Hono<AppEnv>()
  .get('/conversations', async c => {
    const userId = c.get('userId'), q = (c.req.query('q') ?? '').slice(0, 200);
    const rows = await db.select().from(schema.conversations).where(and(eq(schema.conversations.userId, userId), q ? sql`(${schema.conversations.title} ilike ${`%${q}%`} or exists (select 1 from chat_message m where m.conversation_id = ${schema.conversations.id} and m.user_id = ${userId} and to_tsvector('simple', m.content) @@ websearch_to_tsquery('simple', ${q})))` : undefined)).orderBy(desc(schema.conversations.updatedAt));
    return c.json(rows);
  })
  .post('/conversations', async c => {
    const { title } = z.object({ title: z.string().trim().min(1).max(150).default('Nueva conversación') }).parse(await c.req.json());
    const now = Date.now();
    const [row] = await db.insert(schema.conversations).values({ id: crypto.randomUUID(), userId: c.get('userId'), title, createdAt: now, updatedAt: now }).returning();
    return c.json(row, 201);
  })
  .get('/chat', async c => {
    const conversationId = c.req.query('conversationId');
    return c.json(await db.select().from(schema.chatMessages).where(and(eq(schema.chatMessages.userId, c.get('userId')), conversationId ? eq(schema.chatMessages.conversationId, conversationId) : undefined)).orderBy(schema.chatMessages.createdAt, schema.chatMessages.id));
  })
  .post('/coach', async c => {
    const body = z.object({ message: z.string().trim().min(1).max(20000), conversationId: z.string().min(1), requestId: z.string().uuid(),
      draftId: z.string().nullable().default(null), localDate: dateSchema, mode: z.enum(['chat','log','profile','gameplan','today']).default('chat') }).parse(await c.req.json());
    const userId = c.get('userId');
    const [conversation] = await db.select().from(schema.conversations).where(and(eq(schema.conversations.id, body.conversationId), eq(schema.conversations.userId, userId)));
    if (!conversation) fail(404, 'Conversación no encontrada.');
    // A short transaction protects idempotent insertion; a separate advisory lock protects model generation.
    await db.transaction(async tx => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${userId}), hashtext(${body.requestId}))`);
      const [old] = await tx.select().from(schema.chatMessages).where(and(eq(schema.chatMessages.userId, userId), eq(schema.chatMessages.requestId, body.requestId), eq(schema.chatMessages.role, 'user')));
      if (old && (old.content !== body.message || old.conversationId !== body.conversationId)) fail(409, 'Ese envío ya se usó para otro mensaje.');
      if (!old) await tx.insert(schema.chatMessages).values({ userId, conversationId: body.conversationId, requestId: body.requestId, role: 'user', content: body.message, createdAt: Date.now() });
    });
    try {
      const result = await db.transaction(async tx => {
        const lock = await tx.execute(sql`select pg_try_advisory_xact_lock(hashtext(${userId}), hashtext(${body.conversationId})) as acquired`);
        if (!lock.rows[0]?.acquired) fail(409, 'El coach está respondiendo en esta conversación. Esperá y reintentá.');
        const [existing] = await tx.select().from(schema.chatMessages).where(and(eq(schema.chatMessages.userId, userId), eq(schema.chatMessages.requestId, body.requestId), eq(schema.chatMessages.role, 'assistant')));
        if (existing) return { message: existing };
        const { output, baseRevision, selectedDraft } = await respond(userId, body.conversationId, body.draftId, body.localDate, body.mode);
        let draft = null, proposal = null;
        if (output.draft) {
          for (const technique of output.draft.data.techniques) {
            if (technique.catalogId && !catalog.some(e => e.id === technique.catalogId)) technique.catalogId = null;
          }
          const now = Date.now();
          if (output.draft.targetId) {
            if (!selectedDraft || selectedDraft.id !== output.draft.targetId) fail(409, 'Abrí el borrador para actualizarlo.');
            [draft] = await tx.update(schema.drafts).set({ data: output.draft.data, questions: output.draft.questions,
              sourceText: `${selectedDraft.sourceText}\n\n${body.message}`, revision: selectedDraft.revision + 1, updatedAt: now })
              .where(and(eq(schema.drafts.id, selectedDraft.id), eq(schema.drafts.userId, userId), eq(schema.drafts.revision, selectedDraft.revision), eq(schema.drafts.status, 'draft'))).returning();
            if (!draft) fail(409, 'El borrador cambió mientras el coach respondía. Reintentá.');
          } else {
            [draft] = await tx.insert(schema.drafts).values({ id: crypto.randomUUID(), userId, conversationId: body.conversationId,
              sourceText: body.message, data: output.draft.data, questions: output.draft.questions, createdAt: now, updatedAt: now }).returning();
          }
        }
        if (output.proposal) [proposal] = await tx.insert(schema.proposals).values({ id: crypto.randomUUID(), userId, conversationId: body.conversationId, ...output.proposal, baseRevision, createdAt: Date.now() }).returning();
        const [message] = await tx.insert(schema.chatMessages).values({ userId, conversationId: body.conversationId, requestId: body.requestId, role: 'assistant', content: output.reply, createdAt: Date.now() }).returning();
        await tx.update(schema.conversations).set({ updatedAt: Date.now() }).where(eq(schema.conversations.id, body.conversationId));
        return { message, draft, proposal };
      });
      return c.json(result);
    } catch (error) {
      if (error instanceof Error && 'status' in error) throw error;
      console.error('Coach generation failed', error);
      return c.json({ error: 'El coach no pudo completar la respuesta. Tu mensaje quedó guardado; podés reintentar.' }, 502);
    }
  });
