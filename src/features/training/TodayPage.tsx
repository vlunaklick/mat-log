import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import type { Style } from "@/lib/types";
import { formatDate } from "@/lib/date";
import { STYLE_LABELS } from "@/lib/labels";
import { useSessions, useTechniques } from "@/lib/queries";
import {
  useTraining,
  useDrafts,
  useProposals,
  useTrainingActions,
} from "./queries";
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
import { StatTile } from "@/components/app/stat-tile";
import { Blank, ErrorNotice, Loading, StylePicker } from "./shared";
import { ProposalCard } from "./ProposalCard";
export default function TodayPage() {
  const [style, setStyle] = useState<Style>("gi");
  const training = useTraining(),
    sessions = useSessions(),
    techniques = useTechniques(),
    drafts = useDrafts(),
    proposals = useProposals();
  const actions = useTrainingActions();
  const goal = training.data?.goals.find(
    (g) => g.style === style && g.status === "active",
  );
  const plan = training.data?.gameplans.find((p) => p.style === style);
  const recent = sessions.data?.filter((s) => s.style === style) ?? [];
  const last = recent[0];
  const pending = drafts.data?.filter((d) => d.status === "draft") ?? [];
  const pendingProposals =
    proposals.data?.filter((p) => p.status === "pending").slice(0, 3) ?? [];
  const linked =
    techniques.data?.filter(
      (t) =>
        !t.archived &&
        (last?.techniqueIds.includes(t.id!) ||
          plan?.nodes.some((n) => n.techniqueId === t.id)),
    ) ?? [];
  const evidence = recent.flatMap((s) => s.evidence ?? []);
  const styleName = STYLE_LABELS[style].toLowerCase();
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Hoy"
        lead={new Date().toLocaleDateString("es", {
          weekday: "long",
          day: "numeric",
          month: "long",
        })}
        action={
          <Button nativeButton={false} render={<Link to="/coach?mode=log" />}>
            Contar mi clase
          </Button>
        }
      />
      <StylePicker value={style} onChange={setStyle} />
      <ErrorNotice
        error={
          training.error ??
          sessions.error ??
          techniques.error ??
          drafts.error ??
          proposals.error ??
          actions.update.error
        }
      />
      {pending.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl bg-surface p-5">
          <p>
            {pending.length === 1
              ? "Tenés 1 borrador sin confirmar"
              : `Tenés ${pending.length} borradores sin confirmar`}
          </p>
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={
              <Link
                to={
                  pending.length === 1 ? `/drafts/${pending[0].id}` : "/drafts"
                }
              />
            }
          >
            Revisar
          </Button>
        </div>
      )}
      {training.isPending ? (
        <Loading />
      ) : goal ? (
        <Card>
          <CardHeader>
            <Badge variant="secondary">Tu foco · {STYLE_LABELS[style]}</Badge>
            <CardTitle>{goal.title}</CardTitle>
          </CardHeader>
          {(goal.action || goal.notes) && (
            <CardContent>
              {goal.action && <p className="text-h2">{goal.action}</p>}
              {goal.notes && (
                <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">
                  {goal.notes}
                </p>
              )}
            </CardContent>
          )}
          <CardFooter className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              nativeButton={false}
              render={
                <Link
                  to={`/coach?mode=today&prompt=${encodeURIComponent(`Voy a entrenar ${styleName}. Mi objetivo es ${goal.title}. Proponeme una acción concreta para esta clase, teniendo en cuenta mi gameplan y mis últimos logs.`)}`}
                />
              }
            >
              Preparar con el coach
            </Button>
            <Button
              variant="ghost"
              disabled={actions.update.isPending}
              onClick={() =>
                actions.update.mutate(
                  {
                    revision: training.data!.revision,
                    payload: {
                      kind: "goal",
                      data: { ...goal, status: "completed" },
                    },
                  },
                  { onSuccess: () => toast("Objetivo cumplido") },
                )
              }
            >
              Marcar cumplido
            </Button>
          </CardFooter>
        </Card>
      ) : (
        <Blank
          title={`Sin foco para ${styleName}`}
          action={
            <Button
              variant="outline"
              nativeButton={false}
              render={
                <Link
                  to={`/coach?mode=today&prompt=${encodeURIComponent(`Quiero definir un objetivo para ${styleName}. Revisá mi perfil, mi gameplan y mis clases y proponeme uno con una acción pequeña.`)}`}
                />
              }
            >
              Definir con el coach
            </Button>
          }
        />
      )}
      {pendingProposals.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-title">Propuestas del coach</h2>
          {pendingProposals.map((p) => (
            <ProposalCard key={p.id} proposal={p} />
          ))}
        </section>
      )}
      {recent.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <StatTile label="Clases" value={recent.length} />
          <StatTile
            label="Horas"
            value={
              recent.some((s) => s.durationMin !== null)
                ? (
                    recent.reduce((n, s) => n + (s.durationMin ?? 0), 0) / 60
                  ).toFixed(1)
                : "—"
            }
          />
          <StatTile
            label="Técnicas aplicadas"
            value={
              new Set(
                evidence
                  .filter((e) => e.stage === "applied")
                  .map((e) => e.techniqueId),
              ).size
            }
          />
        </div>
      )}
      <div className="grid gap-5 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Lo que dejaste pendiente</CardTitle>
            {last && <CardDescription>{formatDate(last.date)}</CardDescription>}
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">
              {last
                ? last.nextFocus || "No anotaste un foco para la próxima."
                : `Todavía no registraste clases de ${styleName}.`}
            </p>
          </CardContent>
          {last && (
            <CardFooter>
              <Button
                variant="ghost"
                nativeButton={false}
                render={<Link to={`/session/${last.id}`} />}
              >
                Ver esa clase
              </Button>
            </CardFooter>
          )}
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{plan?.title || `Gameplan de ${styleName}`}</CardTitle>
            {plan && (
              <CardDescription>
                {`${plan.nodes.filter((n) => n.status === "learned").length} pasos aprendidos · ${plan.nodes.filter((n) => n.status === "suggested").length} por explorar`}
              </CardDescription>
            )}
          </CardHeader>
          {plan?.intention && (
            <CardContent>
              <p>{plan.intention}</p>
            </CardContent>
          )}
          <CardFooter>
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link to={`/gameplan?style=${style}`} />}
            >
              {plan ? "Ver gameplan" : "Armar gameplan"}
            </Button>
          </CardFooter>
        </Card>
      </div>
      {linked.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-title">Para repasar antes de entrar</h2>
          {linked.slice(0, 3).map((t) => (
            <Link
              key={t.id}
              to={`/techniques/${t.id}`}
              className="rounded-3xl bg-surface p-5 transition-colors hover:bg-accent"
            >
              <p className="text-title">{t.name}</p>
              {(t.details || t.steps) && (
                <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-sm text-muted-foreground">
                  {t.details || t.steps}
                </p>
              )}
            </Link>
          ))}
        </section>
      )}
      {!!training.data?.goals.filter((g) => g.style === style).length && (
        <details className="rounded-3xl bg-surface p-5">
          <summary className="cursor-pointer text-title">
            Mis objetivos de {styleName}
          </summary>
          <div className="mt-4 flex flex-col gap-4">
            {training.data.goals
              .filter((g) => g.style === style)
              .map((g) => (
                <div
                  key={g.id}
                  className="flex flex-wrap items-center justify-between gap-3"
                >
                  <div>
                    <p className="font-medium">{g.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {g.status === "active"
                        ? "Activo"
                        : g.status === "completed"
                          ? "Cumplido"
                          : "En pausa"}
                      {g.action ? ` · ${g.action}` : ""}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={actions.update.isPending}
                    onClick={() =>
                      actions.update.mutate({
                        revision: training.data!.revision,
                        payload: {
                          kind: "goal",
                          data: {
                            ...g,
                            status: g.status === "active" ? "paused" : "active",
                          },
                        },
                      })
                    }
                  >
                    {g.status === "active" ? "Pausar" : "Retomar"}
                  </Button>
                </div>
              ))}
          </div>
        </details>
      )}
    </div>
  );
}
