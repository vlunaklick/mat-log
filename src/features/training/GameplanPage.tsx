import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { Gameplan, PlanNode, TrainingState } from '@/lib/training';
import type { Style, Technique } from '@/lib/types';
import { useTraining, useTrainingActions } from './queries';
import { useTechniques, useSessions } from '@/lib/queries';
import { PageHeader } from '@/components/app/page-header';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Field, FieldLabel, FieldGroup } from '@/components/ui/field';
import { Blank, ErrorNotice, Loading, StylePicker } from './shared';
export default function GameplanPage() {
  const [params, setParams] = useSearchParams(); const style: Style = params.get('style') === 'nogi' ? 'nogi' : 'gi';
  const state = useTraining(), techniques = useTechniques(), sessions = useSessions();
  const [editing,setEditing] = useState(false);
  const plan = state.data?.gameplans.find(p => p.style === style);
  const [selectedId,setSelectedId] = useState<string | null>(null);
  const selected = plan?.nodes.find(n => n.id === selectedId) ?? plan?.nodes[0];
  const evidence = sessions.data?.filter(s => s.style === style).flatMap(s => s.evidence ?? []) ?? [];
  return <div className="flex flex-col gap-6"><PageHeader title="Mi sistema de pelea." lead="Tu intención, las respuestas del rival y tus alternativas." action={<Button variant="outline" onClick={() => setEditing(v => !v)}>{editing ? 'Cerrar edición' : 'Editar mi plan'}</Button>} /><StylePicker value={style} onChange={s => { setParams({ style:s }); setSelectedId(null); setEditing(false); }} /><ErrorNotice error={state.error ?? techniques.error ?? sessions.error} />
    {state.isPending ? <Loading /> : editing && state.data ? <PlanEditor key={`${style}-${state.data.revision}`} state={state.data} style={style} techniques={techniques.data ?? []} onSaved={() => setEditing(false)} /> : !plan?.nodes.length ? <Blank title={plan?.title || 'Tu juego empieza con una idea.'}>Contale al coach desde dónde querés empezar, qué posiciones buscás y qué querés conseguir. También podés editar el plan manualmente.</Blank> : <>
      <div><h2 className="text-h2">{plan.title}</h2><p className="mt-2 text-lead">{plan.intention}</p></div>
      {plan.assessment && <Card><CardHeader><CardTitle>Evaluación del coach</CardTitle><CardDescription>Hipótesis para probar entrenando, confirmada por vos.</CardDescription></CardHeader><CardContent><p className="whitespace-pre-wrap">{plan.assessment}</p></CardContent></Card>}
      <div className="grid items-start gap-5 md:grid-cols-[1fr_1.3fr]"><ol className="flex flex-col gap-2" aria-label="Pasos de tu gameplan">{plan.nodes.map((n,i) => <li key={n.id}><button className={`w-full rounded-3xl p-4 text-left ${selected?.id === n.id ? 'bg-primary text-primary-foreground' : 'bg-surface'}`} onClick={() => setSelectedId(n.id)} aria-pressed={selected?.id === n.id}><span className="text-xs opacity-70">{String(i+1).padStart(2,'0')} · {n.position} · {n.status === 'suggested' ? 'Por explorar' : 'Aprendida'}</span><p className="mt-1 font-medium">{n.action}</p></button></li>)}</ol>
      {selected && <Card><CardHeader><Badge variant="outline">{selected.status === 'suggested' ? 'Sugerencia por probar' : 'Parte de tu juego'}</Badge><CardTitle>{selected.position}</CardTitle><CardDescription>{selected.action}</CardDescription></CardHeader><CardContent className="flex flex-col gap-4"><div><h3 className="text-label">Si el rival responde…</h3><p className="mt-1">{selected.opponentResponse || 'Todavía no registraste una respuesta del rival.'}</p></div><div><h3 className="text-label">A tener en cuenta</h3><p className="mt-1">{selected.caution || 'Anotá el detalle o la dificultad que querés probar.'}</p></div>{selected.techniqueId && <Link className="underline" to={`/techniques/${selected.techniqueId}`}>Ver técnica · {evidence.filter(e => e.techniqueId === selected.techniqueId).length} registros en clases</Link>}<h3 className="text-label">Cómo sigue</h3>{selected.next.length ? selected.next.map(id => { const next = plan.nodes.find(n => n.id === id); return next && <Button key={id} className="h-auto justify-start whitespace-normal py-3 text-left" variant="outline" onClick={() => setSelectedId(id)}>→ {next.position}: {next.action}</Button>; }) : <p className="text-sm text-muted-foreground">Acá termina esta secuencia. Podés pedirle al coach una variante.</p>}</CardContent></Card>}
      </div>
    </>}
    <div className="flex flex-wrap gap-2"><Button nativeButton={false} render={<Link to={`/coach?mode=gameplan&prompt=${encodeURIComponent(`Quiero ${plan ? 'revisar y desarrollar' : 'construir'} mi gameplan de ${style}. Ayudame a contar mi intención, evaluar si se adapta a mi perfil y encontrar variantes. Preguntame de a una cosa antes de proponer cambios.`)}`} />}>{plan ? 'Revisar con el coach' : 'Contarle mi gameplan al coach'}</Button><Button variant="outline" nativeButton={false} render={<Link to={`/explore?style=${style}`} />}>Buscar variantes</Button></div>
  </div>;
}
function PlanEditor({ state, style, techniques, onSaved }: { state: TrainingState; style: Style; techniques: Technique[]; onSaved: () => void }) {
  const [plan,setPlan] = useState<Gameplan>(state.gameplans.find(p => p.style === style) ?? { style, title:'', intention:'', assessment:'', nodes:[] });
  const { update } = useTrainingActions();
  const patch = (id:string, p:Partial<PlanNode>) => setPlan(v => ({ ...v, nodes:v.nodes.map(n => n.id === id ? { ...n,...p } : n) }));
  return <div className="flex flex-col gap-5"><FieldGroup><Field><FieldLabel htmlFor="plan-title">Nombre del plan</FieldLabel><Input id="plan-title" value={plan.title} onChange={e => setPlan({ ...plan,title:e.target.value })} /></Field><Field><FieldLabel htmlFor="plan-intention">Cómo querés pelear</FieldLabel><Textarea id="plan-intention" value={plan.intention} onChange={e => setPlan({ ...plan,intention:e.target.value })} /></Field></FieldGroup>
    {plan.nodes.map((n,i) => <Card key={n.id}><CardHeader><CardTitle>Paso {i+1}</CardTitle></CardHeader><CardContent><FieldGroup>
      {([['position','Posición'],['action','Qué buscás hacer'],['opponentResponse','Cómo puede responder el rival'],['caution','En qué tener cuidado']] as const).map(([k,label]) => <Field key={k}><FieldLabel htmlFor={`${n.id}-${k}`}>{label}</FieldLabel><Input id={`${n.id}-${k}`} value={n[k]} onChange={e => patch(n.id,{ [k]:e.target.value })} /></Field>)}
      <Field><FieldLabel htmlFor={`${n.id}-status`}>Estado</FieldLabel><select className="training-select" id={`${n.id}-status`} value={n.status} onChange={e => patch(n.id,{ status:e.target.value as PlanNode['status'] })}><option value="learned">Aprendida</option><option value="suggested">Por explorar</option></select></Field>
      <Field><FieldLabel htmlFor={`${n.id}-technique`}>Técnica de tu biblioteca, opcional</FieldLabel><select className="training-select" id={`${n.id}-technique`} value={n.techniqueId ?? ''} onChange={e => patch(n.id,{ techniqueId:e.target.value ? Number(e.target.value) : null })}><option value="">Sin vincular</option>{techniques.map(t => <option value={t.id} key={t.id}>{t.name}</option>)}</select></Field>
      <Field><FieldLabel htmlFor={`${n.id}-next`}>Pasos siguientes, podés elegir varias alternativas</FieldLabel><select className="training-select min-h-24" multiple id={`${n.id}-next`} value={n.next} onChange={e => patch(n.id,{ next:Array.from(e.target.selectedOptions).map(o => o.value) })}>{plan.nodes.filter(x => x.id !== n.id).map((x) => <option value={x.id} key={x.id}>{x.position}: {x.action}</option>)}</select></Field>
    </FieldGroup></CardContent><CardFooter><Button variant="ghost" onClick={() => setPlan(p => ({ ...p,nodes:p.nodes.filter(x => x.id !== n.id).map(x => ({ ...x,next:x.next.filter(id => id !== n.id) })) }))}>Quitar paso</Button></CardFooter></Card>)}
    <Button variant="outline" onClick={() => setPlan(p => ({ ...p,nodes:[...p.nodes,{ id:crypto.randomUUID(),position:'',action:'',opponentResponse:'',next:[],status:'suggested',techniqueId:null,caution:'' }] }))}>Agregar paso</Button><ErrorNotice error={update.error} /><Button disabled={update.isPending} onClick={() => update.mutate({ payload:{ kind:'gameplan',data:plan },revision:state.revision },{ onSuccess:onSaved })}>Guardar gameplan</Button>
  </div>;
}
