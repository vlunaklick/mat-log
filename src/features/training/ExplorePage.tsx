import { useDeferredValue, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useCatalog, useTrainingActions } from "./queries";
import { useTechniques } from "@/lib/queries";
import { POSITIONS } from "@/lib/types";
import { PageHeader } from "@/components/app/page-header";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Blank, Loading, ErrorNotice } from "./shared";
export default function ExplorePage() {
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(params.get("q") ?? "");
  const q = useDeferredValue(query),
    style = params.get("style") ?? "all",
    position = params.get("position") ?? "all",
    offset = Math.max(0, Number(params.get("offset") ?? 0) || 0);
  const catalog = useCatalog(q, style, position, offset),
    techniques = useTechniques(),
    actions = useTrainingActions();
  const filter = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    next.set(key, value);
    next.delete("offset");
    setParams(next);
  };
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Explorar."
        lead="Un catálogo amplio. Tu biblioteca crece a tu ritmo."
        action={
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link to="/techniques" />}
          >
            Mi biblioteca
          </Button>
        }
      />
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="catalog-search">
            Técnica, posición o nombre que recordás
          </FieldLabel>
          <Input
            id="catalog-search"
            placeholder="Media guardia, kimura, arm drag…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              filter("q", e.target.value);
            }}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field>
            <FieldLabel htmlFor="catalog-style">Modalidad</FieldLabel>
            <select
              className="training-select"
              id="catalog-style"
              value={style}
              onChange={(e) => filter("style", e.target.value)}
            >
              <option value="all">Todas</option>
              <option value="gi">Gi</option>
              <option value="nogi">No-gi</option>
            </select>
          </Field>
          <Field>
            <FieldLabel htmlFor="catalog-position">Posición</FieldLabel>
            <select
              className="training-select"
              id="catalog-position"
              value={position}
              onChange={(e) => filter("position", e.target.value)}
            >
              <option value="all">Todas</option>
              {POSITIONS.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </Field>
        </div>
      </FieldGroup>
      <ErrorNotice
        error={catalog.error ?? techniques.error ?? actions.unlock.error}
      />
      {catalog.isPending ? (
        <Loading />
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {catalog.data?.total ?? 0} referencias · posiciones, transiciones y
            técnicas. La cobertura de gi es menor.
          </p>
          <div className="grid items-start gap-4 md:grid-cols-2">
            {catalog.data?.entries.map((e) => {
              const owned = techniques.data?.find(
                (t) => t.catalogId === e.id && !t.archived,
              );
              return (
                <Card key={e.id}>
                  <CardHeader>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">
                        {e.style === "both" ? "Gi y no-gi" : e.style}
                      </Badge>
                      <Badge variant="secondary">
                        {e.kind === "position"
                          ? "Posición"
                          : e.kind === "transition"
                            ? "Transición"
                            : "Técnica"}
                      </Badge>
                    </div>
                    <CardTitle>{e.name}</CardTitle>
                    <CardDescription>
                      {e.position} · {e.source}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-3">
                    <p className="whitespace-pre-wrap text-sm">
                      {e.description}
                    </p>
                    {e.aliases.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        También: {e.aliases.join(", ")}
                      </p>
                    )}
                    <a
                      className="text-sm underline"
                      href={e.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Ver fuente original
                    </a>
                    {e.references.length > 0 && (
                      <details>
                        <summary className="cursor-pointer text-sm">
                          Referencias del autor
                        </summary>
                        {e.references.map((r, i) => (
                          <p
                            key={i}
                            className="mt-2 break-words text-xs text-muted-foreground"
                          >
                            {r}
                          </p>
                        ))}
                      </details>
                    )}
                  </CardContent>
                  <CardFooter className="flex flex-wrap gap-2">
                    {owned ? (
                      <Button
                        variant="outline"
                        nativeButton={false}
                        render={<Link to={`/techniques/${owned.id}`} />}
                      >
                        En mi biblioteca
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        disabled={actions.unlock.isPending}
                        onClick={() => actions.unlock.mutate(e.id)}
                      >
                        Guardar para explorar
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      nativeButton={false}
                      render={
                        <Link
                          to={`/coach?prompt=${encodeURIComponent(`Quiero explorar ${e.name} (${e.position}), referencia ${e.id}. Buscala en el catálogo y ayudame a entender cómo encaja en mi juego, sin asumir que ya la aprendí.`)}`}
                        />
                      }
                    >
                      Consultar al coach
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
          {catalog.data?.total === 0 && (
            <Blank title="No encontramos esa referencia.">
              Probá otro nombre o describísela al coach. La biblioteca no cubre
              todas las variantes.
            </Blank>
          )}
          <div className="flex items-center justify-between gap-3">
            <Button
              variant="outline"
              disabled={!offset}
              onClick={() =>
                setParams({
                  ...Object.fromEntries(params),
                  offset: String(Math.max(0, offset - 24)),
                })
              }
            >
              Anterior
            </Button>
            <span className="text-sm">
              Página {Math.floor(offset / 24) + 1}
            </span>
            <Button
              variant="outline"
              disabled={offset + 24 >= (catalog.data?.total ?? 0)}
              onClick={() =>
                setParams({
                  ...Object.fromEntries(params),
                  offset: String(offset + 24),
                })
              }
            >
              Siguiente
            </Button>
          </div>
        </>
      )}
      <section className="flex flex-col gap-3">
        <h2 className="text-h2">Fuentes y lecturas.</h2>
        {catalog.data?.sources.map((s) => (
          <a
            href={s.url}
            target="_blank"
            rel="noreferrer"
            key={s.name}
            className="rounded-3xl bg-surface p-5"
          >
            <p className="text-title">{s.name} ↗</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {s.description}
            </p>
          </a>
        ))}
      </section>
    </div>
  );
}
