import { useLiveQuery } from "dexie-react-hooks";
import { Link } from "react-router-dom";
import { db, DEFAULT_SETTINGS } from "../../lib/db";
import { PageHeader } from "@/components/app/page-header";
import { StatTile } from "@/components/app/stat-tile";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { formatDate, todayISO } from "../../lib/date";
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
  const sessions = useLiveQuery(() => db.sessions.orderBy("date").reverse().toArray(), []);
  const settings = useLiveQuery(() => db.settings.get("settings"), []);

  const weeklyGoal = settings?.weeklyGoalSessions ?? DEFAULT_SETTINGS.weeklyGoalSessions;
  const currentWeekStart = startOfWeekISO(todayISO());
  const sessionsThisWeek = (sessions ?? []).filter((s) => startOfWeekISO(s.date) === currentWeekStart).length;
  const streakWeeks = computeStreakWeeks(sessions ?? []);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Journal."
        lead="One line per class. Be honest."
        action={
          <Button nativeButton={false} render={<Link to="/session/new" />}>Log today's class</Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <StatTile label="This week" value={`${sessionsThisWeek} / ${weeklyGoal}`} hint="sessions" />
        <StatTile label="Streak" value={streakWeeks} hint={`week${streakWeeks === 1 ? "" : "s"}`} highlight={streakWeeks >= 2} />
      </div>

      {sessions === undefined ? null : sessions.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>No sessions yet.</EmptyTitle>
            <EmptyDescription>Log your first class to get started.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {sessions.map((s) => (
            <Link key={s.id} to={`/session/${s.id}`}>
              <Card className="transition-colors hover:bg-surface">
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle>{formatDate(s.date)}</CardTitle>
                    <Badge variant="outline">{s.style === "gi" ? "GI" : "NO-GI"}</Badge>
                  </div>
                  <CardDescription>
                    {s.durationMin} min &middot; {s.rolls.length} roll{s.rolls.length === 1 ? "" : "s"}
                  </CardDescription>
                </CardHeader>
                {(s.classTopic || s.nextFocus) && (
                  <CardContent className="flex flex-col gap-1">
                    {s.classTopic && <p className="text-sm text-foreground">{s.classTopic}</p>}
                    {s.nextFocus && <p className="text-sm text-brand">Next: {s.nextFocus}</p>}
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
