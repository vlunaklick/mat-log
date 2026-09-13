import { useDeferredValue, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Search } from "lucide-react";
import { useCatalog, useTrainingActions } from "./queries";
import { useTechniques } from "@/lib/queries";
import { toast } from "sonner";
import { POSITIONS } from "@/lib/types";
import { POSITION_LABELS, STYLE_LABELS, label } from "@/lib/labels";
import { PageHeader } from "@/components/app/page-header";
import { Disclosure } from "@/components/app/disclosure";
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Field, FieldLabel } from "@/components/ui/field";
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
  const total = catalog.data?.total ?? 0;
  const filter = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    next.set(key, value);
    next.delete("offset");
    setParams(next);
  };
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Explorar"
        lead={
          catalog.data
            ? `${total} ${total === 1 ? "referencia" : "referencias"}`
            : undefined
        }
        back={{ to: "/techniques", label: "Técnicas" }}
      />
      <div className="flex flex-col gap-3">
        <InputGroup>
          <InputGroupInput
            aria-label="Buscar en el catálogo"
            placeholder="Media guardia, kimura, arm drag…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              filter("q", e.target.value);
            }}
          />
          <InputGroupAddon>
            <Search data-icon="inline-start" />
          </InputGroupAddon>
        </InputGroup>
        <div className="grid grid-cols-2 gap-3">
          <Field>
            <FieldLabel htmlFor="catalog-style" className="sr-only">
              Modalidad
            </FieldLabel>
            <select
              className="training-select"
              id="catalog-style"
              value={style}
              onChange={(e) => filter("style", e.target.value)}
            >
              <option value="all">Todas las modalidades</option>
              <option value="gi">Gi</option>
              <option value="nogi">No-gi</option>
            </select>
          </Field>
          <Field>
            <FieldLabel htmlFor="catalog-position" className="sr-only">
              Posición
            </FieldLabel>
            <select
              className="training-select"
              id="catalog-position"
              value={position}
              onChange={(e) => filter("position", e.target.value)}
            >
              <option value="all">Todas las posiciones</option>
              {POSITIONS.map((p) => (
                <option key={p} value={p}>
                  {POSITION_LABELS[p]}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </div>
      <ErrorNotice
        error={catalog.error ?? techniques.error ?? actions.unlock.error}
      />
      {catalog.isPending ? (
        <Loading />
      ) : catalog.isError ? null : total === 0 ? (
        <Blank
          title="No encontramos esa referencia"
          action={
            query.trim() && (
              <Button
                variant="outline"
                nativeButton={false}
                render={
                  <Link
                    to={`/coach?prompt=${encodeURIComponent(`Busco una técnica que no encuentro en el catálogo: ${query}`)}`}
                  />
                }
              >
                Consultar al coach
              </Button>
            )
          }
        >
          Probá con otro nombre o describísela al coach.
        </Blank>
      ) : (
        <>
          <div className="flex flex-col divide-y divide-border-soft">
            {catalog.data?.entries.map((e) => {
              const owned = techniques.data?.find(
                (t) => t.catalogId === e.id && !t.archived,
              );
              const kindLabel =
                e.kind === "position"
                  ? "Posición"
                  : e.kind === "transition"
                    ? "Transición"
                    : "Técnica";
              const styleLabel =
                e.style === "both" ? "Gi y no-gi" : label(STYLE_LABELS, e.style);
              return (
                <div key={e.id} className="flex flex-col gap-2 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-col gap-1">
                      <span className="font-medium">{e.name}</span>
                      <span className="text-sm text-muted-foreground">
                        {kindLabel} · {label(POSITION_LABELS, e.position)} · {styleLabel}
                      </span>
                    </div>
                    {owned ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        nativeButton={false}
                        render={<Link to={`/techniques/${owned.id}`} />}
                      >
                        En tu biblioteca
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={actions.unlock.isPending}
                        onClick={() =>
                          actions.unlock.mutate(e.id, {
                            onSuccess: () => toast("Guardada en tu biblioteca"),
                          })
                        }
                      >
                        Guardar
                      </Button>
                    )}
                  </div>
                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {e.description}
                  </p>
                  <Disclosure summary="Más">
                    <div className="flex flex-col gap-3">
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
                      <Button
                        variant="ghost"
                        className="w-fit"
                        nativeButton={false}
                        render={
                          <Link
                            to={`/coach?prompt=${encodeURIComponent(`Quiero explorar ${e.name} (${label(POSITION_LABELS, e.position)}), referencia ${e.id}. Buscala en el catálogo y ayudame a entender cómo encaja en mi juego, sin asumir que ya la aprendí.`)}`}
                          />
                        }
                      >
                        Consultar al coach
                      </Button>
                    </div>
                  </Disclosure>
                </div>
              );
            })}
          </div>
          {total > 24 && (
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
              <span className="text-sm text-muted-foreground">
                Página {Math.floor(offset / 24) + 1} de {Math.ceil(total / 24)}
              </span>
              <Button
                variant="outline"
                disabled={offset + 24 >= total}
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
          )}
        </>
      )}
      {catalog.data?.sources.length ? (
        <Disclosure summary="Fuentes del catálogo" className="rounded-3xl bg-surface p-5">
          <ul className="flex flex-col gap-3">
            {catalog.data.sources.map((s) => (
              <li key={s.name} className="text-sm">
                <a
                  href={s.url}
                  target="_blank"
                  rel="noreferrer"
                  className="underline"
                >
                  {s.name} ↗
                </a>
                <p className="text-muted-foreground">{s.description}</p>
              </li>
            ))}
          </ul>
        </Disclosure>
      ) : null}
    </div>
  );
}
