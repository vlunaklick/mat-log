import type { Technique } from "./types";

export type Grade = "again" | "hard" | "good" | "easy";

const MIN_EASE = 1.3;
const MAX_EASE = 3.0;
const TEN_MINUTES_MS = 10 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export function newCardFields(): Pick<Technique, "ease" | "intervalDays" | "dueAt" | "reviewCount"> {
  return { ease: 2.5, intervalDays: 0, dueAt: Date.now(), reviewCount: 0 };
}

export function schedule(
  t: Pick<Technique, "ease" | "intervalDays" | "reviewCount">,
  grade: Grade,
  now = Date.now(),
): { ease: number; intervalDays: number; dueAt: number; reviewCount: number } {
  const reviewCount = t.reviewCount + 1;

  if (grade === "again") {
    const ease = Math.max(MIN_EASE, t.ease - 0.2);
    return { ease, intervalDays: 0, dueAt: now + TEN_MINUTES_MS, reviewCount };
  }

  if (grade === "hard") {
    const ease = Math.max(MIN_EASE, t.ease - 0.15);
    const intervalDays = Math.max(1, Math.round(t.intervalDays * 1.2));
    return { ease, intervalDays, dueAt: now + intervalDays * DAY_MS, reviewCount };
  }

  if (grade === "good") {
    const ease = Math.min(MAX_EASE, t.ease);
    let intervalDays: number;
    if (t.reviewCount === 0) intervalDays = 1;
    else if (t.reviewCount === 1) intervalDays = 3;
    else intervalDays = Math.round(t.intervalDays * t.ease);
    return { ease, intervalDays, dueAt: now + intervalDays * DAY_MS, reviewCount };
  }

  // easy
  const ease = Math.min(MAX_EASE, t.ease + 0.15);
  let base: number;
  if (t.reviewCount === 0) base = 1;
  else if (t.reviewCount === 1) base = 3;
  else base = Math.round(t.intervalDays * t.ease);
  const intervalDays = Math.max(1, Math.round(base * 1.3));
  return { ease, intervalDays, dueAt: now + intervalDays * DAY_MS, reviewCount };
}
