export type Style = "gi" | "nogi";

export const POSITIONS = [
  "Standing / Takedowns",
  "Closed Guard",
  "Open Guard",
  "Half Guard",
  "Side Control",
  "Mount",
  "Back",
  "Turtle",
  "Guard Passing",
  "Leg Entanglements",
  "Escapes",
  "Other",
] as const;
export type Position = (typeof POSITIONS)[number];

export const TECHNIQUE_TYPES = ["submission", "sweep", "pass", "escape", "takedown", "control", "concept"] as const;
export type TechniqueType = (typeof TECHNIQUE_TYPES)[number];

export interface Technique {
  id?: number;
  name: string;
  position: Position;
  type: TechniqueType;
  /** Step by step notes in the user's own words. */
  steps: string;
  /** Key details that make it work. Shown on the back of the flashcard. */
  details: string;
  /** Common mistakes the user makes. */
  mistakes: string;
  videoUrl?: string;
  createdAt: number;
  updatedAt: number;
  // Spaced repetition (SM-2 style)
  ease: number; // starts at 2.5
  intervalDays: number; // 0 = never reviewed
  dueAt: number; // epoch ms; new cards are due immediately
  reviewCount: number;
}

export type RollOutcome = "dominated" | "won" | "even" | "lost" | "survived";

export interface Roll {
  partnerName?: string;
  partnerBelt?: "white" | "blue" | "purple" | "brown" | "black";
  outcome: RollOutcome;
  /** Position where the user felt weakest / got stuck. */
  stuckIn?: Position;
  notes?: string;
}

export interface Session {
  id?: number;
  date: string; // YYYY-MM-DD
  style: Style;
  durationMin: number;
  /** Free text: what the class covered. */
  classTopic: string;
  /** Technique ids drilled in this class. */
  techniqueIds: number[];
  rolls: Roll[];
  whatWorked: string;
  whatFailed: string;
  /** The single thing to focus on next class. */
  nextFocus: string;
  energy: 1 | 2 | 3 | 4 | 5;
  createdAt: number;
}

export interface Settings {
  id: "settings";
  geminiApiKey?: string;
  beltStartDate?: string; // YYYY-MM-DD, when the user started training
  weeklyGoalSessions: number;
}

export interface ChatMessage {
  id?: number;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
}
