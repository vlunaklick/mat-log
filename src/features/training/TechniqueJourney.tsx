import { Link } from "react-router-dom";
import { useSessions } from "@/lib/queries";
import {
  practiceTotals,
  techniqueProgress,
  STAGE_LABELS,
} from "@/lib/training";
import { STYLE_LABELS, label } from "@/lib/labels";
import { formatDate } from "@/lib/date";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
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
            : "Guardada"}
        </Badge>
        <CardTitle>Tu recorrido con esta técnica</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <ErrorNotice error={sessions.error} />
        <p>
          {classes.length === 0
            ? "Todavía no la practicaste en clase."
            : classes.length === 1
              ? "1 clase"
              : `${classes.length} clases`}
          {stats.rate !== null &&
            ` · ${stats.successes} de ${stats.attempts} intentos salieron`}
        </p>
        {classes.slice(0, 10).map((s) => (
          <Link
            className="text-sm underline"
            key={s.id}
            to={`/session/${s.id}`}
          >
            {[
              formatDate(s.date),
              label(STYLE_LABELS, s.style, ""),
              s.classTopic,
            ]
              .filter(Boolean)
              .join(" · ")}
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
