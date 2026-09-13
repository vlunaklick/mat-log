import type { CatalogEntry } from '../../../src/lib/training.ts';
import type { Position, TechniqueType } from '../../../src/lib/types.ts';
export function inferPosition(text: string): Position {
  const s = text.toLowerCase();
  const rules: Array<[RegExp, Position]> = [[/half|media/, 'Half Guard'], [/full.guard|closed|cerrada/, 'Closed Guard'], [/mount|montada/, 'Mount'], [/side.control|side.ctrl|lateral|north.south/, 'Side Control'], [/back|rear.naked|espalda/, 'Back'], [/turtle|tortuga/, 'Turtle'], [/leg.lock|heel|50.50|ashi|entangle/, 'Leg Entanglements'], [/pass|knee.cut|knee.slice/, 'Guard Passing'], [/standing|takedown|throw|single.leg|double.leg|derribo/, 'Standing / Takedowns'], [/guard|butterfly|de.la.riva/, 'Open Guard'], [/escape|shrimp/, 'Escapes']];
  return rules.find(([re]) => re.test(s))?.[1] ?? 'Other';
}
export function inferType(s: string): TechniqueType {
  if (/escape|shrimp/i.test(s)) return 'escape';
  if (/sweep|barrido/i.test(s)) return 'sweep';
  if (/pass|knee.cut|knee.slice/i.test(s)) return 'pass';
  if (/takedown|throw|gari|guruma|derribo/i.test(s)) return 'takedown';
  if (/choke|armbar|arm.bar|kimura|americana|heel.hook|kneebar|guillotine|triangle|omoplata/i.test(s)) return 'submission';
  return 'control';
}
/** GrappleMap records have unindented metadata followed by indented animation coordinates. */
export function parseGrappleMap(text: string, commit: string): CatalogEntry[] {
  const blocks: Array<{ meta: string[]; frames: number }> = [];
  let current = { meta: [] as string[], frames: 0 };
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    if (/^\s/.test(line)) { current.frames++; continue; }
    if (current.frames) { blocks.push(current); current = { meta: [], frames: 0 }; }
    current.meta.push(line);
  }
  if (current.meta.length) blocks.push(current);
  return blocks.flatMap((b, i) => {
    const names = b.meta.filter(l => !/^[a-z]+:/.test(l)).map(l => l.replace(/\\n/g, ' ').trim());
    const name = names[0];
    // Do not present unfinished placeholders as reliable reference material.
    if (!name || /^(\.\.\.|wip)$/i.test(name) || b.meta.some(l => /^todo:.*(stub|remove|replace|wip|need source|find better source)/i.test(l))) return [];
    const tags = b.meta.filter(l => l.startsWith('tags:')).flatMap(l => l.slice(5).trim().split(/\s+/));
    const refs = b.meta.filter(l => l.startsWith('ref:')).map(l => l.slice(4).trim());
    const searchable = [name, ...tags].join(' ');
    return [{ id: `gm-${i}`, name, aliases: names.slice(1), position: inferPosition(searchable), type: inferType(searchable),
      style: 'nogi' as const, description: tags.map(t => t.replaceAll('_', ' ')).join(' · '), tags,
      source: 'GrappleMap' as const, sourceUrl: `https://github.com/Eelis/GrappleMap/blob/${commit}/GrappleMap.txt`, references: refs,
      kind: b.frames > 4 ? 'transition' as const : 'position' as const }];
  });
}
