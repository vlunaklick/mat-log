import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowRight } from "lucide-react";
import type { Gameplan, PlanNode, TrainingState } from "@/lib/training";
import type { Style, Technique } from "@/lib/types";
import { POSITIONS, type Position } from "@/lib/types";
import { POSITION_LABELS, STYLE_LABELS, label } from "@/lib/labels";
import { useTraining, useTrainingActions } from "./queries";
import { useTechniques, useSessions } from "@/lib/queries";
import { PageHeader } from "@/components/app/page-header";
import { Disclosure } from "@/components/app/disclosure";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldLabel, FieldGroup } from "@/components/ui/field";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Blank, ErrorNotice, Loading, StylePicker } from "./shared";
export default function GameplanPage() {
  const [params, setParams] = useSearchParams();
  const style: Style = params.get("style") === "nogi" ? "nogi" : "gi";
  const state = useTraining(),
    techniques = useTechniques(),
    sessions = useSessions();
  const [editing, setEditing] = useState(false);
  const plan = state.data?.gameplans.find((p) => p.style === style);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected =
    plan?.nodes.find((n) => n.id === selectedId) ?? plan?.nodes[0];
  const evidence =
    sessions.data
      ?.filter((s) => s.style === style)
      .flatMap((s) => s.evidence ?? []) ?? [];
  const coachLink = `/coach?mode=gameplan&prompt=${encodeURIComponent(`Quiero ${plan?.nodes.length ? "revisar y desarrollar" : "construir"} mi gameplan de ${STYLE_LABELS[style]}. Ayudame a contar mi intención, evaluar si se adapta a mi perfil y encontrar variantes. Preguntame de a una cosa antes de proponer cambios.`)}`;
  const records = selected?.techniqueId
    ? evidence.filter((e) => e.techniqueId === selected.techniqueId).length
    : 0;
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={editing ? "Editar gameplan" : "Mi juego"}
        action={
          !editing &&
          !!plan?.nodes.length && (
            <>
              <Button variant="ghost" onClick={() => setEditing(true)}>
                Editar
              </Button>
              <Button nativeButton={false} render={<Link to={coachLink} />}>
                Revisar con el coach
              </Button>
            </>
          )
        }
      />
      <StylePicker
        value={style}
        onChange={(s) => {
          setParams({ style: s });
          setSelectedId(null);
          setEditing(false);
        }}
      />
      <ErrorNotice error={state.error ?? techniques.error ?? sessions.error} />
      {state.isPending ? (
        <Loading />
      ) : editing && state.data ? (
        <PlanEditor
          key={`${style}-${state.data.revision}`}
          state={state.data}
          style={style}
          techniques={techniques.data ?? []}
          onDone={() => setEditing(false)}
        />
      ) : !plan?.nodes.length ? (
        <Blank
          title={plan?.title || `Todavía no armaste tu juego de ${STYLE_LABELS[style]}`}
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button nativeButton={false} render={<Link to={coachLink} />}>
                Armarlo con el coach
              </Button>
              <Button variant="outline" onClick={() => setEditing(true)}>
                Crear a mano
              </Button>
            </div>
          }
        />
      ) : (
        <>
          <div>
            <h2 className="text-h2">{plan.title}</h2>
            {plan.intention && (
              <p className="mt-2 text-lead">{plan.intention}</p>
            )}
          </div>
          {plan.assessment && (
            <Disclosure summary="Evaluación del coach">
              <p className="whitespace-pre-wrap">{plan.assessment}</p>
            </Disclosure>
          )}
          <div className="grid items-start gap-5 md:grid-cols-[1fr_1.3fr]">
            <ol
              className="flex flex-col gap-2"
              aria-label="Pasos de tu gameplan"
            >
              {plan.nodes.map((n, i) => {
                const isSelected = selected?.id === n.id;
                return (
                  <li key={n.id}>
                    <button
                      className={`min-h-16 w-full rounded-3xl p-4 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring ${isSelected ? "bg-primary text-primary-foreground" : "bg-surface hover:bg-accent"}`}
                      onClick={() => setSelectedId(n.id)}
                      aria-pressed={isSelected}
                    >
                      <span className="text-xs opacity-70">
                        {i + 1} · {label(POSITION_LABELS, n.position)}
                        {n.status === "suggested" ? " · Por explorar" : ""}
                      </span>
                      <p className="mt-1 font-medium">{n.action}</p>
                    </button>
                    {isSelected && selected && (
                      <div className="mt-2 md:hidden">
                        <StepDetailPanel
                          inline
                          node={selected}
                          plan={plan}
                          style={style}
                          records={records}
                          onSelect={setSelectedId}
                        />
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
            {selected && (
              <div className="hidden md:block">
                <StepDetailPanel
                  node={selected}
                  plan={plan}
                  style={style}
                  records={records}
                  onSelect={setSelectedId}
                />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
function StepDetailPanel({
  node,
  plan,
  style,
  records,
  onSelect,
  inline,
}: {
  inline?: boolean;
  node: PlanNode;
  plan: Gameplan;
  style: Style;
  records: number;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-3xl bg-surface p-5">
      <div className={inline ? "hidden" : undefined}>
        {node.status === "suggested" && (
          <Badge variant="outline" className="mb-2">
            Por explorar
          </Badge>
        )}
        <h3 className="text-h3">{label(POSITION_LABELS, node.position)}</h3>
        <p className="text-muted-foreground">{node.action}</p>
      </div>
      {node.opponentResponse && (
        <div>
          <h4 className="text-label">Si el rival responde…</h4>
          <p className="mt-1">{node.opponentResponse}</p>
        </div>
      )}
      {node.caution && (
        <div>
          <h4 className="text-label">A tener en cuenta</h4>
          <p className="mt-1">{node.caution}</p>
        </div>
      )}
      {node.techniqueId && (
        <Link className="underline" to={`/techniques/${node.techniqueId}`}>
          Ver técnica · {records}{" "}
          {records === 1 ? "registro" : "registros"} en clases
        </Link>
      )}
      {node.next.length ? (
        <>
          <h4 className="text-label">Cómo sigue</h4>
          {node.next.map((id) => {
            const next = plan.nodes.find((n) => n.id === id);
            return (
              next && (
                <Button
                  key={id}
                  className="h-auto min-h-11 justify-start whitespace-normal py-3 text-left"
                  variant="outline"
                  onClick={() => onSelect(id)}
                >
                  <ArrowRight data-icon="inline-start" />
                  {label(POSITION_LABELS, next.position)}: {next.action}
                </Button>
              )
            );
          })}
        </>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm text-muted-foreground">
            Acá termina esta secuencia.
          </p>
          <Button
            size="sm"
            variant="outline"
            nativeButton={false}
            render={<Link to={`/explore?style=${style}`} />}
          >
            Buscar variantes
          </Button>
        </div>
      )}
    </div>
  );
}
function PlanEditor({
  state,
  style,
  techniques,
  onDone,
}: {
  state: TrainingState;
  style: Style;
  techniques: Technique[];
  onDone: () => void;
}) {
  const [plan, setPlan] = useState<Gameplan>(
    state.gameplans.find((p) => p.style === style) ?? {
      style,
      title: "",
      intention: "",
      assessment: "",
      nodes: [],
    },
  );
  const [newStepId, setNewStepId] = useState<string | null>(null);
  const { update } = useTrainingActions();
  const patch = (id: string, p: Partial<PlanNode>) =>
    setPlan((v) => ({
      ...v,
      nodes: v.nodes.map((n) => (n.id === id ? { ...n, ...p } : n)),
    }));
  return (
    <div className="flex flex-col gap-5">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="plan-title">Nombre</FieldLabel>
          <Input
            id="plan-title"
            value={plan.title}
            onChange={(e) => setPlan({ ...plan, title: e.target.value })}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="plan-intention">Cómo querés pelear</FieldLabel>
          <Textarea
            id="plan-intention"
            value={plan.intention}
            onChange={(e) => setPlan({ ...plan, intention: e.target.value })}
          />
        </Field>
      </FieldGroup>
      {plan.nodes.map((n, i) => {
        const others = plan.nodes
          .map((x, j) => ({ x, j }))
          .filter(({ x }) => x.id !== n.id);
        const summary = `${i + 1}. ${n.action || label(POSITION_LABELS, n.position, "") || "Paso sin nombre"}`;
        return (
          <div key={n.id} className="rounded-2xl bg-surface px-4 py-0.5 has-[details[open]]:pb-4">
            <Disclosure summary={summary} defaultOpen={n.id === newStepId}>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor={`${n.id}-position`}>
                    Posición
                  </FieldLabel>
                  <Select
                    items={POSITION_LABELS}
                    value={n.position}
                    onValueChange={(v) => patch(n.id, { position: v as string })}
                  >
                    <SelectTrigger id={`${n.id}-position`} className="w-full">
                      <SelectValue placeholder="Elegí una posición" />
                    </SelectTrigger>
                    <SelectContent>
                      {POSITIONS.map((p) => (
                        <SelectItem key={p} value={p}>
                          {POSITION_LABELS[p]}
                        </SelectItem>
                      ))}
                      {!POSITIONS.includes(n.position as Position) && n.position && (
                        <SelectItem value={n.position}>
                          {n.position}
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel htmlFor={`${n.id}-action`}>
                    Qué buscás
                  </FieldLabel>
                  <Input
                    id={`${n.id}-action`}
                    value={n.action}
                    onChange={(e) => patch(n.id, { action: e.target.value })}
                  />
                </Field>
                <Field>
                  <FieldLabel>Estado</FieldLabel>
                  <ToggleGroup
                    aria-label="Estado"
                    value={[n.status]}
                    onValueChange={(v) =>
                      v[0] &&
                      patch(n.id, { status: v[0] as PlanNode["status"] })
                    }
                  >
                    <ToggleGroupItem value="learned">Aprendida</ToggleGroupItem>
                    <ToggleGroupItem value="suggested">
                      Por explorar
                    </ToggleGroupItem>
                  </ToggleGroup>
                </Field>
                <Disclosure summary="Más">
                  <FieldGroup>
                    <Field>
                      <FieldLabel htmlFor={`${n.id}-opponentResponse`}>
                        Respuesta del rival
                      </FieldLabel>
                      <Input
                        id={`${n.id}-opponentResponse`}
                        value={n.opponentResponse}
                        onChange={(e) =>
                          patch(n.id, { opponentResponse: e.target.value })
                        }
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor={`${n.id}-caution`}>
                        Cuidado con
                      </FieldLabel>
                      <Input
                        id={`${n.id}-caution`}
                        value={n.caution}
                        onChange={(e) =>
                          patch(n.id, { caution: e.target.value })
                        }
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor={`${n.id}-technique`}>
                        Técnica
                      </FieldLabel>
                      <select
                        className="training-select"
                        id={`${n.id}-technique`}
                        value={n.techniqueId ?? ""}
                        onChange={(e) =>
                          patch(n.id, {
                            techniqueId: e.target.value
                              ? Number(e.target.value)
                              : null,
                          })
                        }
                      >
                        <option value="">Sin vincular</option>
                        {techniques.map((t) => (
                          <option value={t.id} key={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    </Field>
                    {others.length > 0 && (
                      <Field>
                        <FieldLabel>Sigue con</FieldLabel>
                        <ToggleGroup
                          multiple
                          variant="outline"
                          aria-label="Sigue con"
                          value={n.next}
                          onValueChange={(v) => patch(n.id, { next: v })}
                          className="flex-wrap justify-start"
                        >
                          {others.map(({ x, j }) => (
                            <ToggleGroupItem
                              key={x.id}
                              value={x.id}
                              className="max-w-full"
                            >
                              <span className="truncate">
                                {j + 1}.{" "}
                                {x.action ||
                                  label(POSITION_LABELS, x.position, "Sin nombre")}
                              </span>
                            </ToggleGroupItem>
                          ))}
                        </ToggleGroup>
                      </Field>
                    )}
                  </FieldGroup>
                </Disclosure>
                <Button
                  variant="ghost"
                  className="self-start"
                  onClick={() =>
                    setPlan((p) => ({
                      ...p,
                      nodes: p.nodes
                        .filter((x) => x.id !== n.id)
                        .map((x) => ({
                          ...x,
                          next: x.next.filter((id) => id !== n.id),
                        })),
                    }))
                  }
                >
                  Quitar paso
                </Button>
              </FieldGroup>
            </Disclosure>
          </div>
        );
      })}
      <Button
        variant="outline"
        onClick={() => {
          const id = crypto.randomUUID();
          setNewStepId(id);
          setPlan((p) => ({
            ...p,
            nodes: [
              ...p.nodes,
              {
                id,
                position: "",
                action: "",
                opponentResponse: "",
                next: [],
                status: "suggested",
                techniqueId: null,
                caution: "",
              },
            ],
          }));
        }}
      >
        Agregar paso
      </Button>
      <ErrorNotice error={update.error} />
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" onClick={onDone}>
          Cancelar
        </Button>
        <Button
          disabled={update.isPending}
          onClick={() =>
            update.mutate(
              {
                payload: { kind: "gameplan", data: plan },
                revision: state.revision,
              },
              {
                onSuccess: () => {
                  toast("Gameplan guardado");
                  onDone();
                },
              },
            )
          }
        >
          {update.isPending ? "Guardando…" : "Guardar"}
        </Button>
      </div>
    </div>
  );
}
