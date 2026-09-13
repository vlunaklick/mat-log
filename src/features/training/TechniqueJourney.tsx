import { Link } from "react-router-dom";
import { useSessions } from "@/lib/queries";
import {
  practiceTotals,
  techniqueProgress,
  STAGE_LABELS,
} from "@/lib/training";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { ErrorNotice } from "./shared";
export function TechniqueJourney({ id }: { id: number }) {
  const sessions = useSessions();
  const classes =
    sessions.data?.filter((s) => s.techniqueIds.includes(id)) ?? [];
  const evidence = classes
    .flatMap((s) => s.evidence ?? [])
    .filter((e) => e.techniqueId === id);
  const stats = practiceTotals(evidence);
  return (
    <Card>
      <CardHeader>
        <Badge variant="outline">
          {classes.length
            ? STAGE_LABELS[techniqueProgress(evidence)]
            : "Guardada para explorar"}
        </Badge>
        <CardTitle>Tu recorrido con esta técnica</CardTitle>
        <CardDescription>
          Recordar los pasos y aplicarlos en un roll son avances distintos.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <ErrorNotice error={sessions.error} />
        <p>
          {classes.length} clases registradas
          {stats.rate !== null
            ? ` · ${stats.successes} éxitos en ${stats.attempts} intentos medidos`
            : " · Sin cantidades suficientes para calcular éxito"}
        </p>
        {classes.slice(0, 10).map((s) => (
          <Link
            className="text-sm underline"
            key={s.id}
            to={`/session/${s.id}`}
          >
            {s.date} · {s.style ?? "Modalidad pendiente"} · {s.classTopic}
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
