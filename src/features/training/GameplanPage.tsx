import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import type { Gameplan, PlanNode, TrainingState } from "@/lib/training";
import type { Style, Technique } from "@/lib/types";
import { POSITION_LABELS, STYLE_LABELS, label } from "@/lib/labels";
import { useTraining, useTrainingActions } from "./queries";
import { useTechniques, useSessions } from "@/lib/queries";
import { PageHeader } from "@/components/app/page-header";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldLabel, FieldGroup } from "@/components/ui/field";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
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
              <Button variant="outline" onClick={() => setEditing(true)}>
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
        >
          Contá desde dónde empezás, qué posiciones buscás y qué querés
          conseguir.
        </Blank>
      ) : (
        <>
          <div>
            <h2 className="text-h2">{plan.title}</h2>
            {plan.intention && (
              <p className="mt-2 text-lead">{plan.intention}</p>
            )}
          </div>
          {plan.assessment && (
            <Card>
              <CardHeader>
                <CardTitle>Evaluación del coach</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{plan.assessment}</p>
              </CardContent>
            </Card>
          )}
          <div className="grid items-start gap-5 md:grid-cols-[1fr_1.3fr]">
            <ol
              className="flex flex-col gap-2"
              aria-label="Pasos de tu gameplan"
            >
              {plan.nodes.map((n, i) => (
                <li key={n.id}>
                  <button
                    className={`w-full rounded-3xl p-4 text-left ${selected?.id === n.id ? "bg-primary text-primary-foreground" : "bg-surface"}`}
                    onClick={() => setSelectedId(n.id)}
                    aria-pressed={selected?.id === n.id}
                  >
                    <span className="text-xs opacity-70">
                      {i + 1} · {label(POSITION_LABELS, n.position)} ·{" "}
                      {n.status === "suggested" ? "Por explorar" : "Aprendida"}
                    </span>
                    <p className="mt-1 font-medium">{n.action}</p>
                  </button>
                </li>
              ))}
            </ol>
            {selected && (
              <Card>
                <CardHeader>
                  <Badge variant="outline">
                    {selected.status === "suggested"
                      ? "Por explorar"
                      : "Aprendida"}
                  </Badge>
                  <CardTitle>{label(POSITION_LABELS, selected.position)}</CardTitle>
                  <CardDescription>{selected.action}</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  {selected.opponentResponse && (
                    <div>
                      <h3 className="text-label">Si el rival responde…</h3>
                      <p className="mt-1">{selected.opponentResponse}</p>
                    </div>
                  )}
                  {selected.caution && (
                    <div>
                      <h3 className="text-label">A tener en cuenta</h3>
                      <p className="mt-1">{selected.caution}</p>
                    </div>
                  )}
                  {selected.techniqueId && (
                    <Link
                      className="underline"
                      to={`/techniques/${selected.techniqueId}`}
                    >
                      Ver técnica · {records}{" "}
                      {records === 1 ? "registro" : "registros"} en clases
                    </Link>
                  )}
                  {selected.next.length ? (
                    <>
                      <h3 className="text-label">Cómo sigue</h3>
                      {selected.next.map((id) => {
                        const next = plan.nodes.find((n) => n.id === id);
                        return (
                          next && (
                            <Button
                              key={id}
                              className="h-auto justify-start whitespace-normal py-3 text-left"
                              variant="outline"
                              onClick={() => setSelectedId(id)}
                            >
                              → {label(POSITION_LABELS, next.position)}: {next.action}
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
                </CardContent>
              </Card>
            )}
          </div>
        </>
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
        return (
          <Card key={n.id}>
            <CardHeader>
              <CardTitle>Paso {i + 1}</CardTitle>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                {(
                  [
                    ["position", "Posición"],
                    ["action", "Qué buscás"],
                    ["opponentResponse", "Respuesta del rival"],
                    ["caution", "Cuidado con"],
                  ] as const
                ).map(([k, label]) => (
                  <Field key={k}>
                    <FieldLabel htmlFor={`${n.id}-${k}`}>{label}</FieldLabel>
                    <Input
                      id={`${n.id}-${k}`}
                      value={n[k]}
                      onChange={(e) => patch(n.id, { [k]: e.target.value })}
                    />
                  </Field>
                ))}
                <Field>
                  <FieldLabel>Estado</FieldLabel>
                  <ToggleGroup
                    aria-label="Estado"
                    value={[n.status]}
                    onValueChange={(v) =>
                      v[0] && patch(n.id, { status: v[0] as PlanNode["status"] })
                    }
                  >
                    <ToggleGroupItem value="learned">Aprendida</ToggleGroupItem>
                    <ToggleGroupItem value="suggested">
                      Por explorar
                    </ToggleGroupItem>
                  </ToggleGroup>
                </Field>
                <Field>
                  <FieldLabel htmlFor={`${n.id}-technique`}>Técnica</FieldLabel>
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
                            {j + 1}. {x.action || label(POSITION_LABELS, x.position, "Sin nombre")}
                          </span>
                        </ToggleGroupItem>
                      ))}
                    </ToggleGroup>
                  </Field>
                )}
              </FieldGroup>
            </CardContent>
            <CardFooter>
              <Button
                variant="ghost"
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
            </CardFooter>
          </Card>
        );
      })}
      <Button
        variant="outline"
        onClick={() =>
          setPlan((p) => ({
            ...p,
            nodes: [
              ...p.nodes,
              {
                id: crypto.randomUUID(),
                position: "",
                action: "",
                opponentResponse: "",
                next: [],
                status: "suggested",
                techniqueId: null,
                caution: "",
              },
            ],
          }))
        }
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
