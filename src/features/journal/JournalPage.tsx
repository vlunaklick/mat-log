import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { useSessions, useSettings } from "@/lib/queries";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
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

function monthLabel(iso: string): string {
  const [y, m] = iso.split("-").map(Number);
  const label = new Date(y, m - 1, 1).toLocaleDateString("es", { month: "long", year: "numeric" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** Sessions arrive newest first; consecutive rows of the same month share a group. */
function groupByMonth(sessions: Session[]) {
  const groups: { month: string; items: Session[] }[] = [];
  for (const s of sessions) {
    const month = s.date.slice(0, 7);
    const group = groups[groups.length - 1];
    if (group?.month === month) group.items.push(s);
    else groups.push({ month, items: [s] });
  }
  return groups;
}

export default function JournalPage() {
  const { data: sessions, isPending, isError, error } = useSessions();
  const { data: settings } = useSettings();
  const { data: drafts } = useDrafts();
  const pendingDrafts = (drafts ?? []).filter((d) => d.status === "draft").length;

  const weeklyGoal = settings?.weeklyGoalSessions ?? 3;
  const currentWeekStart = startOfWeekISO(todayISO());
  const sessionsThisWeek = (sessions ?? []).filter((s) => startOfWeekISO(s.date) === currentWeekStart).length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Diario"
        lead={sessions ? `${sessionsThisWeek} de ${weeklyGoal} clases esta semana` : undefined}
        action={
          <>
            <Button nativeButton={false} render={<Link to="/coach?mode=log" />}>Contar mi clase</Button>
            <Button variant="ghost" nativeButton={false} render={<Link to="/session/new" />}>Registro manual</Button>
          </>
        }
      />

      {isError && (
        <Alert variant="destructive">
          <AlertDescription>{error instanceof Error ? error.message : "No se pudieron cargar las clases."}</AlertDescription>
        </Alert>
      )}

      <div className="-mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <Link to="/progress" className="text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline">
          Ver progreso
        </Link>
        {drafts && drafts.length > 0 && (
          <Link to="/drafts" className="text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline">
            Borradores{pendingDrafts > 0 ? ` · ${pendingDrafts} sin confirmar` : ""}
          </Link>
        )}
      </div>

      {isPending ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-14 rounded-2xl" />
          <Skeleton className="h-14 rounded-2xl" />
          <Skeleton className="h-14 rounded-2xl" />
        </div>
      ) : !sessions || sessions.length === 0 ? (
        <Blank
          title="Todavía no registraste clases"
          action={<Button nativeButton={false} render={<Link to="/coach?mode=log" />}>Contar mi primera clase</Button>}
        />
      ) : (
        <div className="flex flex-col gap-6">
          {groupByMonth(sessions).map((g) => (
            <section key={g.month} className="flex flex-col gap-1">
              <h2 className="text-label text-muted-foreground">{monthLabel(g.month)}</h2>
              <ul className="-mx-3 flex flex-col">
                {g.items.map((s) => (
                  <li key={s.id}>
                    <Link
                      to={`/session/${s.id}`}
                      className="flex min-h-14 items-center gap-3 rounded-2xl px-3 py-2 transition-colors hover:bg-surface"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{s.classTopic || "Clase sin tema"}</span>
                        <span className="block truncate text-sm text-muted-foreground">
                          {[
                            formatDate(s.date),
                            s.style ? STYLE_LABELS[s.style] : null,
                            s.durationMin === null ? null : `${s.durationMin} min`,
                            s.rolls.length ? `${s.rolls.length} roll${s.rolls.length === 1 ? "" : "s"}` : null,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </span>
                      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
