import { EvidenceEditor } from "../training/EvidenceEditor";
import { Blank } from "../training/shared";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { X } from "lucide-react";
import { toast } from "sonner";
import { useSessionMutations, useSessions, useTechniques } from "@/lib/queries";
import { todayISO } from "../../lib/date";
import { BELT_LABELS, OUTCOME_LABELS, POSITION_LABELS, label } from "../../lib/labels";
import { POSITIONS, type Position, type Roll, type RollOutcome, type Session, type Style } from "../../lib/types";
import { PageHeader } from "@/components/app/page-header";
import { Disclosure } from "@/components/app/disclosure";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
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
const BELT_ITEMS = { "": "Sin especificar", ...BELT_LABELS };
const STUCK_ITEMS = { "": "Ninguna", ...POSITION_LABELS };
const OUTCOMES: RollOutcome[] = ["dominated", "won", "even", "lost", "survived", "unknown"];

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

  const [evidence, setEvidence] = useState(initial.evidence ?? []);
  const [goalNotes, setGoalNotes] = useState(initial.goalNotes ?? "");
  const [date, setDate] = useState(initial.date);
  const [style, setStyle] = useState<Style | null>(initial.style);
  const [durationMin, setDurationMin] = useState(initial.durationMin);
  const [energy, setEnergy] = useState<1 | 2 | 3 | 4 | 5 | null>(initial.energy);
  const [classTopic, setClassTopic] = useState(initial.classTopic);
  const [techniqueIds, setTechniqueIds] = useState<number[]>(initial.techniqueIds);
  const [rolls, setRolls] = useState<Roll[]>(initial.rolls);
  const [whatWorked, setWhatWorked] = useState(initial.whatWorked);
  const [whatFailed, setWhatFailed] = useState(initial.whatFailed);
  const [nextFocus, setNextFocus] = useState(initial.nextFocus);
  const [techniqueQuery, setTechniqueQuery] = useState("");
  const [openRollIndex, setOpenRollIndex] = useState<number | null>(null);

  const isEditing = initial.id !== undefined;
  const saving = create.isPending || update.isPending;
  const saveError = create.error ?? update.error;

  const selectedTechniques = techniqueIds
    .map((id) => techniques?.find((t) => t.id === id))
    .filter((t): t is NonNullable<typeof t> => Boolean(t));
  const techniqueMatches = (() => {
    const q = techniqueQuery.trim().toLowerCase();
    if (!q) return [];
    return (techniques ?? [])
      .filter((t) => t.id !== undefined && !techniqueIds.includes(t.id) && t.name.toLowerCase().includes(q))
      .slice(0, 8);
  })();

  function updateRoll(index: number, patch: Partial<Roll>) {
    setRolls((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  function addRoll() {
    setOpenRollIndex(rolls.length);
    setRolls((prev) => [...prev, emptyRoll()]);
  }

  function removeRoll(index: number) {
    setRolls((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    const payload = {
      date,
      style,
      evidence: evidence.filter(e => techniqueIds.includes(e.techniqueId)),
      goalNotes,
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
        toast("Clase actualizada");
      } else {
        await create.mutateAsync(payload);
        toast("Clase registrada");
      }
      navigate("/journal");
    } catch {
      // error surfaced via saveError below
    }
  }

  async function handleDelete() {
    if (!isEditing || initial.id === undefined) return;
    await remove.mutateAsync(initial.id);
    toast("Clase eliminada");
    navigate("/journal");
  }

  return (
    <div className="mx-auto flex w-full max-w-[720px] flex-col gap-8">
      <PageHeader title={isEditing ? "Editar clase" : "Registrar clase"} back={{ to: "/journal", label: "Diario" }} />

      <FieldGroup>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="date">Fecha</FieldLabel>
            <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field>
            <FieldLabel htmlFor="duration">Duración (min)</FieldLabel>
            <Input
              id="duration"
              type="number"
              min={0}
              value={durationMin ?? ""}
              onChange={(e) => setDurationMin(e.target.value === "" ? null : Number(e.target.value))}
            />
          </Field>
        </div>

        <div className="flex flex-col gap-5 sm:flex-row">
          <Field>
            <FieldLabel>Modalidad</FieldLabel>
            <ToggleGroup value={style ? [style] : []} onValueChange={(v) => v[0] && setStyle(v[0] as Style)}>
              <ToggleGroupItem value="gi">Gi</ToggleGroupItem>
              <ToggleGroupItem value="nogi">No-gi</ToggleGroupItem>
            </ToggleGroup>
          </Field>

          <Field>
            <FieldLabel>Energía</FieldLabel>
            <ToggleGroup value={energy === null ? [] : [String(energy)]} onValueChange={(v) => v[0] && setEnergy(Number(v[0]) as 1 | 2 | 3 | 4 | 5)}>
              {([1, 2, 3, 4, 5] as const).map((n) => (
                <ToggleGroupItem key={n} value={String(n)}>
                  {n}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </Field>
        </div>

        <Field>
          <FieldLabel htmlFor="classTopic">Tema de la clase</FieldLabel>
          <Input id="classTopic" value={classTopic} onChange={(e) => setClassTopic(e.target.value)} placeholder="Ej: pasajes desde media guardia" />
        </Field>
      </FieldGroup>

      <div className="flex flex-col gap-4">
        <h2 className="text-title">Técnicas</h2>
        {selectedTechniques.length > 0 && (
          <ToggleGroup
            multiple
            variant="outline"
            value={techniqueIds.map(String)}
            onValueChange={(v) => setTechniqueIds(v.map(Number))}
            className="flex-wrap justify-start"
          >
            {selectedTechniques.map((t) => (
              <ToggleGroupItem key={t.id} value={String(t.id)}>
                {t.name}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        )}
        <Input
          value={techniqueQuery}
          onChange={(e) => setTechniqueQuery(e.target.value)}
          placeholder="Buscar técnica para agregar…"
          aria-label="Buscar técnica para agregar"
        />
        {techniqueMatches.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {techniqueMatches.map((t) => (
              <Button
                key={t.id}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  if (t.id === undefined) return;
                  setTechniqueIds((prev) => [...prev, t.id as number]);
                  setTechniqueQuery("");
                }}
              >
                {t.name}
              </Button>
            ))}
          </div>
        )}
        {techniqueQuery.trim() && techniqueMatches.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Sin coincidencias. Creá la técnica desde Técnicas y volvé.
          </p>
        )}
      </div>

      <EvidenceEditor value={evidence.filter(e => techniqueIds.includes(e.techniqueId))} onChange={setEvidence} techniques={techniques ?? []} />

      <div className="flex flex-col gap-4">
        <h2 className="text-title">Rolls</h2>

        {rolls.length === 0 && <p className="text-muted-foreground">Sin rolls.</p>}

        {rolls.map((roll, i) => (
          <Disclosure
            key={i}
            className="rounded-2xl bg-surface px-4 py-0.5 open:pb-4"
            defaultOpen={openRollIndex === i}
            summary={`Roll ${i + 1} · ${roll.partnerName || "Sin nombre"} · ${label(OUTCOME_LABELS, roll.outcome)}`}
          >
            <div className="flex flex-col gap-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor={`roll-partner-${i}`}>Compañero</FieldLabel>
                  <Input
                    id={`roll-partner-${i}`}
                    value={roll.partnerName ?? ""}
                    onChange={(e) => updateRoll(i, { partnerName: e.target.value })}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor={`roll-belt-${i}`}>Cinturón</FieldLabel>
                  <Select
                    items={BELT_ITEMS}
                    value={roll.partnerBelt ?? ""}
                    onValueChange={(v) => updateRoll(i, { partnerBelt: ((v as string) || undefined) as Roll["partnerBelt"] })}
                  >
                    <SelectTrigger id={`roll-belt-${i}`} className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">{BELT_ITEMS[""]}</SelectItem>
                      {BELTS.map((b) => (
                        <SelectItem key={b} value={b}>
                          {BELT_LABELS[b]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel htmlFor={`roll-outcome-${i}`}>Resultado</FieldLabel>
                  <Select items={OUTCOME_LABELS} value={roll.outcome} onValueChange={(v) => updateRoll(i, { outcome: v as RollOutcome })}>
                    <SelectTrigger id={`roll-outcome-${i}`} className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {OUTCOMES.map((o) => (
                        <SelectItem key={o} value={o}>
                          {OUTCOME_LABELS[o]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel htmlFor={`roll-stuck-${i}`}>Dónde te costó</FieldLabel>
                  <Select
                    items={STUCK_ITEMS}
                    value={roll.stuckIn ?? ""}
                    onValueChange={(v) => updateRoll(i, { stuckIn: ((v as string) || undefined) as Position | undefined })}
                  >
                    <SelectTrigger id={`roll-stuck-${i}`} className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">{STUCK_ITEMS[""]}</SelectItem>
                      {POSITIONS.map((p) => (
                        <SelectItem key={p} value={p}>
                          {POSITION_LABELS[p]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <Field>
                <FieldLabel htmlFor={`roll-notes-${i}`}>Notas</FieldLabel>
                <Textarea
                  id={`roll-notes-${i}`}
                  value={roll.notes ?? ""}
                  onChange={(e) => updateRoll(i, { notes: e.target.value })}
                />
              </Field>
              <Button variant="ghost" size="sm" className="self-start" type="button" onClick={() => removeRoll(i)}>
                <X data-icon="inline-start" />
                Quitar roll
              </Button>
            </div>
          </Disclosure>
        ))}

        <Button variant="outline" size="sm" type="button" className="self-start" onClick={addRoll}>
          Agregar roll
        </Button>
      </div>

      <div className="flex flex-col gap-4">
        <h2 className="text-title">Reflexión</h2>
        <FieldGroup>
          <div className="flex flex-col gap-5 md:flex-row">
            <Field className="md:flex-1">
              <FieldLabel htmlFor="whatWorked">Qué funcionó</FieldLabel>
              <Textarea id="whatWorked" value={whatWorked} onChange={(e) => setWhatWorked(e.target.value)} />
            </Field>
            <Field className="md:flex-1">
              <FieldLabel htmlFor="whatFailed">Qué te costó</FieldLabel>
              <Textarea id="whatFailed" value={whatFailed} onChange={(e) => setWhatFailed(e.target.value)} />
            </Field>
          </div>
          <Field>
            <FieldLabel htmlFor="nextFocus">Foco para la próxima clase</FieldLabel>
            <Textarea id="nextFocus" value={nextFocus} onChange={(e) => setNextFocus(e.target.value)} />
          </Field>
          <Disclosure summary="Objetivo" defaultOpen={Boolean(goalNotes)}>
            <Field>
              <FieldLabel htmlFor="goal-notes">Qué pasó con tu objetivo</FieldLabel>
              <Textarea id="goal-notes" value={goalNotes} onChange={(e) => setGoalNotes(e.target.value)} />
            </Field>
          </Disclosure>
        </FieldGroup>
      </div>

      {saveError && (
        <Alert variant="destructive">
          <AlertDescription>{saveError instanceof Error ? saveError.message : "No se pudo guardar la clase."}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-wrap gap-2">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Guardando…" : isEditing ? "Guardar cambios" : "Guardar clase"}
        </Button>
        <Button variant="ghost" onClick={() => navigate("/journal")}>
          Cancelar
        </Button>
      </div>

      {isEditing && (
        <AlertDialog>
          <AlertDialogTrigger render={<Button variant="destructive" type="button" className="mt-6 self-start" />}>Eliminar clase</AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar esta clase?</AlertDialogTitle>
              <AlertDialogDescription>No se puede deshacer.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction render={<Button variant="destructive" />} onClick={handleDelete}>
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
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
        <PageHeader title="Clase" back={{ to: "/journal", label: "Diario" }} />
        <Blank
          title="No encontramos esta clase"
          action={
            <Button variant="outline" nativeButton={false} render={<Link to="/journal" />}>
              Volver al diario
            </Button>
          }
        />
      </div>
    );
  }

  const initial = found ?? emptySession();

  return <SessionForm key={initial.id ?? "new"} initial={initial} />;
}
