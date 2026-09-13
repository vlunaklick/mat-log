import type { Proposal } from '@/lib/training';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTrainingActions } from './queries';
import { ErrorNotice } from './shared';
export function ProposalCard({ proposal }: { proposal: Proposal }) {
  const { decide } = useTrainingActions();
  const p = proposal.payload;
  return <Card><CardHeader><Badge variant="outline">{proposal.status === 'pending' ? 'Propuesta · pendiente de confirmar' : proposal.status === 'accepted' ? 'Confirmada' : 'Descartada'}</Badge><CardTitle>{proposal.title}</CardTitle><CardDescription>{proposal.reason}</CardDescription></CardHeader>
    <CardContent className="flex flex-col gap-3">
      {p.kind === 'goal' && <><p className="text-title">{p.data.title}</p><p>{p.data.action}</p><p className="text-sm text-muted-foreground">{p.data.style === 'gi' ? 'Gi' : 'No-gi'} · {p.data.status}</p><p>{p.data.notes}</p></>}
      {p.kind === 'gameplan' && <><p className="text-title">{p.data.title} · {p.data.style}</p><p>{p.data.intention}</p><p className="whitespace-pre-wrap text-sm">{p.data.assessment}</p><ol className="flex list-decimal flex-col gap-3 pl-5">{p.data.nodes.map(n => <li key={n.id}><p>{n.position}: {n.action}</p><p className="text-sm text-muted-foreground">{n.opponentResponse} {n.caution} · {n.status === 'suggested' ? 'Por explorar' : 'Aprendida'}</p>{n.next.length > 0 && <p className="text-sm">Después: {n.next.map(id => p.data.nodes.find(x => x.id === id)?.action).join(' / ')}</p>}</li>)}</ol></>}
      {p.kind === 'profile' && <dl className="grid grid-cols-1 gap-2 text-sm">{Object.entries({ 'Inicio': p.data.startedOn, 'Año de nacimiento': p.data.birthYear, 'Altura (cm)': p.data.heightCm, 'Peso (kg)': p.data.weightKg, 'Preferencias': p.data.preferences, 'Limitaciones': p.data.limitations, 'Objetivos personales': p.data.ambitions }).map(([label, value]) => <div key={label}><dt className="text-muted-foreground">{label}</dt><dd>{value || 'Sin completar'}</dd></div>)}<div><dt>Cinturones</dt><dd>{p.data.belts.map(b => `${b.belt}: ${b.date}`).join(' · ') || 'Sin completar'}</dd></div><div><dt>Parones</dt><dd>{p.data.breaks.map(b => `${b.start} → ${b.end ?? 'actualidad'}: ${b.reason}`).join(' · ') || 'Ninguno registrado'}</dd></div></dl>}
      <ErrorNotice error={decide.error} />
    </CardContent>
    {proposal.status === 'pending' && <CardFooter className="flex flex-wrap gap-2"><Button disabled={decide.isPending} onClick={() => decide.mutate({ id: proposal.id, action: 'accept' })}>Confirmar cambio</Button><Button variant="outline" disabled={decide.isPending} onClick={() => decide.mutate({ id: proposal.id, action: 'dismiss' })}>Descartar</Button></CardFooter>}
  </Card>;
}
