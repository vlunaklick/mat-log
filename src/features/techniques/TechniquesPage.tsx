import { useState } from "react";
import { Link } from "react-router-dom";
import { History, Search, X } from "lucide-react";
import { useSessions } from "@/lib/queries";
import { techniqueProgress, STAGE_LABELS } from "@/lib/training";
import { useTechniques } from "@/lib/queries";
import { POSITIONS, type Position } from "@/lib/types";
import { POSITION_LABELS } from "@/lib/labels";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
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

  const beforePosition = (techniques ?? []).filter((t) => {
    if (t.archived) return false;
    if (libraryView === "learned" && !practicedIds.has(t.id!)) return false;
    if (query.trim() && !t.name.toLowerCase().includes(query.trim().toLowerCase())) return false;
    return true;
  });

  const availablePositions = POSITIONS.filter((p) => beforePosition.some((t) => t.position === p));

  const filtered = beforePosition.filter((t) => position === "all" || t.position === position);

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
            <Button variant="ghost" nativeButton={false} render={<Link to="/explore" />}>
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
        <div className="rounded-3xl bg-surface p-4 flex items-center justify-between gap-3">
          <p className="flex min-h-11 items-center gap-2 text-sm">
            <History className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span>
              <span className="text-brand font-semibold">{dueCount}</span> para repasar
            </span>
          </p>
          <Button variant="outline" size="sm" nativeButton={false} render={<Link to="/review" />}>
            Repasar
          </Button>
        </div>
      )}

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <ToggleGroup aria-label="Vista" value={[libraryView]} onValueChange={(v) => v[0] && setLibraryView(v[0])}>
            <ToggleGroupItem value="learned">Practicadas</ToggleGroupItem>
            <ToggleGroupItem value="saved">Todas</ToggleGroupItem>
          </ToggleGroup>

          <InputGroup className="md:max-w-xs">
            <InputGroupInput
              aria-label="Buscar técnicas"
              placeholder="Buscar técnicas…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query ? (
              <InputGroupAddon align="inline-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Limpiar búsqueda"
                  onClick={() => setQuery("")}
                >
                  <X />
                </Button>
              </InputGroupAddon>
            ) : (
              <InputGroupAddon>
                <Search data-icon="inline-start" />
              </InputGroupAddon>
            )}
          </InputGroup>
        </div>

        {availablePositions.length >= 2 && (
          <ToggleGroup
            aria-label="Posición"
            variant="outline"
            value={[position]}
            onValueChange={(v) => setPosition(((v[0] as Position | "all") ?? "all"))}
            className="-mx-4 w-auto justify-start overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:flex-wrap md:px-0"
          >
            <ToggleGroupItem value="all">Todas</ToggleGroupItem>
            {availablePositions.map((p) => (
              <ToggleGroupItem key={p} value={p}>
                {POSITION_LABELS[p]}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        )}
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
        <div className="flex flex-col gap-5">
          <p className="text-sm text-muted-foreground" role="status">
            {filtered.length === 1 ? "1 técnica" : `${filtered.length} técnicas`}
          </p>
          {groups.map((g) => (
            <div key={g.position} className="flex flex-col gap-1">
              <h2 className="text-label text-muted-foreground">{POSITION_LABELS[g.position]}</h2>
              <div className="grid md:grid-cols-2">
                {g.items.map((t) => (
                  <Link
                    key={t.id}
                    to={`/techniques/${t.id}`}
                    className="flex min-h-12 items-center justify-between gap-3 rounded-2xl px-3 py-2 hover:bg-surface"
                  >
                    <span className="text-sm font-medium">{t.name}</span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {practicedIds.has(t.id!)
                          ? STAGE_LABELS[techniqueProgress(evidence.filter((e) => e.techniqueId === t.id))]
                          : "Guardada"}
                      </span>
                      {isDue(t) && (
                        <span className="size-2 rounded-full bg-brand" role="img" aria-label="Para repasar" />
                      )}
                    </span>
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
