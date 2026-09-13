import type { Belt } from "./training";
import type { Position, RollOutcome, Style, TechniqueType } from "./types";

export const STYLE_LABELS: Record<Style, string> = { gi: "Gi", nogi: "No-gi" };

export const POSITION_LABELS: Record<Position, string> = {
  "Standing / Takedowns": "De pie y derribos",
  "Closed Guard": "Guardia cerrada",
  "Open Guard": "Guardia abierta",
  "Half Guard": "Media guardia",
  "Side Control": "Cien kilos",
  Mount: "Montada",
  Back: "Espalda",
  Turtle: "Tortuga",
  "Guard Passing": "Pasaje de guardia",
  "Leg Entanglements": "Enredos de piernas",
  Escapes: "Escapes",
  Other: "Otra",
};

export const TECHNIQUE_TYPE_LABELS: Record<TechniqueType, string> = {
  submission: "Finalización",
  sweep: "Raspado",
  pass: "Pasaje",
  escape: "Escape",
  takedown: "Derribo",
  control: "Control",
  concept: "Concepto",
};

export const OUTCOME_LABELS: Record<RollOutcome, string> = {
  dominated: "Dominé",
  won: "Gané",
  even: "Parejo",
  lost: "Perdí",
  survived: "Sobreviví",
  unknown: "Sin registrar",
};

export const BELT_LABELS: Record<Belt, string> = {
  white: "Blanco",
  blue: "Azul",
  purple: "Violeta",
  brown: "Marrón",
  black: "Negro",
};

/** Falls back to the raw value for strings outside the known set (e.g. catalog data). */
export function label<K extends string>(map: Record<K, string>, value: string | null | undefined, fallback = "—"): string {
  if (!value) return fallback;
  return (map as Record<string, string>)[value] ?? value;
}
