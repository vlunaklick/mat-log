import { useState } from "react";
import { Link } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { Search } from "lucide-react";
import { db } from "@/lib/db";
import { POSITIONS, type Position } from "@/lib/types";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from "@/components/ui/empty";

export default function TechniquesPage() {
  const [query, setQuery] = useState("");
  const [position, setPosition] = useState<Position | "all">("all");

  const techniques = useLiveQuery(() => db.techniques.toArray(), []);
  const now = Date.now();
  const dueCount = techniques?.filter((t) => t.dueAt <= now).length ?? 0;

  const filtered = (techniques ?? []).filter((t) => {
    if (position !== "all" && t.position !== position) return false;
    if (query.trim() && !t.name.toLowerCase().includes(query.trim().toLowerCase())) return false;
    return true;
  });

  const groups = POSITIONS.map((p) => ({
    position: p,
    items: filtered.filter((t) => t.position === p),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Techniques."
        action={
          <Button nativeButton={false} render={<Link to="/techniques/new" />}>Add technique</Button>
        }
      />

      <Card className="bg-surface ring-0">
        <div className="flex flex-col gap-4 px-5 md:flex-row md:items-center md:justify-between">
          <p className="text-lead">
            <span className="text-brand text-h2 font-heading">{dueCount}</span> due for review
          </p>
          <Button size="lg" disabled={dueCount === 0} nativeButton={false} render={<Link to="/review" />}>
            {dueCount === 0 ? "Nothing due" : "Review now"}
          </Button>
        </div>
      </Card>

      <div className="flex flex-col gap-4">
        <InputGroup>
          <InputGroupInput
            placeholder="Search techniques…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <InputGroupAddon>
            <Search data-icon="inline-start" />
          </InputGroupAddon>
        </InputGroup>

        <ToggleGroup
          variant="outline"
          value={[position]}
          onValueChange={(v) => setPosition(((v[0] as Position | "all") ?? "all"))}
          className="flex-wrap justify-start"
        >
          <ToggleGroupItem value="all">All</ToggleGroupItem>
          {POSITIONS.map((p) => (
            <ToggleGroupItem key={p} value={p}>
              {p}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      {techniques === undefined ? null : groups.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>No techniques found.</EmptyTitle>
            <EmptyDescription>Add your first one to start building your library.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="flex flex-col gap-8">
          {groups.map((g) => (
            <div key={g.position} className="flex flex-col gap-3">
              <h2 className="text-label text-muted-foreground">{g.position}</h2>
              <Card className="md:hidden">
                {g.items.map((t, i) => (
                  <div key={t.id}>
                    {i > 0 ? <Separator /> : null}
                    <Link to={`/techniques/${t.id}`} className="flex items-center justify-between gap-2 px-5 py-3">
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-medium">{t.name}</span>
                        <Badge variant="secondary">{t.type}</Badge>
                      </div>
                      {t.dueAt <= now && <Badge variant="outline">Due</Badge>}
                    </Link>
                  </div>
                ))}
              </Card>
              <div className="hidden gap-3 md:grid md:grid-cols-2">
                {g.items.map((t) => (
                  <Link key={t.id} to={`/techniques/${t.id}`}>
                    <Card className="flex-row items-center justify-between gap-2 px-5">
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-medium">{t.name}</span>
                        <Badge variant="secondary">{t.type}</Badge>
                      </div>
                      {t.dueAt <= now && <Badge variant="outline">Due</Badge>}
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
