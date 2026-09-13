import type { Position, Style, TechniqueType } from "./types";

export type Stage = "seen" | "practiced" | "applied";
export const STAGE_LABELS: Record<Stage, string> = {
  seen: "Vista en clase",
  practiced: "Practicada",
  applied: "Aplicada en roll",
};
export type Belt = "white" | "blue" | "purple" | "brown" | "black";
export interface Profile {
  startedOn: string | null;
  birthYear: number | null;
  heightCm: number | null;
  weightKg: number | null;
  preferences: string;
  limitations: string;
  ambitions: string;
  belts: Array<{ belt: Belt; date: string }>;
  breaks: Array<{ start: string; end: string | null; reason: string }>;
}
export const EMPTY_PROFILE: Profile = {
  startedOn: null,
  birthYear: null,
  heightCm: null,
  weightKg: null,
  preferences: "",
  limitations: "",
  ambitions: "",
  belts: [],
  breaks: [],
};
export interface Goal {
  id: string;
  style: Style;
  title: string;
  action: string;
  status: "active" | "completed" | "paused";
  notes: string;
}
export interface PlanNode {
  id: string;
  position: string;
  action: string;
  opponentResponse: string;
  next: string[];
  status: "learned" | "suggested";
  techniqueId: number | null;
  caution: string;
}
export interface Gameplan {
  style: Style;
  title: string;
  intention: string;
  assessment: string;
  nodes: PlanNode[];
}
export interface DraftTechnique {
  name: string;
  position: Position;
  type: TechniqueType;
  stage: Stage;
  notes: string;
  identification: "confirmed" | "tentative";
  catalogId: string | null;
  attempts: number | null;
  successes: number | null;
}
export interface DraftData {
  date: string | null;
  style: Style | null;
  durationMin: number | null;
  energy: 1 | 2 | 3 | 4 | 5 | null;
  classTopic: string;
  whatWorked: string;
  whatFailed: string;
  nextFocus: string;
  rolls: Array<{
    partnerName?: string;
    partnerBelt?: Belt;
    outcome: "dominated" | "won" | "even" | "lost" | "survived" | "unknown";
    stuckIn?: Position;
    notes?: string;
  }>;
  techniques: DraftTechnique[];
  goalNotes: string;
}
export interface Draft {
  id: string;
  sourceText: string;
  data: DraftData;
  questions: string[];
  status: "draft" | "confirmed";
  sessionId: number | null;
  conversationId: string | null;
  revision: number;
  createdAt: number;
  updatedAt: number;
}
export type ProposalPayload =
  | { kind: "profile"; data: Profile }
  | { kind: "goal"; data: Goal }
  | { kind: "gameplan"; data: Gameplan };
export interface Proposal {
  id: string;
  title: string;
  reason: string;
  payload: ProposalPayload;
  baseRevision: number;
  status: "pending" | "accepted" | "dismissed";
  conversationId: string | null;
  createdAt: number;
}
export interface TrainingState {
  profile: Profile;
  goals: Goal[];
  gameplans: Gameplan[];
  revision: number;
}
export interface Conversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
}
export interface CoachMessage {
  id: number;
  conversationId: string | null;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
  requestId: string | null;
}
export interface CatalogEntry {
  id: string;
  name: string;
  aliases: string[];
  position: Position;
  type: TechniqueType;
  style: Style | "both";
  description: string;
  tags: string[];
  source: "GrappleMap" | "Mat Log";
  sourceUrl: string;
  references: string[];
  kind: "position" | "transition" | "technique";
}
export interface TechniqueEvidence {
  techniqueId: number;
  stage: Stage;
  attempts: number | null;
  successes: number | null;
  notes: string;
}

/** Union of pause intervals: overlapping breaks are only subtracted once. End dates are exclusive. */
export function trainingDays(
  profile: Profile,
  today: string,
): { elapsed: number; paused: number; active: number } | null {
  if (!profile.startedOn) return null;
  const day = (s: string) => Date.parse(`${s}T00:00:00Z`) / 86400000;
  const start = day(profile.startedOn),
    end = day(today);
  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end)
    return null;
  const intervals = profile.breaks
    .map((b) => [
      Math.max(start, day(b.start)),
      Math.min(end, day(b.end ?? today)),
    ])
    .filter(([a, b]) => b > a)
    .sort((a, b) => a[0] - b[0]);
  let paused = 0,
    cursor = start;
  for (const [a, b] of intervals) {
    paused += Math.max(0, b - Math.max(cursor, a));
    cursor = Math.max(cursor, b);
  }
  return { elapsed: end - start, paused, active: end - start - paused };
}
export function techniqueProgress(evidence: TechniqueEvidence[]): Stage {
  return evidence.some((e) => e.stage === "applied")
    ? "applied"
    : evidence.some((e) => e.stage === "practiced")
      ? "practiced"
      : "seen";
}
export function practiceTotals(evidence: TechniqueEvidence[]) {
  const measured = evidence.filter(
    (e) => e.attempts !== null && e.successes !== null,
  );
  const attempts = measured.reduce((n, e) => n + e.attempts!, 0);
  const successes = measured.reduce((n, e) => n + e.successes!, 0);
  return {
    attempts,
    successes,
    rate: attempts > 0 ? successes / attempts : null,
    measuredSessions: measured.length,
  };
}
