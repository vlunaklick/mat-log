import { daysBetween, todayISO } from "./date";
import type { Position, RollOutcome, Session, Settings, Technique } from "./types";

const BELTS = ["white", "blue", "purple", "brown", "black"] as const;
type Belt = (typeof BELTS)[number];

function addDaysISO(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/** Monday of the week containing the given ISO date. */
export function weekStartISO(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const day = date.getDay(); // 0 = Sunday
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function totalMatHours(sessions: Session[]): number {
  return sessions.reduce((sum, s) => sum + s.durationMin, 0) / 60;
}

export function sessionCount(sessions: Session[]): number {
  return sessions.length;
}

export function sessionsInLastDays(sessions: Session[], days: number): number {
  const today = todayISO();
  return sessions.filter((s) => {
    const diff = daysBetween(s.date, today);
    return diff >= 0 && diff < days;
  }).length;
}

export function weeklyCounts(
  sessions: Session[],
  weeks = 12,
): Array<{ weekStart: string; count: number; minutes: number }> {
  const currentWeekStart = weekStartISO(todayISO());
  const starts: string[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    starts.push(addDaysISO(currentWeekStart, -7 * i));
  }
  const buckets = new Map<string, { count: number; minutes: number }>();
  for (const start of starts) buckets.set(start, { count: 0, minutes: 0 });
  for (const s of sessions) {
    const start = weekStartISO(s.date);
    const bucket = buckets.get(start);
    if (bucket) {
      bucket.count += 1;
      bucket.minutes += s.durationMin;
    }
  }
  return starts.map((weekStart) => ({ weekStart, ...buckets.get(weekStart)! }));
}

export function weekStreak(sessions: Session[]): number {
  const weekStarts = new Set(sessions.map((s) => weekStartISO(s.date)));
  const currentWeekStart = weekStartISO(todayISO());
  let streak = 0;
  let cursor = currentWeekStart;
  while (weekStarts.has(cursor)) {
    streak += 1;
    cursor = addDaysISO(cursor, -7);
  }
  return streak;
}

export function stuckPositions(sessions: Session[]): Array<{ position: Position; count: number }> {
  const counts = new Map<Position, number>();
  for (const s of sessions) {
    for (const r of s.rolls) {
      if (!r.stuckIn) continue;
      counts.set(r.stuckIn, (counts.get(r.stuckIn) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([position, count]) => ({ position, count }))
    .sort((a, b) => b.count - a.count);
}

export function rollOutcomes(sessions: Session[]): Record<RollOutcome, number> {
  const result: Record<RollOutcome, number> = { dominated: 0, won: 0, even: 0, lost: 0, survived: 0 };
  for (const s of sessions) {
    for (const r of s.rolls) {
      result[r.outcome] += 1;
    }
  }
  return result;
}

export function outcomesByBelt(
  sessions: Session[],
): Array<{ belt: Belt; rolls: number; lostOrSurvived: number; wonOrDominated: number }> {
  const byBelt = new Map<Belt, { rolls: number; lostOrSurvived: number; wonOrDominated: number }>();
  for (const s of sessions) {
    for (const r of s.rolls) {
      if (!r.partnerBelt) continue;
      const entry = byBelt.get(r.partnerBelt) ?? { rolls: 0, lostOrSurvived: 0, wonOrDominated: 0 };
      entry.rolls += 1;
      if (r.outcome === "lost" || r.outcome === "survived") entry.lostOrSurvived += 1;
      if (r.outcome === "won" || r.outcome === "dominated") entry.wonOrDominated += 1;
      byBelt.set(r.partnerBelt, entry);
    }
  }
  return BELTS.filter((b) => byBelt.has(b)).map((belt) => ({ belt, ...byBelt.get(belt)! }));
}

export function giVsNogi(sessions: Session[]): { gi: number; nogi: number } {
  return sessions.reduce(
    (acc, s) => {
      if (s.style === "gi") acc.gi += s.durationMin;
      else acc.nogi += s.durationMin;
      return acc;
    },
    { gi: 0, nogi: 0 },
  );
}

export function recentFocus(sessions: Session[], n = 5): Array<{ date: string; nextFocus: string }> {
  return sessions
    .filter((s) => s.nextFocus.trim() !== "")
    .slice()
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
    .slice(0, n)
    .map((s) => ({ date: s.date, nextFocus: s.nextFocus }));
}

export function techniqueDrillCounts(
  sessions: Session[],
  techniques: Technique[],
): Array<{ technique: Technique; count: number }> {
  const counts = new Map<number, number>();
  for (const s of sessions) {
    for (const id of s.techniqueIds) {
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
  }
  return techniques
    .filter((t) => t.id !== undefined && counts.has(t.id))
    .map((t) => ({ technique: t, count: counts.get(t.id!) ?? 0 }))
    .sort((a, b) => b.count - a.count);
}

function truncate(s: string, max: number): string {
  const trimmed = s.trim();
  return trimmed.length > max ? `${trimmed.slice(0, max - 1)}…` : trimmed;
}

export function buildCoachSummary(sessions: Session[], techniques: Technique[], settings: Settings): string {
  const today = todayISO();
  const last30 = sessions.filter((s) => {
    const diff = daysBetween(s.date, today);
    return diff >= 0 && diff < 30;
  });

  const lines: string[] = [];

  if (settings.beltStartDate) {
    const months = Math.max(0, Math.round(daysBetween(settings.beltStartDate, today) / 30));
    lines.push(`Training since ${settings.beltStartDate} (~${months} months).`);
  }

  lines.push(`Last 30 days: ${last30.length} sessions, ${totalMatHours(last30).toFixed(1)} mat hours.`);

  const gn = giVsNogi(last30);
  lines.push(`Gi vs no-gi minutes: gi ${gn.gi}, nogi ${gn.nogi}.`);
  lines.push(`Current week streak: ${weekStreak(sessions)} weeks.`);

  const stuck = stuckPositions(last30).slice(0, 3);
  if (stuck.length) {
    lines.push(`Top stuck positions: ${stuck.map((p) => `${p.position} (${p.count})`).join(", ")}.`);
  }

  const outcomes = rollOutcomes(last30);
  lines.push(
    `Roll outcomes: dominated ${outcomes.dominated}, won ${outcomes.won}, even ${outcomes.even}, lost ${outcomes.lost}, survived ${outcomes.survived}.`,
  );

  const byBelt = outcomesByBelt(last30);
  if (byBelt.length) {
    lines.push(
      `Outcomes by belt: ${byBelt
        .map((b) => `${b.belt} (${b.rolls} rolls, ${b.wonOrDominated} won/dominated, ${b.lostOrSurvived} lost/survived)`)
        .join("; ")}.`,
    );
  }

  const drilled = techniqueDrillCounts(last30, techniques).slice(0, 5);
  if (drilled.length) {
    lines.push(`Most drilled: ${drilled.map((d) => `${d.technique.name} (${d.count})`).join(", ")}.`);
  }

  const focus = recentFocus(sessions, 5);
  if (focus.length) {
    lines.push("Recent focus:");
    for (const f of focus) lines.push(`- ${f.date}: ${truncate(f.nextFocus, 120)}`);
  }

  const lastFive = sessions
    .slice()
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
    .slice(0, 5);
  if (lastFive.length) {
    lines.push("Last sessions notes:");
    for (const s of lastFive) {
      const worked = s.whatWorked.trim() ? truncate(s.whatWorked, 120) : "-";
      const failed = s.whatFailed.trim() ? truncate(s.whatFailed, 120) : "-";
      lines.push(`- ${s.date}: worked: ${worked} | failed: ${failed}`);
    }
  }

  const summary = lines.join("\n");
  return summary.length > 2500 ? `${summary.slice(0, 2499)}…` : summary;
}
