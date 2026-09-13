import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Link } from "react-router-dom";
import { db, DEFAULT_SETTINGS } from "@/lib/db";
import {
  giVsNogi,
  outcomesByBelt,
  recentFocus,
  rollOutcomes,
  sessionCount,
  sessionsInLastDays,
  stuckPositions,
  techniqueDrillCounts,
  totalMatHours,
  weekStartISO,
  weekStreak,
  weeklyCounts,
} from "@/lib/stats";
import { formatDate, todayISO } from "@/lib/date";
import type { RollOutcome } from "@/lib/types";
import { PageHeader } from "@/components/app/page-header";
import { StatTile } from "@/components/app/stat-tile";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";

const OUTCOME_LABELS: Record<RollOutcome, string> = {
  dominated: "Dominated",
  won: "Won",
  even: "Even",
  lost: "Lost",
  survived: "Survived",
};

const OUTCOME_ORDER: RollOutcome[] = ["dominated", "won", "even", "lost", "survived"];
const STACK_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)"];

export default function ProgressPage() {
  const sessions = useLiveQuery(() => db.sessions.toArray(), []);
  const techniques = useLiveQuery(() => db.techniques.toArray(), []);
  const settings = useLiveQuery(() => db.settings.get("settings"), []);

  const weeklyGoal = settings?.weeklyGoalSessions ?? DEFAULT_SETTINGS.weeklyGoalSessions;

  const stats = useMemo(() => {
    const s = sessions ?? [];
    const t = techniques ?? [];
    return {
      hours: totalMatHours(s),
      count: sessionCount(s),
      streak: weekStreak(s),
      last30: sessionsInLastDays(s, 30),
      weekly: weeklyCounts(s, 12),
      stuck: stuckPositions(s).slice(0, 6),
      outcomes: rollOutcomes(s),
      byBelt: outcomesByBelt(s),
      gn: giVsNogi(s),
      drilled: techniqueDrillCounts(s, t).slice(0, 8),
      focus: recentFocus(s, 5),
    };
  }, [sessions, techniques]);

  if (sessions === undefined || techniques === undefined) {
    return (
      <div className="flex flex-col gap-8">
        <PageHeader title="Progress." lead="What the mat is telling you." />
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="flex flex-col gap-8">
        <PageHeader title="Progress." lead="What the mat is telling you." />
        <Empty>
          <EmptyHeader>
            <EmptyTitle>No sessions logged yet.</EmptyTitle>
            <EmptyDescription>Log your first class to start tracking progress.</EmptyDescription>
          </EmptyHeader>
          <Button nativeButton={false} render={<Link to="/" />}>Log today's class</Button>
        </Empty>
      </div>
    );
  }

  const currentWeekStart = weekStartISO(todayISO());
  const maxWeekCount = Math.max(1, ...stats.weekly.map((w) => w.count), weeklyGoal);
  const maxStuck = Math.max(1, ...stats.stuck.map((p) => p.count));
  const totalOutcomes = Object.values(stats.outcomes).reduce((a, b) => a + b, 0);
  const giTotal = stats.gn.gi + stats.gn.nogi;
  const giPct = giTotal > 0 ? Math.round((stats.gn.gi / giTotal) * 100) : 0;
  const nogiPct = giTotal > 0 ? 100 - giPct : 0;
  const goalY = 100 - (weeklyGoal / maxWeekCount) * 90;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Progress." lead="What the mat is telling you." />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Mat hours" value={stats.hours.toFixed(1)} />
        <StatTile label="Sessions" value={stats.count} />
        <StatTile label="Week streak" value={stats.streak} highlight={stats.streak >= 2} />
        <StatTile label="Last 30 days" value={stats.last30} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Last 12 weeks</CardTitle>
            <CardDescription>Sessions per week against your weekly goal.</CardDescription>
          </CardHeader>
          <CardContent>
            <svg viewBox="0 0 240 100" className="mt-2 h-28 w-full" preserveAspectRatio="none">
              <line
                x1={0}
                x2={240}
                y1={goalY}
                y2={goalY}
                stroke="var(--chart-2)"
                strokeWidth={1}
                strokeDasharray="4 3"
              />
              {stats.weekly.map((w, i) => {
                const barWidth = 240 / stats.weekly.length;
                const barHeight = Math.max(2, (w.count / maxWeekCount) * 90);
                const isCurrent = w.weekStart === currentWeekStart;
                const fill = w.count === 0 ? "var(--chart-4)" : isCurrent ? "var(--chart-5)" : "var(--chart-1)";
                return (
                  <rect
                    key={w.weekStart}
                    x={i * barWidth + barWidth * 0.15}
                    y={100 - barHeight}
                    width={barWidth * 0.7}
                    height={barHeight}
                    rx={1.5}
                    fill={fill}
                  />
                );
              })}
            </svg>
            <div className="mt-1 flex justify-between text-xs text-muted-foreground">
              <span>{formatDate(stats.weekly[0].weekStart)}</span>
              <span>{formatDate(stats.weekly[stats.weekly.length - 1].weekStart)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Where you get stuck</CardTitle>
            <CardDescription>Positions you tap or bail from most.</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.stuck.length === 0 ? (
              <p className="text-sm text-muted-foreground">No stuck positions logged yet.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {stats.stuck.map((p) => (
                  <div key={p.position} className="flex items-center gap-2">
                    <span className="w-32 shrink-0 truncate text-sm text-muted-foreground">{p.position}</span>
                    <div className="h-3 flex-1 overflow-hidden rounded-full bg-surface">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${(p.count / maxStuck) * 100}%`, backgroundColor: "var(--chart-1)" }}
                      />
                    </div>
                    <span className="w-6 text-right text-sm text-muted-foreground">{p.count}</span>
                  </div>
                ))}
              </div>
            )}
            <p className="mt-3 text-xs text-text-faint">Ask your coach for escapes from your top position</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Roll outcomes</CardTitle>
            <CardDescription>How your rolls have gone overall.</CardDescription>
          </CardHeader>
          <CardContent>
            {totalOutcomes === 0 ? (
              <p className="text-sm text-muted-foreground">No rolls logged yet.</p>
            ) : (
              <>
                <div className="flex h-4 overflow-hidden rounded-full bg-surface">
                  {OUTCOME_ORDER.map((k, i) =>
                    stats.outcomes[k] > 0 ? (
                      <div
                        key={k}
                        style={{
                          width: `${(stats.outcomes[k] / totalOutcomes) * 100}%`,
                          backgroundColor: STACK_COLORS[i % STACK_COLORS.length],
                        }}
                      />
                    ) : null,
                  )}
                </div>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
                  {OUTCOME_ORDER.map((k, i) => (
                    <span key={k} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span
                        className="squircle inline-block size-2"
                        style={{ backgroundColor: STACK_COLORS[i % STACK_COLORS.length] }}
                      />
                      {OUTCOME_LABELS[k]}: {stats.outcomes[k]}
                    </span>
                  ))}
                </div>
              </>
            )}

            {stats.byBelt.length > 0 && (
              <table className="mt-4 w-full text-sm">
                <thead>
                  <tr className="text-label text-muted-foreground">
                    <th className="py-1 text-left font-medium">Belt</th>
                    <th className="py-1 text-right font-medium">Rolls</th>
                    <th className="py-1 text-right font-medium">Won/Dom</th>
                    <th className="py-1 text-right font-medium">Lost/Surv</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.byBelt.map((b) => (
                    <tr key={b.belt} className="border-t border-border-soft">
                      <td className="py-1.5 capitalize">{b.belt}</td>
                      <td className="py-1.5 text-right">{b.rolls}</td>
                      <td className="py-1.5 text-right">{b.wonOrDominated}</td>
                      <td className="py-1.5 text-right">{b.lostOrSurvived}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Gi vs no-gi</CardTitle>
            <CardDescription>Where your mat minutes go.</CardDescription>
          </CardHeader>
          <CardContent>
            {giTotal === 0 ? (
              <p className="text-sm text-muted-foreground">No training minutes logged yet.</p>
            ) : (
              <>
                <div className="flex items-center gap-6">
                  <div>
                    <p className="text-h3">{stats.gn.gi}m</p>
                    <p className="text-xs text-muted-foreground">Gi ({giPct}%)</p>
                  </div>
                  <div>
                    <p className="text-h3">{stats.gn.nogi}m</p>
                    <p className="text-xs text-muted-foreground">No-gi ({nogiPct}%)</p>
                  </div>
                </div>
                <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-surface">
                  <div style={{ width: `${giPct}%`, backgroundColor: "var(--chart-1)" }} />
                  <div style={{ width: `${nogiPct}%`, backgroundColor: "var(--chart-3)" }} />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Most drilled</CardTitle>
            <CardDescription>Techniques you've reinforced most in class.</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.drilled.length === 0 ? (
              <p className="text-sm text-muted-foreground">No techniques drilled yet.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {stats.drilled.map((d, i) => (
                  <div key={d.technique.id} className="flex items-center gap-2">
                    <span className="w-5 shrink-0 text-sm text-text-faint">{i + 1}</span>
                    <span className="flex-1 truncate text-sm">{d.technique.name}</span>
                    <Badge variant="secondary">{d.count}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent focus</CardTitle>
            <CardDescription>What you told yourself to work on next.</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.focus.length === 0 ? (
              <p className="text-sm text-muted-foreground">No focus notes yet.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {stats.focus.map((f) => (
                  <li key={f.date} className="text-sm">
                    <span className="text-muted-foreground">{formatDate(f.date)}: </span>
                    <span>{f.nextFocus}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
