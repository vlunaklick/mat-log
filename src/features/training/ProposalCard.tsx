import type { Proposal } from "@/lib/training";
import {
  BELT_LABELS,
  POSITION_LABELS,
  STYLE_LABELS,
  label,
} from "@/lib/labels";
import { formatLongDate } from "@/lib/date";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Disclosure } from "@/components/app/disclosure";
import { useTrainingActions } from "./queries";
import { ErrorNotice } from "./shared";
const GOAL_STATUS_LABELS = {
  active: "Activo",
  completed: "Cumplido",
  paused: "En pausa",
} as const;
const KIND_LABELS = {
  goal: "Objetivo",
  gameplan: "Gameplan",
  profile: "Perfil",
} as const;
// Profile dates may be partial (e.g. "2019"); only full ISO dates get formatted.
const fmt = (d: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(d) ? formatLongDate(d) : d;
export function ProposalCard({ proposal }: { proposal: Proposal }) {
  const { decide } = useTrainingActions();
  const p = proposal.payload;
  return (
    <section className="rounded-3xl px-4 py-2 ring-1 ring-border-soft">
      <Disclosure
        summary={
          <span className="flex min-w-0 flex-col gap-1 py-1">
            <span className="text-label text-muted-foreground">
              Propuesta del coach · {KIND_LABELS[p.kind]}
              {proposal.status !== "pending" && (
                <Badge variant="outline" className="ml-2">
                  {proposal.status === "accepted" ? "Confirmada" : "Descartada"}
                </Badge>
              )}
            </span>
            <span className="font-medium text-foreground break-words">
              {proposal.title}
            </span>
          </span>
        }
      >
        <div className="flex flex-col gap-3 pb-2">
          {p.kind === "goal" && p.data.action && <p>{p.data.action}</p>}
          {p.kind === "gameplan" && p.data.intention && (
            <p>{p.data.intention}</p>
          )}
          <div className="flex flex-col gap-3 text-sm">
            {proposal.reason && (
              <p className="text-muted-foreground">{proposal.reason}</p>
            )}
            {p.kind === "goal" && (
              <>
                <p className="font-medium">{p.data.title}</p>
                <p className="text-muted-foreground">
                  {STYLE_LABELS[p.data.style]} ·{" "}
                  {label(GOAL_STATUS_LABELS, p.data.status)}
                </p>
                {p.data.notes && (
                  <p className="whitespace-pre-wrap">{p.data.notes}</p>
                )}
              </>
            )}
            {p.kind === "gameplan" && (
              <>
                <p className="font-medium">
                  {p.data.title} · {STYLE_LABELS[p.data.style]}
                </p>
                {p.data.assessment && (
                  <p className="whitespace-pre-wrap">{p.data.assessment}</p>
                )}
                <ol className="flex list-decimal flex-col gap-3 pl-5">
                  {p.data.nodes.map((n) => (
                    <li key={n.id}>
                      <p>
                        {label(POSITION_LABELS, n.position)}: {n.action}
                      </p>
                      <p className="text-muted-foreground">
                        {[
                          n.opponentResponse,
                          n.caution,
                          n.status === "suggested" ? "Por explorar" : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                      {n.next.length > 0 && (
                        <p>
                          Después:{" "}
                          {n.next
                            .map(
                              (id) =>
                                p.data.nodes.find((x) => x.id === id)?.action,
                            )
                            .filter(Boolean)
                            .join(" / ")}
                        </p>
                      )}
                    </li>
                  ))}
                </ol>
              </>
            )}
            {p.kind === "profile" && (
              <dl className="grid grid-cols-1 gap-2">
                {Object.entries({
                  Empezaste: p.data.startedOn && fmt(p.data.startedOn),
                  "Año de nacimiento": p.data.birthYear,
                  Altura: p.data.heightCm && `${p.data.heightCm} cm`,
                  Peso: p.data.weightKg && `${p.data.weightKg} kg`,
                  Preferencias: p.data.preferences,
                  Limitaciones: p.data.limitations,
                  Objetivos: p.data.ambitions,
                  Cinturones: p.data.belts
                    .map((b) => `${label(BELT_LABELS, b.belt)}: ${fmt(b.date)}`)
                    .join(" · "),
                  Pausas: p.data.breaks
                    .map(
                      (b) =>
                        `${fmt(b.start)} → ${b.end ? fmt(b.end) : "hoy"}${b.reason ? `: ${b.reason}` : ""}`,
                    )
                    .join(" · "),
                })
                  .filter(([, value]) => value)
                  .map(([name, value]) => (
                    <div key={name}>
                      <dt className="text-muted-foreground">{name}</dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
              </dl>
            )}
          </div>
          <ErrorNotice error={decide.error} />
          {proposal.status === "pending" && (
            <div className="flex flex-wrap gap-2">
              <Button
                disabled={decide.isPending}
                onClick={() =>
                  decide.mutate({ id: proposal.id, action: "accept" })
                }
              >
                Confirmar
              </Button>
              <Button
                variant="ghost"
                disabled={decide.isPending}
                onClick={() =>
                  decide.mutate({ id: proposal.id, action: "dismiss" })
                }
              >
                Descartar
              </Button>
            </div>
          )}
        </div>
      </Disclosure>
    </section>
  );
}
