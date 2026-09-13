import { Link } from "react-router-dom";
import { formatDate } from "@/lib/date";
import { STYLE_LABELS } from "@/lib/labels";
import { useDrafts } from "./queries";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Blank, ErrorNotice, Loading } from "./shared";
export default function DraftsPage() {
  const drafts = useDrafts();
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
      ) : !drafts.data?.length ? (
        <Blank title="No tenés borradores">
          Cuando le cuentes una clase al coach, el borrador aparece acá hasta
          que lo confirmes.
        </Blank>
      ) : (
        drafts.data.map((d) => (
          <Card key={d.id}>
            <CardHeader>
              <Badge variant={d.status === "draft" ? "secondary" : "outline"}>
                {d.status === "draft" ? "Sin confirmar" : "Confirmada"}
              </Badge>
              <CardTitle>
                {d.data.classTopic || "Clase sin tema"}
              </CardTitle>
              <CardDescription>
                {[
                  d.data.date ? formatDate(d.data.date) : "Sin fecha",
                  d.data.style ? STYLE_LABELS[d.data.style] : "Sin modalidad",
                  d.status === "draft" && d.questions.length
                    ? `${d.questions.length} ${d.questions.length === 1 ? "pregunta" : "preguntas"}`
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Button
                variant={d.status === "draft" ? "outline" : "ghost"}
                nativeButton={false}
                render={<Link to={`/drafts/${d.id}`} />}
              >
                {d.status === "draft" ? "Revisar" : "Ver"}
              </Button>
            </CardFooter>
          </Card>
        ))
      )}
    </div>
  );
}
