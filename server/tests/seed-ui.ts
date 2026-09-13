import { db, schema, eq } from "../src/db/index.ts";
import { importData } from "../src/routes/backup.ts";
import { EMPTY_PROFILE } from "../../src/lib/training.ts";
if (!process.env.DATABASE_URL?.includes("matlog_companion_test"))
  throw new Error("Use the disposable matlog_companion_test database.");
const [user] = await db
  .select()
  .from(schema.user)
  .where(eq(schema.user.email, "companion-test@example.test"));
if (!user)
  throw new Error(
    "Create companion-test@example.test in the disposable database first.",
  );
const now = Date.now();
const profile = {
  ...EMPTY_PROFILE,
  startedOn: "2025-12-01",
  heightCm: 178,
  weightKg: 78,
  preferences: "Me gusta pasar guardia y controlar arriba.",
  belts: [{ belt: "white", date: "2025-12-01" }],
  breaks: [{ start: "2026-04-01", end: "2026-05-01", reason: "Viaje" }],
};
const plan = {
  style: "nogi",
  title: "Llegar arriba y controlar",
  intention: "Buscar el derribo, pasar y llegar a montada.",
  assessment:
    "Probá la conexión entre pase y control. Si perdés el underhook, priorizá recuperar la posición.",
  nodes: [
    {
      id: "a",
      position: "Standing / Takedowns",
      action: "Single leg",
      opponentResponse: "El rival hace sprawl",
      next: ["b", "c"],
      status: "learned",
      techniqueId: null,
      caution: "No quedarme extendido debajo del rival.",
    },
    {
      id: "b",
      position: "Half Guard",
      action: "Recuperar underhook",
      opponentResponse: "Bloquea mi brazo",
      next: ["c"],
      status: "suggested",
      techniqueId: null,
      caution: "Preguntar al profesor cómo recuperar el ángulo.",
    },
    {
      id: "c",
      position: "Guard Passing",
      action: "Knee cut",
      opponentResponse: "Recupera la rodilla",
      next: ["d"],
      status: "learned",
      techniqueId: null,
      caution: "No perder el control de cadera.",
    },
    {
      id: "d",
      position: "Mount",
      action: "Estabilizar antes de atacar",
      opponentResponse: "Puentea",
      next: ["c"],
      status: "suggested",
      techniqueId: null,
      caution: "Aceptar volver a lateral si hace falta.",
    },
  ],
};
await importData(user.id, {
  version: 3,
  sessions: [],
  techniques: [],
  settings: { weeklyGoalSessions: 3 },
  training: {
    profile,
    revision: 0,
    goals: [
      {
        id: "focus",
        style: "nogi",
        title: "Recuperar guardia desde lateral",
        action: "Intentar recuperar el frame interior durante los rolls.",
        status: "active",
        notes: "Observar si consigo espacio antes de mover la cadera.",
      },
    ],
    gameplans: [plan],
  },
  conversations: [
    { id: "c", title: "Mi clase de no-gi", createdAt: now, updatedAt: now },
  ],
  messages: [
    {
      conversationId: "c",
      requestId: null,
      role: "user",
      content: "Hoy practicamos mata león. No recuerdo cuántos rolls hice.",
      createdAt: now,
    },
  ],
  drafts: [
    {
      id: "d",
      conversationId: "c",
      sourceText: "Hoy practicamos mata león. No recuerdo cuántos rolls hice.",
      data: {
        date: "2026-09-13",
        style: "nogi",
        durationMin: null,
        energy: null,
        classTopic: "Control de espalda y mata león",
        whatWorked: "Mantener el seatbelt",
        whatFailed: "Perdí los ganchos",
        nextFocus: "Recuperar los ganchos antes de atacar",
        goalNotes: "",
        rolls: [
          {
            partnerName: "Juan",
            outcome: "unknown",
            notes: "Me sacó de la espalda",
          },
        ],
        techniques: [
          {
            name: "Rear naked choke",
            position: "Back",
            type: "submission",
            stage: "practiced",
            notes: "Primero controlar la espalda.",
            identification: "confirmed",
            catalogId: null,
            attempts: null,
            successes: null,
          },
        ],
      },
      questions: ["¿Recordás cuánto duró la clase?"],
      status: "draft",
      sessionId: null,
      revision: 0,
      createdAt: now,
      updatedAt: now,
    },
  ],
  proposals: [
    {
      id: "p",
      conversationId: "c",
      title: "Foco para la próxima clase",
      reason: "Se repitió la pérdida de ganchos.",
      payload: {
        kind: "goal",
        data: {
          id: "focus",
          style: "nogi",
          title: "Mantener el control de espalda",
          action: "Recuperar los ganchos antes de atacar.",
          status: "active",
          notes: "",
        },
      },
      baseRevision: 0,
      status: "pending",
      createdAt: now,
    },
  ],
});
console.log("Seeded disposable UI account.");
await db.$client.end();
