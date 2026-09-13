import { Hono } from "hono";
import { z } from "zod";
import { POSITIONS, TECHNIQUE_TYPES } from "../../../src/lib/types.ts";
import { newCardFields } from "../../../src/lib/srs.ts";
import { db, schema, eq } from "../db/index.ts";
import type { AppEnv } from "../middleware.ts";
import { sessionToApi } from "./sessions.ts";
import { techniqueToApi } from "./techniques.ts";
import {
  dateSchema,
  draftDataSchema,
  profileSchema,
  goalSchema,
  gameplanSchema,
  payloadSchema,
  stageSchema,
} from "../training/validation.ts";
import { ensureState } from "../training/store.ts";
const evidenceSchema = z
  .object({
    techniqueId: z.number().int(),
    stage: stageSchema,
    attempts: z.number().int().nonnegative().nullable(),
    successes: z.number().int().nonnegative().nullable(),
    notes: z.string(),
  })
  .refine(
    (e) =>
      e.attempts === null || e.successes === null || e.successes <= e.attempts,
  );
const time = z.number().int().nonnegative();
const importSessionSchema = z.object({
  id: z.number().int().optional(),
  date: dateSchema,
  style: z.enum(["gi", "nogi"]).nullable(),
  durationMin: z.number().int().nonnegative().nullable(),
  classTopic: z.string().default(""),
  techniqueIds: z.array(z.number().int()).default([]),
  rolls: draftDataSchema.shape.rolls.default([]),
  whatWorked: z.string().default(""),
  whatFailed: z.string().default(""),
  nextFocus: z.string().default(""),
  energy: draftDataSchema.shape.energy,
  evidence: z.array(evidenceSchema).default([]),
  goalNotes: z.string().default(""),
  createdAt: time.optional(),
});
const importTechniqueSchema = z.object({
  id: z.number().int().optional(),
  name: z.string().min(1),
  position: z.enum(POSITIONS),
  type: z.enum(TECHNIQUE_TYPES),
  steps: z.string().default(""),
  details: z.string().default(""),
  mistakes: z.string().default(""),
  videoUrl: z.string().optional(),
  catalogId: z.string().optional(),
  archived: z.boolean().default(false),
  createdAt: time.optional(),
  updatedAt: time.optional(),
  ease: z.number().positive().optional(),
  intervalDays: z.number().nonnegative().optional(),
  dueAt: time.optional(),
  reviewCount: z.number().int().nonnegative().optional(),
});
const conversationSchema = z.object({
  id: z.string(),
  title: z.string(),
  createdAt: time,
  updatedAt: time,
});
const draftSchema = z.object({
  id: z.string(),
  conversationId: z.string().nullable(),
  sourceText: z.string(),
  data: draftDataSchema,
  questions: z.array(z.string()),
  status: z.enum(["draft", "confirmed"]),
  sessionId: z.number().int().nullable(),
  revision: z.number().int().nonnegative(),
  createdAt: time,
  updatedAt: time,
});
const proposalSchema = z.object({
  id: z.string(),
  conversationId: z.string().nullable(),
  title: z.string(),
  reason: z.string(),
  payload: payloadSchema,
  baseRevision: z.number().int().nonnegative(),
  status: z.enum(["pending", "accepted", "dismissed"]),
  createdAt: time,
});
export const importSchema = z
  .object({
    version: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    exportedAt: time.optional(),
    sessions: z.array(importSessionSchema).max(50000),
    techniques: z.array(importTechniqueSchema).max(20000),
    settings: z
      .object({
        beltStartDate: dateSchema.optional(),
        weeklyGoalSessions: z.number().int().min(0).max(100).optional(),
      })
      .optional(),
    training: z
      .object({
        profile: profileSchema,
        goals: z.array(goalSchema).max(300),
        gameplans: z.array(gameplanSchema).max(2),
        revision: z.number().int().nonnegative(),
      })
      .optional(),
    conversations: z.array(conversationSchema).max(20000).optional(),
    messages: z
      .array(
        z.object({
          id: z.number().optional(),
          conversationId: z.string().nullable(),
          requestId: z.string().nullable(),
          role: z.enum(["user", "assistant"]),
          content: z.string(),
          createdAt: time,
        }),
      )
      .max(100000)
      .optional(),
    drafts: z.array(draftSchema).max(20000).optional(),
    proposals: z.array(proposalSchema).max(20000).optional(),
  })
  .superRefine((data, ctx) => {
    if (
      data.version === 3 &&
      (!data.training ||
        !data.conversations ||
        !data.messages ||
        !data.drafts ||
        !data.proposals)
    )
      ctx.addIssue({
        code: "custom",
        message: "El backup v3 está incompleto.",
      });
    for (const records of [
      data.techniques,
      data.sessions,
      data.conversations ?? [],
      data.drafts ?? [],
      data.proposals ?? [],
    ]) {
      const ids = records.map((r) => r.id).filter((id) => id !== undefined);
      if (new Set(ids).size !== ids.length)
        ctx.addIssue({
          code: "custom",
          message: "El backup contiene IDs duplicados.",
        });
    }
    const techIds = new Set(data.techniques.map((t) => t.id)),
      convIds = new Set(data.conversations?.map((c) => c.id) ?? []),
      sessionIds = new Set(data.sessions.map((s) => s.id));
    if (
      data.sessions.some(
        (s) =>
          s.techniqueIds.some((id) => !techIds.has(id)) ||
          s.evidence.some(
            (e) =>
              !techIds.has(e.techniqueId) ||
              !s.techniqueIds.includes(e.techniqueId),
          ),
      )
    )
      ctx.addIssue({
        code: "custom",
        message: "Referencias de técnicas inválidas.",
      });
    if (data.version === 3) {
      if (
        [
          ...(data.messages ?? []),
          ...(data.drafts ?? []),
          ...(data.proposals ?? []),
        ].some((r) => r.conversationId && !convIds.has(r.conversationId))
      )
        ctx.addIssue({
          code: "custom",
          message: "Referencia de conversación inválida.",
        });
      if (
        data.drafts?.some(
          (d) => d.sessionId !== null && !sessionIds.has(d.sessionId),
        )
      )
        ctx.addIssue({
          code: "custom",
          message: "Referencia de clase inválida.",
        });
      const plans = [
        ...(data.training?.gameplans ?? []),
        ...(data.proposals ?? []).flatMap((p) =>
          p.payload.kind === "gameplan" ? [p.payload.data] : [],
        ),
      ];
      if (
        plans.some((p) =>
          p.nodes.some(
            (n) => n.techniqueId !== null && !techIds.has(n.techniqueId),
          ),
        )
      )
        ctx.addIssue({
          code: "custom",
          message: "Referencia de gameplan inválida.",
        });
      if (
        new Set(data.training?.gameplans.map((p) => p.style)).size !==
        data.training?.gameplans.length
      )
        ctx.addIssue({
          code: "custom",
          message: "Solo un gameplan por modalidad.",
        });
      for (const style of ["gi", "nogi"])
        if (
          (data.training?.goals.filter(
            (g) => g.style === style && g.status === "active",
          ).length ?? 0) > 1
        )
          ctx.addIssue({
            code: "custom",
            message: "Solo un objetivo activo por modalidad.",
          });
    }
  });
