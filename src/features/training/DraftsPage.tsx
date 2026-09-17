import { Link } from "react-router-dom";
import { formatDate } from "@/lib/date";
import { STYLE_LABELS } from "@/lib/labels";
import { useDrafts } from "./queries";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Blank, ErrorNotice, Loading } from "./shared";
export default function DraftsPage() {
  const drafts = useDrafts();
  const sorted = drafts.data
    ? [...drafts.data].sort((a, b) =>
        a.status === b.status ? 0 : a.status === "draft" ? -1 : 1,
      )
    : undefined;
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Borradores"
        back={{ to: "/journal", label: "Diario" }}
        action={
          <Button nativeButton={false} render={<Link to="/coach?mode=log" />}>
            Contar mi clase
          </Button>
        }
      />
      <ErrorNotice error={drafts.error} />
      {drafts.isPending ? (
        <Loading />
      ) : !sorted?.length ? (
        <Blank
          title="No tenés borradores"
          action={
            <Button nativeButton={false} render={<Link to="/coach?mode=log" />}>
              Contar mi clase
            </Button>
          }
        >
          Aparecen acá cuando le contás una clase al coach.
        </Blank>
      ) : (
        <div className="flex flex-col">
          {sorted.map((d) => (
            <Link
              key={d.id}
              to={`/drafts/${d.id}`}
              className="flex items-center justify-between gap-3 rounded-2xl px-3 py-3 hover:bg-surface"
            >
              <div className="flex min-w-0 flex-col gap-1">
                <span className="font-medium">
                  {d.data.classTopic || "Clase sin tema"}
                </span>
                <span className="text-sm text-muted-foreground">
                  {[
                    d.data.date ? formatDate(d.data.date) : "Sin fecha",
                    d.data.style ? STYLE_LABELS[d.data.style] : "Sin modalidad",
                    d.status === "draft" && d.questions.length
                      ? `${d.questions.length} ${d.questions.length === 1 ? "pregunta" : "preguntas"}`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </div>
              {d.status === "draft" ? (
                <Badge variant="secondary" className="shrink-0">
                  Sin confirmar
                </Badge>
              ) : (
                <span className="shrink-0 text-sm text-muted-foreground">
                  Confirmada
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
