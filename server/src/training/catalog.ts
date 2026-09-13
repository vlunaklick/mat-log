import { readFileSync } from "node:fs";
import type { CatalogEntry } from "../../../src/lib/training.ts";
import { STARTER } from "../seed-data.ts";
const imported = JSON.parse(
  readFileSync(new URL("../data/catalog.json", import.meta.url), "utf8"),
) as { entries: CatalogEntry[]; commit: string };
/** Indexed like STARTER; English names stay searchable. */
const aliases: string[][] = [
  ["hip escape", "shrimp", "camaron"],
  ["bridge and roll", "puente"],
  ["elbow-knee escape"],
  ["side control escape", "escape de lateral"],
  ["scissor sweep"],
  ["hip bump sweep"],
  ["cross collar choke", "solapas"],
  ["armbar", "armlock"],
  ["knee cut", "knee slice", "pase de rodilla"],
  ["guard retention"],
  ["rear naked choke", "rnc", "mataleon"],
  ["double leg", "double leg takedown"],
];
const starters: CatalogEntry[] = STARTER.map((t, i) => ({
  id: `ml-${i}`,
  name: t.name,
  aliases: aliases[i] ?? [],
  position: t.position,
  type: t.type,
  style: /cruzada|tijera|knee cut/i.test(t.name) ? "gi" : "both",
  description: `${t.steps}\n\n${t.details}\n\nErrores comunes: ${t.mistakes}`,
  tags: [],
  source: "Mat Log",
  sourceUrl: "https://github.com/vlunaklick/mat-log",
  references: [],
  kind: "technique",
}));
export const catalog = [...starters, ...imported.entries];
export const catalogSources = [
  {
    name: "GrappleMap",
    url: "https://eel.is/GrappleMap/",
    description: `${imported.entries.length} posiciones y transiciones de no-gi. Datos de dominio público; no son ${imported.entries.length} técnicas distintas.`,
    imported: true,
  },
  {
    name: "Submission Searcher",
    url: "https://submissionsearcher.com/",
    description:
      "Buscador externo de videos. Consultá el nombre de la técnica; el contenido no se copia a Mat Log.",
    imported: false,
  },
  {
    name: "BJJ Mental Models",
    url: "https://www.bjjmentalmodels.com/database",
    description:
      "Referencia externa de conceptos y principios. El contenido no se copia a Mat Log.",
    imported: false,
  },
];
const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replaceAll("_", " ");
export function searchCatalog(
  query = "",
  style = "all",
  position = "all",
  offset = 0,
  limit = 24,
) {
  const tokens = normalize(query).split(/\s+/).filter(Boolean);
  const expanded = tokens.map(
    (t) =>
      ({
        guardia: "guard",
        media: "half",
        cerrada: "closed",
        montada: "mount",
        espalda: "back",
        lateral: "side",
        barrido: "sweep",
        derribo: "takedown",
        palanca: "arm",
        rodilla: "knee",
      })[t] ?? t,
  );
  const filtered = catalog
    .filter(
      (e) =>
        (style === "all" || e.style === style || e.style === "both") &&
        (position === "all" || e.position === position),
    )
    .map((e) => {
      const hay = normalize(
        [e.name, ...e.aliases, ...e.tags, e.position].join(" "),
      );
      const match =
        tokens.every((t) => hay.includes(t)) ||
        expanded.every((t) => hay.includes(t));
      return {
        e,
        match,
        score:
          normalize(e.name) === normalize(query)
            ? 2
            : e.source === "Mat Log"
              ? 1
              : 0,
      };
    })
    .filter((x) => x.match)
    .sort((a, b) => b.score - a.score);
  return {
    total: filtered.length,
    entries: filtered.slice(offset, offset + limit).map((x) => x.e),
    sources: catalogSources,
  };
}
