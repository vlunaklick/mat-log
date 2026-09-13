import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { db } from "@/lib/db";
import { newCardFields } from "@/lib/srs";
import { POSITIONS, TECHNIQUE_TYPES, type Position, type Technique, type TechniqueType } from "@/lib/types";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldGroup, FieldLabel, FieldDescription } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

  const technique = useLiveQuery(
    () => (techniqueId ? db.techniques.get(techniqueId) : undefined),
    [techniqueId],
  );

  if (techniqueId && technique === undefined) {
    return (
      <div className="flex flex-col gap-8">
        <PageHeader title="Technique." />
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (techniqueId && technique === null) {
    return (
      <div className="flex flex-col gap-8">
        <PageHeader title="Technique." />
        <p className="text-muted-foreground">Technique not found.</p>
      </div>
    );
  }

  return <TechniqueForm key={technique?.id ?? "new"} technique={technique ?? undefined} navigate={navigate} />;
}

function TechniqueForm({
  technique,
  navigate,
}: {
  technique?: Technique;
  navigate: ReturnType<typeof useNavigate>;
}) {
  const [name, setName] = useState(technique?.name ?? "");
  const [position, setPosition] = useState<Position>(technique?.position ?? POSITIONS[0]);
  const [type, setType] = useState<TechniqueType>(technique?.type ?? TECHNIQUE_TYPES[0]);
  const [steps, setSteps] = useState(technique?.steps ?? "");
  const [details, setDetails] = useState(technique?.details ?? "");
  const [mistakes, setMistakes] = useState(technique?.mistakes ?? "");
  const [videoUrl, setVideoUrl] = useState(technique?.videoUrl ?? "");

  async function handleSave() {
    if (!name.trim()) return;
    const now = Date.now();
    if (technique?.id) {
      await db.techniques.put({
        ...technique,
        name: name.trim(),
        position,
        type,
        steps,
        details,
        mistakes,
        videoUrl: videoUrl.trim() || undefined,
        updatedAt: now,
      });
      toast("Technique saved.");
      navigate(`/techniques/${technique.id}`);
    } else {
      const newId = await db.techniques.add({
        name: name.trim(),
        position,
        type,
        steps,
        details,
        mistakes,
        videoUrl: videoUrl.trim() || undefined,
        createdAt: now,
        updatedAt: now,
        ...newCardFields(),
      });
      toast("Technique saved.");
      navigate(`/techniques/${newId}`);
    }
  }

  async function handleDelete() {
    if (!technique?.id) return;
    await db.techniques.delete(technique.id);
    toast("Technique deleted.");
    navigate("/techniques");
  }

  return (
    <div className="mx-auto flex w-full max-w-[720px] flex-col gap-8">
      <PageHeader title={technique ? "Edit technique." : "New technique."} />

      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="name">Name</FieldLabel>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Armbar from mount" />
        </Field>

        <Field>
          <FieldLabel htmlFor="position">Position</FieldLabel>
          <Select value={position} onValueChange={(v) => setPosition(v as Position)}>
            <SelectTrigger id="position" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {POSITIONS.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field>
          <FieldLabel htmlFor="type">Type</FieldLabel>
          <Select value={type} onValueChange={(v) => setType(v as TechniqueType)}>
            <SelectTrigger id="type" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TECHNIQUE_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field>
          <FieldLabel htmlFor="steps">Steps</FieldLabel>
          <Textarea id="steps" value={steps} onChange={(e) => setSteps(e.target.value)} placeholder="1. ... 2. ..." />
        </Field>

        <Field>
          <FieldLabel htmlFor="details">Details</FieldLabel>
          <Textarea
            id="details"
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="the small things that make it work"
          />
          <FieldDescription>Shown on the back of the flashcard.</FieldDescription>
        </Field>

        <Field>
          <FieldLabel htmlFor="mistakes">Mistakes</FieldLabel>
          <Textarea id="mistakes" value={mistakes} onChange={(e) => setMistakes(e.target.value)} placeholder="common mistakes" />
        </Field>

        <Field>
          <FieldLabel htmlFor="video">Video URL</FieldLabel>
          <InputGroup>
            <InputGroupInput id="video" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://..." type="url" />
            <InputGroupAddon align="inline-end">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
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

      <div className="flex flex-col gap-2 md:flex-row-reverse">
        <Button onClick={handleSave} disabled={!name.trim()}>
          Save
        </Button>
        {technique?.id && (
          <AlertDialog>
            <AlertDialogTrigger render={<Button variant="destructive" />}>Delete</AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete "{technique.name}"?</AlertDialogTitle>
                <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
        <Button type="button" variant="ghost" onClick={() => navigate(-1)}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
