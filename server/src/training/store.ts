import { HTTPException } from "hono/http-exception";
import { db, schema, eq, and } from "../db/index.ts";
import {
  EMPTY_PROFILE,
  type ProposalPayload,
} from "../../../src/lib/training.ts";
import { newCardFields } from "../../../src/lib/srs.ts";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
export async function ensureState(userId: string, tx: Tx | typeof db = db) {
  const [settings] = await tx
    .select()
    .from(schema.userSettings)
    .where(eq(schema.userSettings.userId, userId));
  await tx
    .insert(schema.trainingState)
    .values({
      userId,
      profile: { ...EMPTY_PROFILE, startedOn: settings?.beltStartDate ?? null },
    })
    .onConflictDoNothing();
}
export async function getState(userId: string) {
  await ensureState(userId);
  const [row] = await db
    .select()
    .from(schema.trainingState)
    .where(eq(schema.trainingState.userId, userId));
  const { userId: _, ...state } = row;
  return state;
}
export function fail(status: 400 | 404 | 409, message: string): never {
  throw new HTTPException(status, { message });
}
export async function checkTechniqueIds(
  userId: string,
  ids: number[],
  tx: Tx | typeof db = db,
) {
  const rows = await tx
    .select({ id: schema.techniques.id })
    .from(schema.techniques)
    .where(eq(schema.techniques.userId, userId));
  const owned = new Set(rows.map((r) => r.id));
  if (ids.some((id) => !owned.has(id)))
    fail(400, "La técnica no pertenece a tu biblioteca.");
}
export async function applyPayload(
  tx: Tx,
  userId: string,
  payload: ProposalPayload,
  revision: number,
) {
  await ensureState(userId, tx);
  const [state] = await tx
    .select()
    .from(schema.trainingState)
    .where(eq(schema.trainingState.userId, userId))
    .for("update");
  if (state.revision !== revision)
    fail(
      409,
      "Tu perfil o plan cambió. Volvé a revisar la propuesta con el coach.",
    );
  if (payload.kind === "profile") state.profile = payload.data;
  if (payload.kind === "goal") {
    // One active focus per modality. Switching explicitly preserves the previous goal as paused.
    state.goals = state.goals
      .filter((g) => g.id !== payload.data.id)
      .map((g) =>
        payload.data.status === "active" &&
        g.style === payload.data.style &&
        g.status === "active"
          ? { ...g, status: "paused" as const }
          : g,
      );
    state.goals.push(payload.data);
    if (state.goals.length > 300)
      fail(400, "Llegaste al límite de objetivos guardados.");
  }
  if (payload.kind === "gameplan") {
    await checkTechniqueIds(
      userId,
      payload.data.nodes.flatMap((n) =>
        n.techniqueId === null ? [] : [n.techniqueId],
      ),
      tx,
    );
    state.gameplans = [
      ...state.gameplans.filter((p) => p.style !== payload.data.style),
      payload.data,
    ];
  }
  const [updated] = await tx
    .update(schema.trainingState)
    .set({
      profile: state.profile,
      goals: state.goals,
      gameplans: state.gameplans,
      revision: revision + 1,
    })
    .where(eq(schema.trainingState.userId, userId))
    .returning();
  return updated;
}
export async function confirmDraft(
  userId: string,
  id: string,
  revision: number,
) {
  return db.transaction(async (tx) => {
    // Serialize library changes for this user so two different drafts cannot create duplicate techniques.
    await ensureState(userId, tx);
    await tx
      .select()
      .from(schema.trainingState)
      .where(eq(schema.trainingState.userId, userId))
      .for("update");
    const [draft] = await tx
      .select()
      .from(schema.drafts)
      .where(and(eq(schema.drafts.userId, userId), eq(schema.drafts.id, id)))
      .for("update");
    if (!draft) fail(404, "Borrador no encontrado.");
    if (draft.status === "confirmed") return draft;
    if (draft.revision !== revision)
      fail(409, "El borrador cambió. Recargá antes de confirmar.");
    if (!draft.data.date)
      fail(400, "Elegí la fecha de la clase antes de confirmar.");
    const existing = await tx
      .select()
      .from(schema.techniques)
      .where(eq(schema.techniques.userId, userId));
    const normalize = (s: string) =>
      s
        .trim()
        .toLocaleLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
    const evidence = [];
    for (const t of draft.data.techniques) {
      let technique = existing.find(
        (e) =>
          normalize(e.name) === normalize(t.name) ||
          (t.catalogId && e.catalogId === t.catalogId),
      );
      const now = Date.now();
      if (!technique) {
        [technique] = await tx
          .insert(schema.techniques)
          .values({
            userId,
            name: t.name,
            position: t.position,
            type: t.type,
            details:
              t.identification === "tentative"
                ? `Identificación provisional. ${t.notes}`
                : t.notes,
            catalogId: t.catalogId,
            createdAt: now,
            updatedAt: now,
            ...newCardFields(),
          })
          .returning();
        existing.push(technique);
      } else if (technique.archived) {
        await tx
          .update(schema.techniques)
          .set({ archived: false })
          .where(eq(schema.techniques.id, technique.id));
      }
      evidence.push({
        techniqueId: technique.id,
        stage: t.stage,
        attempts: t.attempts,
        successes: t.successes,
        notes: t.notes,
      });
    }
    const { techniques: _, goalNotes, ...data } = draft.data;
    const [session] = await tx
      .insert(schema.trainingSessions)
      .values({
        ...data,
        date: data.date!,
        userId,
        techniqueIds: [...new Set(evidence.map((e) => e.techniqueId))],
        evidence,
        goalNotes,
        createdAt: Date.now(),
      })
      .returning();
    const [saved] = await tx
      .update(schema.drafts)
      .set({
        status: "confirmed",
        sessionId: session.id,
        updatedAt: Date.now(),
        revision: revision + 1,
      })
      .where(eq(schema.drafts.id, id))
      .returning();
    return saved;
  });
}
