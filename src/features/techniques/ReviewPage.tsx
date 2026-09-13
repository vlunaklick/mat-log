import { useState } from "react";
import { Link } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { schedule, type Grade } from "@/lib/srs";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty";

export default function ReviewPage() {
  const [showBack, setShowBack] = useState(false);
  // Ids graded "Again" this session: kept in the queue even though their new
  // dueAt (a few minutes out) would otherwise fall outside the due filter.
  const [keepInSession, setKeepInSession] = useState<number[]>([]);
  const [doneCount, setDoneCount] = useState(0);

  const dueTechniques = useLiveQuery(async () => {
    const now = Date.now();
    const all = await db.techniques.toArray();
    return all
      .filter((t) => t.dueAt <= now || (t.id !== undefined && keepInSession.includes(t.id)))
      .sort((a, b) => a.dueAt - b.dueAt);
  }, [keepInSession]);

  if (dueTechniques === undefined) {
    return (
      <div className="flex flex-col gap-8">
        <PageHeader title="Review." />
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (dueTechniques.length === 0) {
    return (
      <div className="flex flex-col gap-8">
        <PageHeader title="Review." />
        <Empty>
          <EmptyHeader>
            <EmptyTitle>All caught up.</EmptyTitle>
            <EmptyDescription>No techniques are due for review right now.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button nativeButton={false} render={<Link to="/techniques" />}>Back to techniques</Button>
          </EmptyContent>
        </Empty>
      </div>
    );
  }

  const current = dueTechniques[0];
  const total = doneCount + dueTechniques.length;

  async function grade(g: Grade) {
    if (!current?.id) return;
    const id = current.id;
    const fields = schedule(current, g);
    await db.techniques.update(id, fields);
    setKeepInSession((prev) => (g === "again" ? (prev.includes(id) ? prev : [...prev, id]) : prev.filter((i) => i !== id)));
    setDoneCount((n) => n + (g === "again" ? 0 : 1));
    setShowBack(false);
  }

  return (
    <div className="mx-auto flex w-full max-w-[560px] flex-col gap-6">
      <PageHeader title="Review." />

      <div className="flex flex-col gap-2">
        <Progress value={total > 0 ? (doneCount / total) * 100 : 0} />
        <p className="text-sm text-muted-foreground">{dueTechniques.length} left</p>
      </div>

      <Card key={current.id} className="gap-6 p-5">
        <div className="flex flex-col gap-2">
          <h2 className="text-h2">{current.name}</h2>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{current.position}</Badge>
            <Badge variant="outline">{current.type}</Badge>
          </div>
        </div>

        {!showBack ? (
          <>
            <p className="text-muted-foreground">Recall the steps and key details.</p>
            <Button className="w-full" size="lg" onClick={() => setShowBack(true)}>
              Show
            </Button>
          </>
        ) : (
          <>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <h3 className="text-label text-muted-foreground">Steps</h3>
                <p className="whitespace-pre-wrap text-sm">{current.steps || "—"}</p>
              </div>
              <div className="flex flex-col gap-1">
                <h3 className="text-label text-muted-foreground">Details</h3>
                <p className="whitespace-pre-wrap text-sm">{current.details || "—"}</p>
              </div>
              <div className="flex flex-col gap-1">
                <h3 className="text-label text-muted-foreground">Mistakes</h3>
                <p className="whitespace-pre-wrap text-sm">{current.mistakes || "—"}</p>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2">
              <Button variant="outline" onClick={() => grade("again")}>
                Again
              </Button>
              <Button variant="outline" onClick={() => grade("hard")}>
                Hard
              </Button>
              <Button onClick={() => grade("good")}>Good</Button>
              <Button variant="secondary" onClick={() => grade("easy")}>
                Easy
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
