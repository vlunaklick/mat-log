import { useState } from "react";
import { Link } from "react-router-dom";
import type { Style } from "@/lib/types";
import { todayISO } from "@/lib/date";
import { practiceTotals } from "@/lib/training";
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
  const linked =
    techniques.data?.filter(
      (t) =>
        !t.archived &&
        (last?.techniqueIds.includes(t.id!) ||
          plan?.nodes.some((n) => n.techniqueId === t.id)),
    ) ?? [];
  const evidence = recent.flatMap((s) => s.evidence ?? []),
    stats = practiceTotals(evidence);
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Hoy entreno."
        lead={new Date(`${todayISO()}T12:00:00`).toLocaleDateString("es", {
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <StylePicker value={style} onChange={setStyle} />
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            nativeButton={false}
            render={<Link to="/journal" />}
          >
            Diario
          </Button>
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link to="/drafts" />}
          >
            Borradores {pending.length ? `(${pending.length})` : ""}
          </Button>
        </div>
      </div>
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
      {training.isPending ? (
        <Loading />
      ) : goal ? (
        <Card>
          <CardHeader>
            <Badge variant="secondary">
              Tu foco · {style === "gi" ? "Gi" : "No-gi"}
            </Badge>
            <CardTitle>{goal.title}</CardTitle>
            <CardDescription>
              Lo mantenés hasta decidir cambiarlo.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-h2">
              {goal.action || "Definí una acción pequeña con tu coach."}
            </p>
            {goal.notes && (
              <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">
                {goal.notes}
              </p>
            )}
          </CardContent>
          <CardFooter className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              nativeButton={false}
              render={
                <Link
                  to={`/coach?mode=today&prompt=${encodeURIComponent(`Voy a entrenar ${style}. Mi objetivo es ${goal.title}. Proponeme una acción concreta para esta clase, teniendo en cuenta mi gameplan y mis últimos logs.`)}`}
                />
              }
            >
              Preparar con el coach
            </Button>
            <Button
              variant="ghost"
              disabled={actions.update.isPending}
              onClick={() =>
                actions.update.mutate({
                  revision: training.data!.revision,
                  payload: {
                    kind: "goal",
                    data: { ...goal, status: "completed" },
                  },
                })
              }
            >
              Marcar objetivo cumplido
            </Button>
          </CardFooter>
        </Card>
      ) : (
        <Blank title="Elegí algo para trabajar.">
          <span>Tu objetivo puede mantenerse durante varias clases. </span>
          <Link
            className="underline"
            to={`/coach?mode=today&prompt=${encodeURIComponent(`Quiero definir un objetivo para ${style}. Revisá mi perfil, mi gameplan y mis clases y proponeme uno con una acción pequeña.`)}`}
          >
            Definir con el coach
          </Link>
        </Blank>
      )}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile label="Clases confirmadas" value={recent.length} />
        <StatTile
          label="Horas registradas"
          value={
            recent.some((s) => s.durationMin !== null)
              ? (
                  recent.reduce((n, s) => n + (s.durationMin ?? 0), 0) / 60
                ).toFixed(1)
              : "—"
          }
          hint={`${recent.filter((s) => s.durationMin === null).length} clases sin duración`}
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
        <StatTile
          label="Éxitos / intentos medidos"
          value={
            stats.attempts ? `${stats.successes} / ${stats.attempts}` : "—"
          }
        />
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Lo que dejaste pendiente</CardTitle>
            <CardDescription>
              {last?.date ?? "Todavía no hay clases de esta modalidad"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">
              {last?.nextFocus ||
                "Al registrar tu próxima clase, contá qué querés volver a intentar."}
            </p>
          </CardContent>
          {last && (
            <CardFooter>
              <Button
                variant="ghost"
                nativeButton={false}
                render={<Link to={`/session/${last.id}`} />}
              >
                Volver a esa clase
              </Button>
            </CardFooter>
          )}
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{plan?.title || "Tu sistema de pelea"}</CardTitle>
            <CardDescription>
              {plan
                ? `${plan.nodes.filter((n) => n.status === "learned").length} pasos aprendidos · ${plan.nodes.filter((n) => n.status === "suggested").length} por explorar`
                : "Contá cómo querés pelear y construí tus alternativas."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p>{plan?.intention || "Gi y no-gi tienen su propio gameplan."}</p>
          </CardContent>
          <CardFooter>
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link to={`/gameplan?style=${style}`} />}
            >
              Ver mi gameplan
            </Button>
          </CardFooter>
        </Card>
      </div>
      {!!training.data?.goals.filter((g) => g.style === style).length && (
        <details className="rounded-3xl bg-surface p-5">
          <summary className="cursor-pointer text-title">
            Mis objetivos de {style === "gi" ? "gi" : "no-gi"}
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
                          : "En pausa"}{" "}
                      · {g.action}
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
      {linked.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-h2">Para recordar antes de entrar.</h2>
          {linked.slice(0, 3).map((t) => (
            <Link
              key={t.id}
              to={`/techniques/${t.id}`}
              className="rounded-3xl bg-surface p-5"
            >
              <p className="text-title">{t.name}</p>
              <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                {t.details ||
                  t.steps ||
                  "Agregá el detalle que te ayuda a ejecutarla."}
              </p>
            </Link>
          ))}
        </section>
      )}
      {proposals.data
        ?.filter((p) => p.status === "pending")
        .slice(0, 3)
        .map((p) => (
          <ProposalCard key={p.id} proposal={p} />
        ))}
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link to="/explore" />}
        >
          Explorar técnicas
        </Button>
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link to="/progress" />}
        >
          Ver progreso
        </Button>
        <Button
          variant="ghost"
          nativeButton={false}
          render={
            <Link to="/coach?prompt=Revisá%20mis%20clases%20confirmadas%20de%20esta%20semana.%20Mostrame%20patrones%20con%20fechas%20y%20preguntas%20para%20mi%20profesor." />
          }
        >
          Revisar mi semana
        </Button>
      </div>
    </div>
  );
}
