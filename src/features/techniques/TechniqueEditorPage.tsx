import { TechniqueJourney } from "../training/TechniqueJourney";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useTechniqueMutations, useTechniques } from "@/lib/queries";
import { POSITIONS, TECHNIQUE_TYPES, type Position, type Technique, type TechniqueType } from "@/lib/types";
import { PageHeader } from "@/components/app/page-header";
import { Disclosure } from "@/components/app/disclosure";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { POSITION_LABELS, TECHNIQUE_TYPE_LABELS } from "@/lib/labels";
import { Blank } from "@/features/training/shared";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function TechniqueEditorPage() {
  const { id } = useParams();
  const techniqueId = id ? Number(id) : undefined;
  const navigate = useNavigate();

  const { data: techniques, isPending } = useTechniques();

  if (techniqueId && isPending) {
    return (
      <div className="mx-auto flex w-full max-w-[720px] flex-col gap-8">
        <PageHeader title="Editar técnica" back={{ to: "/techniques", label: "Técnicas" }} />
        <Skeleton className="h-96 rounded-3xl" />
      </div>
    );
  }

  const technique = techniqueId ? techniques?.find((t) => t.id === techniqueId) : undefined;

  if (techniqueId && !technique) {
    return (
      <div className="mx-auto flex w-full max-w-[720px] flex-col gap-8">
        <PageHeader title="Técnica" back={{ to: "/techniques", label: "Técnicas" }} />
        <Blank
          title="No encontramos esta técnica"
          action={
            <Button variant="outline" nativeButton={false} render={<Link to="/techniques" />}>
              Volver a técnicas
            </Button>
          }
        />
      </div>
    );
  }

  return <TechniqueForm key={technique?.id ?? "new"} technique={technique} navigate={navigate} />;
}

function TechniqueForm({
  technique,
  navigate,
}: {
  technique?: Technique;
  navigate: ReturnType<typeof useNavigate>;
}) {
  const { create, update, remove } = useTechniqueMutations();

  const [name, setName] = useState(technique?.name ?? "");
  const [position, setPosition] = useState<Position>(technique?.position ?? POSITIONS[0]);
  const [type, setType] = useState<TechniqueType>(technique?.type ?? TECHNIQUE_TYPES[0]);
  const [steps, setSteps] = useState(technique?.steps ?? "");
  const [details, setDetails] = useState(technique?.details ?? "");
  const [mistakes, setMistakes] = useState(technique?.mistakes ?? "");
  const [videoUrl, setVideoUrl] = useState(technique?.videoUrl ?? "");

  const saving = create.isPending || update.isPending;
  const saveError = create.error ?? update.error;

  async function handleSave() {
    if (!name.trim()) return;
    const payload = {
      name: name.trim(),
      position,
      type,
      steps,
      details,
      mistakes,
      videoUrl: videoUrl.trim() || undefined,
    };
    try {
      if (technique?.id) {
        const saved = await update.mutateAsync({ id: technique.id, ...payload });
        toast("Técnica guardada");
        navigate(`/techniques/${saved.id}`);
      } else {
        const saved = await create.mutateAsync(payload);
        toast("Técnica guardada");
        navigate(`/techniques/${saved.id}`);
      }
    } catch {
      // error surfaced via saveError below
    }
  }

  async function handleDelete() {
    if (!technique?.id) return;
    await remove.mutateAsync(technique.id);
    toast("Técnica eliminada");
    navigate("/techniques");
  }

  return (
    <div className="mx-auto flex w-full max-w-[720px] flex-col gap-8">
      <PageHeader title={technique ? "Editar técnica" : "Nueva técnica"} back={{ to: "/techniques", label: "Técnicas" }} />
      {technique?.id && <TechniqueJourney id={technique.id} />}

      {saveError && (
        <Alert variant="destructive">
          <AlertDescription>{saveError instanceof Error ? saveError.message : "No se pudo guardar la técnica."}</AlertDescription>
        </Alert>
      )}

      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="name">Nombre</FieldLabel>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: kimura desde media guardia" />
        </Field>

        <div className="grid gap-5 md:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="position">Posición</FieldLabel>
            <Select items={POSITION_LABELS} value={position} onValueChange={(v) => setPosition(v as Position)}>
              <SelectTrigger id="position" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {POSITIONS.map((p) => (
                  <SelectItem key={p} value={p}>
                    {POSITION_LABELS[p]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field>
            <FieldLabel htmlFor="type">Tipo</FieldLabel>
            <Select items={TECHNIQUE_TYPE_LABELS} value={type} onValueChange={(v) => setType(v as TechniqueType)}>
              <SelectTrigger id="type" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TECHNIQUE_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {TECHNIQUE_TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>

        <Field>
          <FieldLabel htmlFor="steps">Pasos</FieldLabel>
          <Textarea id="steps" value={steps} onChange={(e) => setSteps(e.target.value)} placeholder="1. ... 2. ..." />
        </Field>

        <Field>
          <FieldLabel htmlFor="details">Detalles</FieldLabel>
          <Textarea
            id="details"
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="Lo que hace que funcione"
          />
        </Field>

        <Disclosure summary="Más campos" defaultOpen={Boolean(mistakes || videoUrl)}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="mistakes">Errores comunes</FieldLabel>
              <Textarea id="mistakes" value={mistakes} onChange={(e) => setMistakes(e.target.value)} />
            </Field>

            <Field>
              <FieldLabel htmlFor="video">Video</FieldLabel>
              <InputGroup>
                <InputGroupInput id="video" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://..." type="url" />
                <InputGroupAddon align="inline-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Abrir video"
                    disabled={!videoUrl.trim()}
                    nativeButton={false}
                    render={<a href={videoUrl.trim() || undefined} target="_blank" rel="noreferrer" />}
                  >
                    <ExternalLink />
                  </Button>
                </InputGroupAddon>
              </InputGroup>
            </Field>
          </FieldGroup>
        </Disclosure>
      </FieldGroup>

      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        <Button onClick={handleSave} disabled={!name.trim() || saving}>
          {saving ? "Guardando…" : "Guardar"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => navigate(-1)}>
          Cancelar
        </Button>
        {technique?.id && (
          <AlertDialog>
            <AlertDialogTrigger render={<Button variant="destructive" className="mt-6 md:mt-0 md:ml-auto" />}>
              Eliminar
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Eliminar «{technique.name}»?</AlertDialogTitle>
                <AlertDialogDescription>No se puede deshacer.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>Eliminar</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  );
}
