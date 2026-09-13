import Dexie, { type EntityTable } from "dexie";
import type { ChatMessage, Session, Settings, Technique } from "./types";

export const db = new Dexie("matlog") as Dexie & {
  sessions: EntityTable<Session, "id">;
  techniques: EntityTable<Technique, "id">;
  settings: EntityTable<Settings, "id">;
  chat: EntityTable<ChatMessage, "id">;
};

db.version(1).stores({
  sessions: "++id, date, style, createdAt",
  techniques: "++id, name, position, type, dueAt, updatedAt",
  settings: "id",
  chat: "++id, createdAt",
});

export const DEFAULT_SETTINGS: Settings = { id: "settings", weeklyGoalSessions: 3 };

export async function getSettings(): Promise<Settings> {
  return (await db.settings.get("settings")) ?? DEFAULT_SETTINGS;
}

export async function saveSettings(patch: Partial<Settings>): Promise<void> {
  const current = await getSettings();
  await db.settings.put({ ...current, ...patch, id: "settings" });
}

/** Export everything as a JSON string for backup. */
export async function exportAll(): Promise<string> {
  const [sessions, techniques, settings] = await Promise.all([
    db.sessions.toArray(),
    db.techniques.toArray(),
    getSettings(),
  ]);
  const { geminiApiKey: _omit, ...safeSettings } = settings;
  return JSON.stringify({ version: 1, exportedAt: Date.now(), sessions, techniques, settings: safeSettings }, null, 2);
}

/** Replace all data with the contents of a backup produced by exportAll. */
export async function importAll(json: string): Promise<void> {
  const data = JSON.parse(json) as { sessions: Session[]; techniques: Technique[]; settings?: Partial<Settings> };
  await db.transaction("rw", db.sessions, db.techniques, db.settings, async () => {
    await db.sessions.clear();
    await db.techniques.clear();
    await db.sessions.bulkAdd(data.sessions);
    await db.techniques.bulkAdd(data.techniques);
    if (data.settings) await saveSettings(data.settings);
  });
}
