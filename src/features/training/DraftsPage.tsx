import { Link } from "react-router-dom";
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
        title="Borradores."
        lead="No hace falta acordarte de todo para guardar una clase."
        action={
          <Button nativeButton={false} render={<Link to="/coach?mode=log" />}>
            Contar una clase
          </Button>
        }
      />
      <ErrorNotice error={drafts.error} />
      {drafts.isPending ? (
        <Loading />
      ) : !drafts.data?.length ? (
        <Blank title="Tu próxima clase empieza con una nota.">
          Hablá o escribí al coach. Tu borrador quedará acá, incluso con
          preguntas pendientes.
        </Blank>
      ) : (
        drafts.data.map((d) => (
          <Card key={d.id}>
            <CardHeader>
              <Badge variant="outline">
                {d.status === "draft" ? "Pendiente" : "Confirmada"}
              </Badge>
              <CardTitle>
                {d.data.classTopic || "Clase por completar"}
              </CardTitle>
              <CardDescription>
                {d.data.date ?? "Fecha por completar"} ·{" "}
                {d.data.style ?? "Modalidad pendiente"} · {d.questions.length}{" "}
                preguntas
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Button
                variant="outline"
                nativeButton={false}
                render={<Link to={`/drafts/${d.id}`} />}
              >
                {d.status === "draft" ? "Retomar borrador" : "Ver registro"}
              </Button>
            </CardFooter>
          </Card>
        ))
      )}
    </div>
  );
}
