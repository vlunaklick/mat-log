import { z } from "zod";
import { POSITIONS, TECHNIQUE_TYPES } from "../../../src/lib/types.ts";
export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((s) => {
    const d = new Date(`${s}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
  }, "Fecha inválida");
const note = z.string().max(12000);
export const styleSchema = z.enum(["gi", "nogi"]);
export const stageSchema = z.enum(["seen", "practiced", "applied"]);
export const profileSchema = z.object({
  startedOn: dateSchema.nullable(),
  birthYear: z
    .number()
    .int()
    .min(1900)
    .max(new Date().getFullYear())
    .nullable(),
  heightCm: z.number().min(50).max(260).nullable(),
  weightKg: z.number().min(10).max(400).nullable(),
  preferences: note,
  limitations: note,
  ambitions: note,
  belts: z
    .array(
      z.object({
        belt: z.enum(["white", "blue", "purple", "brown", "black"]),
        date: dateSchema,
      }),
    )
    .max(100),
  breaks: z
    .array(
      z
        .object({ start: dateSchema, end: dateSchema.nullable(), reason: note })
        .refine(
          (b) => !b.end || b.end >= b.start,
          "El fin del parón debe ser posterior al inicio",
        ),
    )
    .max(100),
});
export const goalSchema = z.object({
  id: z.string().min(1).max(100),
  style: styleSchema,
  title: z.string().min(1).max(300),
  action: note,
  status: z.enum(["active", "completed", "paused"]),
  notes: note,
});
export const gameplanSchema = z
  .object({
    style: styleSchema,
    title: z.string().max(300),
    intention: note,
    assessment: note,
    nodes: z
      .array(
        z.object({
          id: z.string().min(1).max(100),
          position: z.string().min(1).max(300),
          action: note,
          opponentResponse: note,
          next: z.array(z.string()).max(30),
          status: z.enum(["learned", "suggested"]),
          techniqueId: z.number().int().positive().nullable(),
          caution: note,
        }),
      )
      .max(100),
  })
  .refine(
    (p) =>
      new Set(p.nodes.map((n) => n.id)).size === p.nodes.length &&
      p.nodes.every((n) =>
        n.next.every((id) => p.nodes.some((m) => m.id === id)),
      ),
    "Las conexiones deben apuntar a pasos existentes con IDs únicos",
  );
export const draftTechniqueSchema = z
  .object({
    name: z.string().min(1).max(300),
    position: z.enum(POSITIONS),
    type: z.enum(TECHNIQUE_TYPES),
    stage: stageSchema,
    notes: note,
    identification: z.enum(["confirmed", "tentative"]),
    catalogId: z.string().max(200).nullable(),
    attempts: z.number().int().min(0).max(10000).nullable(),
    successes: z.number().int().min(0).max(10000).nullable(),
  })
  .refine(
    (t) =>
      t.successes === null || t.attempts === null || t.successes <= t.attempts,
    "Los éxitos no pueden superar los intentos",
  );
export const draftDataSchema = z.object({
  date: dateSchema.nullable(),
  style: styleSchema.nullable(),
  durationMin: z.number().int().min(0).max(1440).nullable(),
  energy: z
    .union([
      z.literal(1),
      z.literal(2),
      z.literal(3),
      z.literal(4),
      z.literal(5),
    ])
    .nullable(),
  classTopic: note,
  whatWorked: note,
  whatFailed: note,
  nextFocus: note,
  goalNotes: note,
  rolls: z
    .array(
      z.object({
        partnerName: z.string().max(300).optional(),
        partnerBelt: z
          .enum(["white", "blue", "purple", "brown", "black"])
          .optional(),
        outcome: z.enum([
          "dominated",
          "won",
          "even",
          "lost",
          "survived",
          "unknown",
        ]),
        stuckIn: z.enum(POSITIONS).optional(),
        notes: note.optional(),
      }),
    )
    .max(100),
  techniques: z.array(draftTechniqueSchema).max(100),
});
export const payloadSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("profile"), data: profileSchema }),
  z.object({ kind: z.literal("goal"), data: goalSchema }),
  z.object({ kind: z.literal("gameplan"), data: gameplanSchema }),
]);
export const revisionSchema = z.number().int().nonnegative();
