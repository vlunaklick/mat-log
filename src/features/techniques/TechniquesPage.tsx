import { useState } from "react";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import { useSessions } from "@/lib/queries";
import { techniqueProgress, STAGE_LABELS } from "@/lib/training";
import { useTechniques } from "@/lib/queries";
import { POSITIONS, type Position } from "@/lib/types";
import { POSITION_LABELS } from "@/lib/labels";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Blank } from "@/features/training/shared";

export default function TechniquesPage() {
  const sessions = useSessions();
  const [libraryView, setLibraryView] = useState("learned");
  const practicedIds = new Set(sessions.data?.flatMap(s => s.techniqueIds) ?? []);
  const evidence = sessions.data?.flatMap(s => s.evidence ?? []) ?? [];
  const [query, setQuery] = useState("");
  const [position, setPosition] = useState<Position | "all">("all");

  const { data: techniques, isPending, isError, error } = useTechniques();
  const now = Date.now();
  const isDue = (t: { id?: number; dueAt: number }) => practicedIds.has(t.id!) && t.dueAt <= now;
  const dueCount = techniques?.filter((t) => !t.archived && isDue(t)).length ?? 0;
  const hasFilters = position !== "all" || query.trim() !== "";

  const filtered = (techniques ?? []).filter((t) => {
    if (t.archived) return false;
    if (libraryView === "learned" && !practicedIds.has(t.id!)) return false;
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
        title="Técnicas"
        action={
          <>
            <Button variant="outline" nativeButton={false} render={<Link to="/explore" />}>
              Explorar catálogo
            </Button>
            <Button nativeButton={false} render={<Link to="/techniques/new" />}>
              Nueva técnica
            </Button>
          </>
        }
      />

      {isError && (
        <Alert variant="destructive">
          <AlertDescription>{error instanceof Error ? error.message : "No se pudieron cargar las técnicas."}</AlertDescription>
        </Alert>
      )}

      {dueCount > 0 && (
        <Card className="bg-surface ring-0">
          <div className="flex flex-col gap-4 px-5 md:flex-row md:items-center md:justify-between">
            <p className="text-lead">
              <span className="text-brand text-h2 font-heading">{dueCount}</span>{" "}
              {dueCount === 1 ? "técnica para repasar" : "técnicas para repasar"}
            </p>
            <Button variant="outline" nativeButton={false} render={<Link to="/review" />}>
              Repasar
            </Button>
          </div>
        </Card>
      )}

      <div className="flex flex-col gap-4">
        <ToggleGroup aria-label="Vista" value={[libraryView]} onValueChange={(v) => v[0] && setLibraryView(v[0])}>
          <ToggleGroupItem value="learned">Practicadas</ToggleGroupItem>
          <ToggleGroupItem value="saved">Todas</ToggleGroupItem>
        </ToggleGroup>

        <InputGroup>
          <InputGroupInput
            aria-label="Buscar técnicas"
            placeholder="Buscar técnicas…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <InputGroupAddon>
            <Search data-icon="inline-start" />
          </InputGroupAddon>
        </InputGroup>

        <ToggleGroup
          aria-label="Posición"
          variant="outline"
          value={[position]}
          onValueChange={(v) => setPosition(((v[0] as Position | "all") ?? "all"))}
          className="-mx-4 w-auto justify-start overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:flex-wrap md:px-0"
        >
          <ToggleGroupItem value="all">Todas</ToggleGroupItem>
          {POSITIONS.map((p) => (
            <ToggleGroupItem key={p} value={p}>
              {POSITION_LABELS[p]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      {isPending || sessions.isPending ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-24 rounded-3xl" />
          <Skeleton className="h-24 rounded-3xl" />
        </div>
      ) : groups.length === 0 ? (
        hasFilters ? (
          <Blank
            title="Sin resultados"
            action={
              <Button variant="outline" onClick={() => { setQuery(""); setPosition("all"); }}>
                Limpiar filtros
              </Button>
            }
          />
        ) : libraryView === "learned" ? (
          <Blank
            title="Todavía no practicaste técnicas"
            action={
              <Button variant="outline" onClick={() => setLibraryView("saved")}>
                Ver todas
              </Button>
            }
          >
            Aparecen acá cuando confirmás una clase.
          </Blank>
        ) : (
          <Blank
            title="Tu biblioteca está vacía"
            action={
              <Button variant="outline" nativeButton={false} render={<Link to="/explore" />}>
                Explorar catálogo
              </Button>
            }
          />
        )
      ) : (
        <div className="flex flex-col gap-8">
          {groups.map((g) => (
            <div key={g.position} className="flex flex-col gap-3">
              <h2 className="text-label text-muted-foreground">{POSITION_LABELS[g.position]}</h2>
              <div className="grid gap-3 md:grid-cols-2">
                {g.items.map((t) => (
                  <Link key={t.id} to={`/techniques/${t.id}`}>
                    <Card className="flex-row items-center justify-between gap-2 px-5">
                      <div className="flex flex-col items-start gap-1">
                        <span className="text-sm font-medium">{t.name}</span>
                        <Badge variant="secondary">
                          {practicedIds.has(t.id!)
                            ? STAGE_LABELS[techniqueProgress(evidence.filter(e => e.techniqueId === t.id))]
                            : "Guardada"}
                        </Badge>
                      </div>
                      {isDue(t) && <Badge variant="outline">Para repasar</Badge>}
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