function publicRow<T extends { userId: string }>(row: T): Omit<T, "userId"> {
  const { userId: _, ...data } = row;
  return data;
}
export async function exportData(userId: string) {
  await ensureState(userId);
  // A repeatable-read snapshot keeps references consistent during concurrent edits.
  return db.transaction(
    async (tx) => {
      const sessions = await tx
        .select()
        .from(schema.trainingSessions)
        .where(eq(schema.trainingSessions.userId, userId));
      const techniques = await tx
        .select()
        .from(schema.techniques)
        .where(eq(schema.techniques.userId, userId));
      const [settings] = await tx
        .select()
        .from(schema.userSettings)
        .where(eq(schema.userSettings.userId, userId));
      const [training] = await tx
        .select()
        .from(schema.trainingState)
        .where(eq(schema.trainingState.userId, userId));
      const conversations = await tx
        .select()
        .from(schema.conversations)
        .where(eq(schema.conversations.userId, userId));
      const messages = await tx
        .select()
        .from(schema.chatMessages)
        .where(eq(schema.chatMessages.userId, userId));
      const drafts = await tx
        .select()
        .from(schema.drafts)
        .where(eq(schema.drafts.userId, userId));
      const proposals = await tx
        .select()
        .from(schema.proposals)
        .where(eq(schema.proposals.userId, userId));
      return {
        version: 3,
        exportedAt: Date.now(),
        sessions: sessions.map(sessionToApi),
        techniques: techniques.map(techniqueToApi),
        settings: {
          beltStartDate: settings?.beltStartDate ?? undefined,
          weeklyGoalSessions: settings?.weeklyGoalSessions ?? 3,
        },
        training: publicRow(training),
        conversations: conversations.map(publicRow),
        messages: messages.map(publicRow),
        drafts: drafts.map(publicRow),
        proposals: proposals.map(publicRow),
      };
    },
    { isolationLevel: "repeatable read", accessMode: "read only" },
  );
}
export async function importData(userId: string, input: unknown) {
  const data = importSchema.parse(input);
  await db.transaction(async (tx) => {
    await ensureState(userId, tx);
    const [current] = await tx
      .select()
      .from(schema.trainingState)
      .where(eq(schema.trainingState.userId, userId))
      .for("update");
    if (data.version === 3) {
      await tx
        .delete(schema.proposals)
        .where(eq(schema.proposals.userId, userId));
      await tx.delete(schema.drafts).where(eq(schema.drafts.userId, userId));
      await tx
        .delete(schema.chatMessages)
        .where(eq(schema.chatMessages.userId, userId));
      await tx
        .delete(schema.conversations)
        .where(eq(schema.conversations.userId, userId));
    }
    await tx
      .delete(schema.trainingSessions)
      .where(eq(schema.trainingSessions.userId, userId));
    await tx
      .delete(schema.techniques)
      .where(eq(schema.techniques.userId, userId));
    const techMap = new Map<number, number>(),
      sessionMap = new Map<number, number>(),
      convMap = new Map<string, string>();
    for (const t of data.techniques) {
      const { id, ...fields } = t,
        now = Date.now();
      const [saved] = await tx
        .insert(schema.techniques)
        .values({
          ...newCardFields(),
          ...fields,
          userId,
          createdAt: t.createdAt ?? now,
          updatedAt: t.updatedAt ?? now,
        })
        .returning();
      if (id !== undefined) techMap.set(id, saved.id);
    }
    for (const s of data.sessions) {
      const { id, ...fields } = s;
      const [saved] = await tx
        .insert(schema.trainingSessions)
        .values({
          ...fields,
          userId,
          techniqueIds: s.techniqueIds.map((id) => techMap.get(id)!),
          evidence: s.evidence.map((e) => ({
            ...e,
            techniqueId: techMap.get(e.techniqueId)!,
          })),
          createdAt: s.createdAt ?? Date.now(),
        })
        .returning();
      if (id !== undefined) sessionMap.set(id, saved.id);
    }
    if (data.settings)
      await tx
        .insert(schema.userSettings)
        .values({ userId, ...data.settings })
        .onConflictDoUpdate({
          target: schema.userSettings.userId,
          set: {
            ...data.settings,
            beltStartDate: data.settings.beltStartDate ?? null,
          },
        });
    const remapPlan = (p: z.infer<typeof gameplanSchema>) => ({
      ...p,
      nodes: p.nodes.map((n) => ({
        ...n,
        techniqueId:
          n.techniqueId === null ? null : (techMap.get(n.techniqueId) ?? null),
      })),
    });
    if (data.version === 3) {
      await tx
        .update(schema.trainingState)
        .set({
          ...data.training!,
          gameplans: data.training!.gameplans.map(remapPlan),
        })
        .where(eq(schema.trainingState.userId, userId));
      for (const conversation of data.conversations!) {
        const id = crypto.randomUUID();
        convMap.set(conversation.id, id);
        await tx
          .insert(schema.conversations)
          .values({ ...conversation, id, userId });
      }
      const conversationId = (id: string | null) =>
        id ? convMap.get(id)! : null;
      const requests = new Map<string, string>();
      for (const message of data.messages!) {
        const { id: _, ...fields } = message;
        if (fields.requestId && !requests.has(fields.requestId))
          requests.set(fields.requestId, crypto.randomUUID());
        await tx.insert(schema.chatMessages).values({
          ...fields,
          userId,
          conversationId: conversationId(fields.conversationId),
          requestId: fields.requestId ? requests.get(fields.requestId)! : null,
        });
      }
      for (const draft of data.drafts!)
        await tx.insert(schema.drafts).values({
          ...draft,
          id: crypto.randomUUID(),
          userId,
          conversationId: conversationId(draft.conversationId),
          sessionId: draft.sessionId ? sessionMap.get(draft.sessionId)! : null,
        });
      for (const proposal of data.proposals!)
        await tx.insert(schema.proposals).values({
          ...proposal,
          id: crypto.randomUUID(),
          userId,
          conversationId: conversationId(proposal.conversationId),
          payload:
            proposal.payload.kind === "gameplan"
              ? { kind: "gameplan", data: remapPlan(proposal.payload.data) }
              : proposal.payload,
        });
    } else {
      // Legacy backups replace their own resources only, preserving conversations and unfinished drafts.
      await tx
        .update(schema.trainingState)
        .set({
          gameplans: current.gameplans.map((p) => ({
            ...p,
            nodes: p.nodes.map((n) => ({ ...n, techniqueId: null })),
          })),
          revision: current.revision + 1,
        })
        .where(eq(schema.trainingState.userId, userId));
      const oldProposals = await tx
        .select()
        .from(schema.proposals)
        .where(eq(schema.proposals.userId, userId));
      for (const proposal of oldProposals)
        await tx
          .update(schema.proposals)
          .set({
            status:
              proposal.status === "pending" ? "dismissed" : proposal.status,
            payload:
              proposal.payload.kind === "gameplan"
                ? {
                    kind: "gameplan",
                    data: {
                      ...proposal.payload.data,
                      nodes: proposal.payload.data.nodes.map((n) => ({
                        ...n,
                        techniqueId: null,
                      })),
                    },
                  }
                : proposal.payload,
          })
          .where(eq(schema.proposals.id, proposal.id));
    }
  });
}
export const backupRoute = new Hono<AppEnv>()
  .get("/export", async (c) => c.json(await exportData(c.get("userId"))))
  .post("/import", async (c) => {
    await importData(c.get("userId"), await c.req.json());
    return c.body(null, 204);
  });
