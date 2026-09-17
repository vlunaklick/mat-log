import { useState } from "react";
import { Link } from "react-router-dom";
import { useTechniqueMutations, useTechniques, useSessions } from "@/lib/queries";
import type { Grade } from "@/lib/srs";
import { POSITION_LABELS, TECHNIQUE_TYPE_LABELS } from "@/lib/labels";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Blank } from "@/features/training/shared";

const BACK = { to: "/techniques", label: "Técnicas" };

export default function ReviewPage() {
  const sessions = useSessions();
  const practiced = new Set(sessions.data?.flatMap(s => s.techniqueIds) ?? []);
  const [showBack, setShowBack] = useState(false);
  // Ids graded "Again" this session: kept in the queue even though their new
  // dueAt (a few minutes out) would otherwise fall outside the due filter.
  const [keepInSession, setKeepInSession] = useState<number[]>([]);
  const [doneCount, setDoneCount] = useState(0);

  const { data: techniques, isPending } = useTechniques();
  const { review } = useTechniqueMutations();

  if (isPending || sessions.isPending) {
    return (
      <div className="mx-auto flex w-full max-w-[560px] flex-col gap-6">
        <PageHeader title="Repaso" back={BACK} />
        <Skeleton className="h-64 rounded-3xl" />
      </div>
    );
  }

  const now = Date.now();
  const dueTechniques = (techniques ?? [])
    .filter((t) => !t.archived && practiced.has(t.id!) && (t.dueAt <= now || (t.id !== undefined && keepInSession.includes(t.id))))
    .sort((a, b) => a.dueAt - b.dueAt);

  if (dueTechniques.length === 0) {
    return (
      <div className="mx-auto flex w-full max-w-[560px] flex-col gap-6">
        <PageHeader title="Repaso" back={BACK} />
        <Blank
          title="No hay técnicas para repasar"
          action={
            <Button variant="outline" nativeButton={false} render={<Link to="/techniques" />}>
              Ver técnicas
            </Button>
          }
        >
          Volvé después de tu próxima clase.
        </Blank>
      </div>
    );
  }

  const current = dueTechniques[0];
  const total = doneCount + dueTechniques.length;
  const notes = [
    { title: "Pasos", text: current.steps },
    { title: "Detalles", text: current.details },
    { title: "Errores comunes", text: current.mistakes },
  ].filter((n) => n.text?.trim());

  async function grade(g: Grade) {
    if (!current?.id) return;
    const id = current.id;
    await review.mutateAsync({ id, grade: g });
    setKeepInSession((prev) => (g === "again" ? (prev.includes(id) ? prev : [...prev, id]) : prev.filter((i) => i !== id)));
    setDoneCount((n) => n + (g === "again" ? 0 : 1));
    setShowBack(false);
  }

  return (
    <div className="mx-auto flex w-full max-w-[560px] flex-col gap-6">
      <PageHeader title="Repaso" back={BACK} />

      {review.isError && (
        <Alert variant="destructive">
          <AlertDescription>
            {review.error instanceof Error ? review.error.message : "No se pudo guardar el repaso."}
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-2">
        <Progress value={total > 0 ? (doneCount / total) * 100 : 0} />
        <p className="text-sm text-muted-foreground">
          {dueTechniques.length === 1 ? "Queda 1" : `Quedan ${dueTechniques.length}`}
        </p>
      </div>

      <Card key={current.id} className="gap-6 p-5">
        <div className="flex flex-col gap-2">
          <h2 className="text-h2">{current.name}</h2>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{POSITION_LABELS[current.position]}</Badge>
            <Badge variant="outline">{TECHNIQUE_TYPE_LABELS[current.type]}</Badge>
          </div>
        </div>

        {!showBack ? (
          <>
            <p className="text-muted-foreground">Recordá los pasos y los detalles clave.</p>
            <Button className="w-full" size="lg" onClick={() => setShowBack(true)}>
              Ver respuesta
            </Button>
          </>
        ) : (
          <>
            {notes.length > 0 ? (
              <div className="flex flex-col gap-4">
                {notes.map((n) => (
                  <div key={n.title} className="flex flex-col gap-1">
                    <h3 className="text-label text-muted-foreground">{n.title}</h3>
                    <p className="whitespace-pre-wrap text-sm">{n.text}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Sin notas.{" "}
                <Link to={`/techniques/${current.id}`} className="text-foreground underline">
                  Agregalas
                </Link>
              </p>
            )}

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Button variant="outline" disabled={review.isPending} onClick={() => grade("again")}>
                Otra vez
              </Button>
              <Button variant="outline" disabled={review.isPending} onClick={() => grade("hard")}>
                Difícil
              </Button>
              <Button disabled={review.isPending} onClick={() => grade("good")}>Bien</Button>
              <Button variant="secondary" disabled={review.isPending} onClick={() => grade("easy")}>
                Fácil
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
