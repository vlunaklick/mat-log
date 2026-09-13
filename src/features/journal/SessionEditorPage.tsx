import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { X } from "lucide-react";
import { toast } from "sonner";
import { useSessionMutations, useSessions, useTechniques } from "@/lib/queries";
import { todayISO } from "../../lib/date";
import { POSITIONS, type Position, type Roll, type RollOutcome, type Session, type Style } from "../../lib/types";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
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

const BELTS = ["white", "blue", "purple", "brown", "black"] as const;
const OUTCOMES: RollOutcome[] = ["dominated", "won", "even", "lost", "survived"];

function emptySession(): Session {
  return {
    date: todayISO(),
    style: "gi",
    durationMin: 60,
    classTopic: "",
    techniqueIds: [],
    rolls: [],
    whatWorked: "",
    whatFailed: "",
    nextFocus: "",
    energy: 3,
    createdAt: Date.now(),
  };
}

function emptyRoll(): Roll {
  return { partnerName: "", outcome: "even", notes: "" };
}

function SessionForm({ initial }: { initial: Session }) {
  const navigate = useNavigate();
  const { data: techniques } = useTechniques();
  const { create, update, remove } = useSessionMutations();

  const [date, setDate] = useState(initial.date);
  const [style, setStyle] = useState<Style>(initial.style);
  const [durationMin, setDurationMin] = useState(initial.durationMin);
  const [energy, setEnergy] = useState<1 | 2 | 3 | 4 | 5>(initial.energy);
  const [classTopic, setClassTopic] = useState(initial.classTopic);
  const [techniqueIds, setTechniqueIds] = useState<number[]>(initial.techniqueIds);
  const [rolls, setRolls] = useState<Roll[]>(initial.rolls);
  const [whatWorked, setWhatWorked] = useState(initial.whatWorked);
  const [whatFailed, setWhatFailed] = useState(initial.whatFailed);
  const [nextFocus, setNextFocus] = useState(initial.nextFocus);

  const isEditing = initial.id !== undefined;
  const saving = create.isPending || update.isPending;
  const saveError = create.error ?? update.error;

  function updateRoll(index: number, patch: Partial<Roll>) {
    setRolls((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  function removeRoll(index: number) {
    setRolls((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    const payload = {
      date,
      style,
      durationMin,
      energy,
      classTopic,
      techniqueIds,
      rolls,
      whatWorked,
      whatFailed,
      nextFocus,
    };
    try {
      if (isEditing && initial.id !== undefined) {
        await update.mutateAsync({ id: initial.id, ...payload });
        toast("Session updated.");
      } else {
        await create.mutateAsync(payload);
        toast("Session logged.");
      }
      navigate("/");
    } catch {
      // error surfaced via saveError below
    }
  }

  async function handleDelete() {
    if (!isEditing || initial.id === undefined) return;
    await remove.mutateAsync(initial.id);
    toast("Session deleted.");
    navigate("/");
  }

  return (
    <div className="mx-auto flex w-full max-w-[720px] flex-col gap-6">
      <PageHeader title={isEditing ? "Edit session." : "Log today's class."} lead="One line per class. Be honest." />

      {saveError && (
        <Alert variant="destructive">
          <AlertDescription>{saveError instanceof Error ? saveError.message : "Could not save session."}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardContent>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="date">Date</FieldLabel>
              <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>

            <Field>
              <FieldLabel>Style</FieldLabel>
              <ToggleGroup value={[style]} onValueChange={(v) => v[0] && setStyle(v[0] as Style)}>
                <ToggleGroupItem value="gi">GI</ToggleGroupItem>
                <ToggleGroupItem value="nogi">NO-GI</ToggleGroupItem>
              </ToggleGroup>
            </Field>

            <Field>
              <FieldLabel htmlFor="duration">Duration (min)</FieldLabel>
              <Input
                id="duration"
                type="number"
                min={0}
                value={durationMin}
                onChange={(e) => setDurationMin(Number(e.target.value))}
              />
            </Field>

            <Field>
              <FieldLabel>Energy</FieldLabel>
              <ToggleGroup value={[String(energy)]} onValueChange={(v) => v[0] && setEnergy(Number(v[0]) as 1 | 2 | 3 | 4 | 5)}>
                {([1, 2, 3, 4, 5] as const).map((n) => (
                  <ToggleGroupItem key={n} value={String(n)}>
                    {n}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </Field>

            <Field>
              <FieldLabel htmlFor="classTopic">Class topic</FieldLabel>
              <Input id="classTopic" value={classTopic} onChange={(e) => setClassTopic(e.target.value)} placeholder="What did class cover?" />
            </Field>

            {techniques && techniques.length > 0 && (
              <Field>
                <FieldLabel>Techniques drilled</FieldLabel>
                <ToggleGroup multiple variant="outline" value={techniqueIds.map(String)} onValueChange={(v) => setTechniqueIds(v.map(Number))} className="flex-wrap justify-start">
                  {techniques.map((t) => (
                    <ToggleGroupItem key={t.id} value={String(t.id)} disabled={t.id === undefined}>
                      {t.name}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </Field>
            )}
          </FieldGroup>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <FieldLabel>Rolls</FieldLabel>
            <Button variant="secondary" size="sm" type="button" onClick={() => setRolls((prev) => [...prev, emptyRoll()])}>
              Add roll
            </Button>
          </div>

          {rolls.length === 0 && <FieldDescription>No rolls logged yet.</FieldDescription>}

          {rolls.map((roll, i) => (
            <Card key={i} size="sm" className="bg-surface ring-0">
              <CardContent className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">Roll {i + 1}</span>
                  <Button variant="ghost" size="sm" type="button" onClick={() => removeRoll(i)}>
                    <X data-icon="inline-start" />
                    Remove
                  </Button>
                </div>
                <Input
                  placeholder="Partner name"
                  value={roll.partnerName ?? ""}
                  onChange={(e) => updateRoll(i, { partnerName: e.target.value })}
                />
                <Select
                  value={roll.partnerBelt ?? ""}
                  onValueChange={(v) => updateRoll(i, { partnerBelt: ((v as string) || undefined) as Roll["partnerBelt"] })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Partner belt...</SelectItem>
                    {BELTS.map((b) => (
                      <SelectItem key={b} value={b}>
                        {b}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={roll.outcome} onValueChange={(v) => updateRoll(i, { outcome: v as RollOutcome })}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OUTCOMES.map((o) => (
                      <SelectItem key={o} value={o}>
                        {o}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={roll.stuckIn ?? ""}
                  onValueChange={(v) => updateRoll(i, { stuckIn: ((v as string) || undefined) as Position | undefined })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Stuck in...</SelectItem>
                    {POSITIONS.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Textarea
                  placeholder="Notes"
                  value={roll.notes ?? ""}
                  onChange={(e) => updateRoll(i, { notes: e.target.value })}
                />
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <FieldGroup>
            <div className="flex flex-col gap-5 md:flex-row">
              <Field className="md:flex-1">
                <FieldLabel htmlFor="whatWorked">What worked</FieldLabel>
                <Textarea id="whatWorked" value={whatWorked} onChange={(e) => setWhatWorked(e.target.value)} />
              </Field>
              <Field className="md:flex-1">
                <FieldLabel htmlFor="whatFailed">What failed</FieldLabel>
                <Textarea id="whatFailed" value={whatFailed} onChange={(e) => setWhatFailed(e.target.value)} />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="nextFocus">Next focus</FieldLabel>
              <Textarea id="nextFocus" value={nextFocus} onChange={(e) => setNextFocus(e.target.value)} />
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-2">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
        {isEditing && (
          <AlertDialog>
            <AlertDialogTrigger render={<Button variant="destructive" type="button" />}>Delete</AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this session?</AlertDialogTitle>
                <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction render={<Button variant="destructive" />} onClick={handleDelete}>
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
        <Button variant="ghost" onClick={() => navigate("/")}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

export default function SessionEditorPage() {
  const params = useParams<{ id?: string }>();
  const id = params.id ? Number(params.id) : undefined;
  const { data: sessions, isPending } = useSessions();

  if (id !== undefined && isPending) {
    return (
      <div className="mx-auto flex w-full max-w-[720px] flex-col gap-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 rounded-3xl" />
        <Skeleton className="h-40 rounded-3xl" />
      </div>
    );
  }

  const found = id !== undefined ? sessions?.find((s) => s.id === id) : undefined;

  if (id !== undefined && !found) {
    return (
      <div className="mx-auto flex w-full max-w-[720px] flex-col gap-6">
        <PageHeader title="Session." />
        <p className="text-muted-foreground">Session not found.</p>
      </div>
    );
  }

  const initial = found ?? emptySession();

  return <SessionForm key={initial.id ?? "new"} initial={initial} />;
}
