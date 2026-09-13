import { writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { parseGrappleMap } from '../src/training/catalog-parser.ts';
const commit = '032c8f91809786b7b784852abd07cf3e10c0ea35';
const url = `https://raw.githubusercontent.com/Eelis/GrappleMap/${commit}/GrappleMap.txt`;
const response = await fetch(url);
if (!response.ok) throw new Error(`Download failed: ${response.status}`);
const raw = await response.text();
const entries = parseGrappleMap(raw, commit);
if (entries.length < 500) throw new Error('Unexpected catalog size; inspect the upstream format.');
await mkdir(new URL('../src/data/', import.meta.url), { recursive: true });
await writeFile(new URL('../src/data/catalog.json', import.meta.url), JSON.stringify({ source: url, commit,
  sha256: createHash('sha256').update(raw).digest('hex'), license: 'Public domain (upstream LICENSE)', entries }, null, 2) + '\n');
console.log(`Imported ${entries.length} named positions/transitions; unfinished placeholders excluded.`);
