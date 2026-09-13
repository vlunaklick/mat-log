import { Link } from "react-router-dom";
import { useSessions, useSettings } from "@/lib/queries";
import { PageHeader } from "@/components/app/page-header";
import { StatTile } from "@/components/app/stat-tile";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { useDrafts } from "../training/queries";
import { Blank } from "../training/shared";
import { formatDate, todayISO } from "../../lib/date";
import { STYLE_LABELS } from "../../lib/labels";
import type { Session } from "../../lib/types";

function startOfWeekISO(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const day = date.getDay(); // 0 = Sunday
  const diff = day === 0 ? 6 : day - 1; // Monday as start of week
  date.setDate(date.getDate() - diff);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function computeStreakWeeks(sessions: Session[]): number {
  if (sessions.length === 0) return 0;
  const weekStarts = new Set(sessions.map((s) => startOfWeekISO(s.date)));
  const currentWeekStart = startOfWeekISO(todayISO());
  let streak = 0;
  let cursor = currentWeekStart;
  while (weekStarts.has(cursor)) {
    streak += 1;
    const [y, m, d] = cursor.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() - 7);
    cursor = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }
  return streak;
}

export default function JournalPage() {
  const { data: sessions, isPending, isError, error } = useSessions();
  const { data: settings } = useSettings();
  const { data: drafts } = useDrafts();
  const pendingDrafts = (drafts ?? []).filter((d) => d.status === "draft").length;

  const weeklyGoal = settings?.weeklyGoalSessions ?? 3;
  const currentWeekStart = startOfWeekISO(todayISO());
  const sessionsThisWeek = (sessions ?? []).filter((s) => startOfWeekISO(s.date) === currentWeekStart).length;
  const streakWeeks = computeStreakWeeks(sessions ?? []);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Diario"
        action={
          <>
            <Button variant="outline" nativeButton={false} render={<Link to="/session/new" />}>Registro manual</Button>
            <Button nativeButton={false} render={<Link to="/coach?mode=log" />}>Contar mi clase</Button>
          </>
        }
      />

      {isError && (
        <Alert variant="destructive">
          <AlertDescription>{error instanceof Error ? error.message : "No se pudieron cargar las clases."}</AlertDescription>
        </Alert>
      )}

      {drafts && drafts.length > 0 && (
        <Link to="/drafts" className="-mt-2 w-fit text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline">
          Borradores{pendingDrafts > 0 ? ` · ${pendingDrafts} sin confirmar` : ""}
        </Link>
      )}

      <div className="grid grid-cols-2 gap-3">
        <StatTile label="Esta semana" value={`${sessionsThisWeek} / ${weeklyGoal}`} hint="clases" />
        <StatTile label="Racha" value={streakWeeks} hint={streakWeeks === 1 ? "semana" : "semanas"} highlight={streakWeeks >= 2} />
      </div>

      {isPending ? (
        <div className="grid gap-3 md:grid-cols-2">
          <Skeleton className="h-32 rounded-3xl" />
          <Skeleton className="h-32 rounded-3xl" />
        </div>
      ) : !sessions || sessions.length === 0 ? (
        <Blank
          title="Todavía no registraste clases"
          action={<Button nativeButton={false} render={<Link to="/coach?mode=log" />}>Contar mi primera clase</Button>}
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {sessions.map((s) => (
            <Link key={s.id} to={`/session/${s.id}`}>
              <Card className="transition-colors hover:bg-surface">
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle>{formatDate(s.date)}</CardTitle>
                    <Badge variant="outline">{s.style ? STYLE_LABELS[s.style] : "Sin modalidad"}</Badge>
                  </div>
                  <CardDescription>
                    {s.durationMin === null ? "Sin duración" : `${s.durationMin} min`} &middot; {s.rolls.length} roll{s.rolls.length === 1 ? "" : "s"}
                  </CardDescription>
                </CardHeader>
                {(s.classTopic || s.nextFocus) && (
                  <CardContent className="flex flex-col gap-1">
                    {s.classTopic && <p className="text-sm text-foreground">{s.classTopic}</p>}
                    {s.nextFocus && <p className="text-sm text-muted-foreground">Próximo foco: {s.nextFocus}</p>}
                  </CardContent>
                )}
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
