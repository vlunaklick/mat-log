import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { ChevronRight, UserRound } from "lucide-react";
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
import { Disclosure } from "@/components/app/disclosure";
import { Button } from "@/components/ui/button";
import { ErrorNotice, Loading, StylePicker } from "./shared";
import { ProposalCard } from "./ProposalCard";

function RowLink({
  to,
  title,
  meta,
}: {
  to: string;
  title: string;
  meta?: string;
}) {
  return (
    <Link
      to={to}
      className="flex min-h-12 items-center gap-3 rounded-2xl px-3 py-2 transition-colors hover:bg-surface"
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{title}</span>
        {meta && (
          <span className="block truncate text-sm text-muted-foreground">
            {meta}
          </span>
        )}
      </span>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
    </Link>
  );
}

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
  const last = sessions.data?.find((s) => s.style === style);
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
  const styleGoals =
    training.data?.goals.filter((g) => g.style === style) ?? [];
  const styleName = STYLE_LABELS[style].toLowerCase();
  const prepareLink = goal
    ? `/coach?mode=today&prompt=${encodeURIComponent(`Voy a entrenar ${styleName}. Mi objetivo es ${goal.title}. Proponeme una acción concreta para esta clase, teniendo en cuenta mi gameplan y mis últimos logs.`)}`
    : `/coach?mode=today&prompt=${encodeURIComponent(`Quiero definir un objetivo para ${styleName}. Revisá mi perfil, mi gameplan y mis clases y proponeme uno con una acción pequeña.`)}`;
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
          <>
            <Button nativeButton={false} render={<Link to="/coach?mode=log" />}>
              Contar mi clase
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              aria-label="Perfil"
              nativeButton={false}
              render={<Link to="/settings" />}
            >
              <UserRound />
            </Button>
          </>
        }
      />
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
        <Link
          to={pending.length === 1 ? `/drafts/${pending[0].id}` : "/drafts"}
          className="-mt-4 flex min-h-12 items-center gap-3 rounded-full bg-surface py-2 pr-4 pl-2 transition-colors hover:bg-accent"
        >
          <span className="flex size-8 items-center justify-center rounded-full bg-brand text-sm font-semibold text-brand-foreground tabular-nums">
            {pending.length}
          </span>
          <span className="flex-1 text-sm font-medium">
            {pending.length === 1
              ? "Borrador sin confirmar"
              : "Borradores sin confirmar"}
          </span>
          <ChevronRight className="size-4 text-muted-foreground" />
        </Link>
      )}
      <section className="flex flex-col gap-5">
        <StylePicker value={style} onChange={setStyle} />
        {training.isPending ? (
          <Loading />
        ) : (
          <div className="flex flex-col gap-5 rounded-3xl bg-surface p-5 md:p-6">
            <div className="flex flex-col gap-2">
              <p className="text-label text-muted-foreground">Tu foco</p>
              {goal ? (
                <>
                  <p className="text-h3 md:text-h2">
                    {goal.action || goal.title}
                  </p>
                  {goal.action && (
                    <p className="text-sm text-muted-foreground">
                      {goal.title}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-h3">Sin foco para {styleName}</p>
              )}
            </div>
            {last?.nextFocus && (
              <div className="flex flex-col gap-1">
                <p className="text-label text-muted-foreground">
                  Lo que anotaste el {formatDate(last.date)}
                </p>
                <p className="whitespace-pre-wrap">{last.nextFocus}</p>
              </div>
            )}
            {goal?.notes && (
              <Disclosure summary="Notas del objetivo">
                <p className="whitespace-pre-wrap text-sm">{goal.notes}</p>
              </Disclosure>
            )}
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                nativeButton={false}
                render={<Link to={prepareLink} />}
              >
                {goal ? "Preparar con el coach" : "Definir con el coach"}
              </Button>
              {goal && (
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
              )}
            </div>
          </div>
        )}
      </section>
      {pendingProposals.map((p) => (
        <ProposalCard key={p.id} proposal={p} />
      ))}
      <nav aria-label="Atajos" className="-mx-3 flex flex-col">
        {linked.slice(0, 3).map((t) => (
          <RowLink
            key={t.id}
            to={`/techniques/${t.id}`}
            title={t.name}
            meta="Repasar antes de entrar"
          />
        ))}
        <RowLink
          to={`/gameplan?style=${style}`}
          title={plan?.title || `Gameplan de ${styleName}`}
          meta={
            plan?.nodes.length
              ? `${plan.nodes.filter((n) => n.status === "learned").length} aprendidos · ${plan.nodes.filter((n) => n.status === "suggested").length} por explorar`
              : "Todavía sin armar"
          }
        />
        {last && (
          <RowLink
            to={`/session/${last.id}`}
            title="Última clase"
            meta={[formatDate(last.date), last.classTopic]
              .filter(Boolean)
              .join(" · ")}
          />
        )}
      </nav>
      {styleGoals.length > 0 && (
        <Disclosure summary={`Mis objetivos de ${styleName}`}>
          <div className="flex flex-col gap-4 pt-2">
            {styleGoals.map((g) => (
              <div
                key={g.id}
                className="flex flex-wrap items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="font-medium">{g.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {g.status === "active"
                      ? "Activo"
                      : g.status === "completed"
                        ? "Cumplido"
                        : "En pausa"}
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
        </Disclosure>
      )}
    </div>
  );
}
