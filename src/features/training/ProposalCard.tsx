import type { Proposal } from "@/lib/training";
import { BELT_LABELS, POSITION_LABELS, STYLE_LABELS, label } from "@/lib/labels";
import { formatLongDate } from "@/lib/date";
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
import { useTrainingActions } from "./queries";
import { ErrorNotice } from "./shared";
const GOAL_STATUS_LABELS = {
  active: "Activo",
  completed: "Cumplido",
  paused: "En pausa",
} as const;
// Profile dates may be partial (e.g. "2019"); only full ISO dates get formatted.
const fmt = (d: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(d) ? formatLongDate(d) : d;
export function ProposalCard({ proposal }: { proposal: Proposal }) {
  const { decide } = useTrainingActions();
  const p = proposal.payload;
  return (
    <Card>
      <CardHeader>
        <Badge variant="outline">
          {proposal.status === "pending"
            ? "Propuesta"
            : proposal.status === "accepted"
              ? "Confirmada"
              : "Descartada"}
        </Badge>
        <CardTitle>{proposal.title}</CardTitle>
        <CardDescription>{proposal.reason}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {p.kind === "goal" && (
          <>
            <p className="text-title">{p.data.title}</p>
            <p>{p.data.action}</p>
            <p className="text-sm text-muted-foreground">
              {STYLE_LABELS[p.data.style]} ·{" "}
              {label(GOAL_STATUS_LABELS, p.data.status)}
            </p>
            {p.data.notes && <p>{p.data.notes}</p>}
          </>
        )}
        {p.kind === "gameplan" && (
          <>
            <p className="text-title">
              {p.data.title} · {STYLE_LABELS[p.data.style]}
            </p>
            {p.data.intention && <p>{p.data.intention}</p>}
            {p.data.assessment && (
              <p className="whitespace-pre-wrap text-sm">
                {p.data.assessment}
              </p>
            )}
            <ol className="flex list-decimal flex-col gap-3 pl-5">
              {p.data.nodes.map((n) => (
                <li key={n.id}>
                  <p>
                    {label(POSITION_LABELS, n.position)}: {n.action}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {[
                      n.opponentResponse,
                      n.caution,
                      n.status === "suggested" ? "Por explorar" : "Aprendida",
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  {n.next.length > 0 && (
                    <p className="text-sm">
                      Después:{" "}
                      {n.next
                        .map(
                          (id) => p.data.nodes.find((x) => x.id === id)?.action,
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
          <dl className="grid grid-cols-1 gap-2 text-sm">
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
        <ErrorNotice error={decide.error} />
      </CardContent>
      {proposal.status === "pending" && (
        <CardFooter className="flex flex-wrap gap-2">
          <Button
            disabled={decide.isPending}
            onClick={() => decide.mutate({ id: proposal.id, action: "accept" })}
          >
            Confirmar
          </Button>
          <Button
            variant="outline"
            disabled={decide.isPending}
            onClick={() =>
              decide.mutate({ id: proposal.id, action: "dismiss" })
            }
          >
            Descartar
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
