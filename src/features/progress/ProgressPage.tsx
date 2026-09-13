import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useSessions, useSettings, useTechniques } from "@/lib/queries";
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
import { BELT_LABELS, OUTCOME_LABELS, POSITION_LABELS } from "@/lib/labels";
import type { RollOutcome } from "@/lib/types";
import { PageHeader } from "@/components/app/page-header";
import { StatTile } from "@/components/app/stat-tile";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Blank } from "@/features/training/shared";

const OUTCOME_ORDER: RollOutcome[] = ["dominated", "won", "even", "lost", "survived", "unknown"];
/** Six-step grayscale ladder, darkest for the best outcome, so no two outcomes share a color. */
const OUTCOME_COLORS: Record<RollOutcome, string> = {
  dominated: "var(--chart-1)",
  won: "color-mix(in srgb, var(--chart-1) 55%, var(--chart-2))",
  even: "var(--chart-2)",
  lost: "var(--chart-3)",
  survived: "var(--chart-4)",
  unknown: "color-mix(in srgb, var(--chart-4) 45%, var(--background))",
};

/** Minutes as readable hours: "3,5 h". */
function formatHours(minutes: number): string {
  return `${(minutes / 60).toLocaleString("es", { maximumFractionDigits: 1 })} h`;
}

export default function ProgressPage() {
  const { data: sessions, isPending: sessionsPending, isError, error } = useSessions();
  const { data: techniques, isPending: techniquesPending } = useTechniques();
  const { data: settings } = useSettings();

  const weeklyGoal = settings?.weeklyGoalSessions ?? 3;
  const isPending = sessionsPending || techniquesPending;

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

  if (isError) {
    return (
      <div className="flex flex-col gap-8">
        <PageHeader title="Progreso" />
        <Alert variant="destructive">
          <AlertDescription>{error instanceof Error ? error.message : "No se pudo cargar tu progreso."}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isPending || !sessions || !techniques) {
    return (
      <div className="flex flex-col gap-8">
        <PageHeader title="Progreso" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Skeleton className="h-24 rounded-3xl" />
          <Skeleton className="h-24 rounded-3xl" />
          <Skeleton className="h-24 rounded-3xl" />
          <Skeleton className="h-24 rounded-3xl" />
        </div>
        <Skeleton className="h-48 rounded-3xl" />
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="flex flex-col gap-8">
        <PageHeader title="Progreso" />
        <Blank
          title="Todavía no registraste clases"
          action={<Button nativeButton={false} render={<Link to="/coach?mode=log" />}>Registrar clase</Button>}
        />
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
  const withoutDuration = sessions.filter((s) => s.durationMin === null).length;
  const topStuck = stats.stuck[0] ? POSITION_LABELS[stats.stuck[0].position] : null;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Progreso" />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Horas"
          value={withoutDuration < sessions.length ? stats.hours.toLocaleString("es", { maximumFractionDigits: 1 }) : "—"}
          hint={withoutDuration > 0 ? `${withoutDuration} ${withoutDuration === 1 ? "clase" : "clases"} sin duración` : undefined}
        />
        <StatTile label="Clases" value={stats.count} />
        <StatTile label="Semanas seguidas" value={stats.streak} highlight={stats.streak >= 2} />
        <StatTile label="Últimos 30 días" value={stats.last30} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Últimas 12 semanas</CardTitle>
            <CardDescription>
              Clases por semana. La línea punteada es tu meta de {weeklyGoal}.
            </CardDescription>
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
            <CardTitle>Dónde te trabás</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.stuck.length === 0 ? (
              <p className="text-sm text-muted-foreground">Todavía no registraste posiciones.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {stats.stuck.map((p) => (
                  <div key={p.position} className="flex items-center gap-2">
                    <span className="w-32 shrink-0 truncate text-sm text-muted-foreground">{POSITION_LABELS[p.position]}</span>
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
            {topStuck ? (
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                nativeButton={false}
                render={
                  <Link
                    to={`/coach?prompt=${encodeURIComponent(`La posición donde más me trabo: ${topStuck.toLowerCase()}. ¿Qué salidas me recomendás practicar?`)}`}
                  />
                }
              >
                Pedir escapes al coach
              </Button>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resultados de rolls</CardTitle>
          </CardHeader>
          <CardContent>
            {totalOutcomes === 0 ? (
              <p className="text-sm text-muted-foreground">Todavía no registraste rolls.</p>
            ) : (
              <>
                <div className="flex h-4 overflow-hidden rounded-full bg-surface">
                  {OUTCOME_ORDER.map((k) =>
                    stats.outcomes[k] > 0 ? (
                      <div
                        key={k}
                        style={{
                          width: `${(stats.outcomes[k] / totalOutcomes) * 100}%`,
                          backgroundColor: OUTCOME_COLORS[k],
                        }}
                      />
                    ) : null,
                  )}
                </div>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
                  {OUTCOME_ORDER.map((k) => stats.outcomes[k] === 0 ? null : (
                    <span key={k} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span
                        className="squircle inline-block size-2"
                        style={{ backgroundColor: OUTCOME_COLORS[k] }}
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
                    <th className="py-1 text-left font-medium">Compañero</th>
                    <th className="py-1 text-right font-medium">Rolls</th>
                    <th className="py-1 text-right font-medium">A favor</th>
                    <th className="py-1 text-right font-medium">En contra</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.byBelt.map((b) => (
                    <tr key={b.belt} className="border-t border-border-soft">
                      <td className="py-1.5">{BELT_LABELS[b.belt]}</td>
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
            <CardTitle>Gi vs. no-gi</CardTitle>
          </CardHeader>
          <CardContent>
            {giTotal === 0 ? (
              <p className="text-sm text-muted-foreground">Todavía no hay clases con duración.</p>
            ) : (
              <>
                <div className="flex items-center gap-6">
                  <div>
                    <p className="text-h3">{formatHours(stats.gn.gi)}</p>
                    <p className="text-xs text-muted-foreground">Gi ({giPct}%)</p>
                  </div>
                  <div>
                    <p className="text-h3">{formatHours(stats.gn.nogi)}</p>
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
            <CardTitle>Técnicas más practicadas</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.drilled.length === 0 ? (
              <p className="text-sm text-muted-foreground">Todavía no registraste técnicas.</p>
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
            <CardTitle>Lo que te propusiste trabajar</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.focus.length === 0 ? (
              <p className="text-sm text-muted-foreground">Todavía no anotaste un foco.</p>
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
