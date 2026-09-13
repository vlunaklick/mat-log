import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import type { Draft, DraftData } from "@/lib/training";
import { STAGE_LABELS } from "@/lib/training";
import { POSITIONS, TECHNIQUE_TYPES } from "@/lib/types";
import {
  OUTCOME_LABELS,
  POSITION_LABELS,
  TECHNIQUE_TYPE_LABELS,
  label,
} from "@/lib/labels";
import { useDraft, useTrainingActions } from "./queries";
import { PageHeader } from "@/components/app/page-header";
import { Disclosure } from "@/components/app/disclosure";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ErrorNotice, Loading } from "./shared";
import { ConfirmDelete } from "./confirm-delete";
const numberOrNull = (s: string) => (s === "" ? null : Number(s));
export default function DraftPage() {
  const { id = "" } = useParams();
  const draft = useDraft(id);
  if (draft.isPending) return <Loading />;
  if (!draft.data) return <ErrorNotice error={draft.error} />;
  return (
    <DraftEditor key={`${id}-${draft.data.revision}`} initial={draft.data} />
  );
}
function DraftEditor({ initial }: { initial: Draft }) {
  const [draft, setDraft] = useState(initial);
  const [error, setError] = useState<unknown>();
  const [openTechIndex, setOpenTechIndex] = useState<number | null>(null);
  const actions = useTrainingActions();
  const navigate = useNavigate();
  const busy = actions.saveDraft.isPending || actions.confirm.isPending;
  const patch = (p: Partial<DraftData>) =>
    setDraft((d) => ({ ...d, data: { ...d.data, ...p } }));
  const patchTechnique = (
    i: number,
    p: Partial<DraftData["techniques"][number]>,
  ) =>
    patch({
      techniques: draft.data.techniques.map((t, j) =>
        j === i ? { ...t, ...p } : t,
      ),
    });
  async function save(confirm = false) {
    setError(null);
    try {
      const saved = await actions.saveDraft.mutateAsync(draft);
      if (confirm) {
        const confirmed = await actions.confirm.mutateAsync(saved);
        toast("Clase confirmada");
        navigate(`/session/${confirmed.sessionId}`);
      } else {
        toast("Borrador guardado");
      }
    } catch (e) {
      setError(e);
    }
  }
  async function goToCoach() {
    try {
      await actions.saveDraft.mutateAsync(draft);
      navigate(
        `/coach${draft.conversationId ? `/${draft.conversationId}` : ""}?draft=${draft.id}`,
      );
    } catch (e) {
      setError(e);
    }
  }
  if (initial.status === "confirmed")
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Clase confirmada"
          lead={initial.data.classTopic}
          back={{ to: "/drafts", label: "Borradores" }}
          action={
            initial.sessionId ? (
              <Button
                nativeButton={false}
                render={<Link to={`/session/${initial.sessionId}`} />}
              >
                Ver clase
              </Button>
            ) : undefined
          }
        />
        <p className="text-muted-foreground">
          {initial.sessionId
            ? "Los cambios se hacen desde la clase."
            : "La clase vinculada fue eliminada."}
        </p>
        <Disclosure summary="Relato original">
          <p className="whitespace-pre-wrap text-sm">{initial.sourceText}</p>
          {initial.questions.length > 0 && (
            <ul className="mt-3 flex list-disc flex-col gap-1 pl-5 text-sm text-muted-foreground">
              {initial.questions.map((q) => (
                <li key={q}>{q}</li>
              ))}
            </ul>
          )}
        </Disclosure>
      </div>
    );
  const hasMoreDetails = Boolean(
    draft.data.whatWorked || draft.data.whatFailed || draft.data.goalNotes,
  );
  const confirmButton = (
    <Button disabled={busy || !draft.data.date} onClick={() => save(true)}>
      {busy ? "Guardando…" : "Confirmar clase"}
    </Button>
  );
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Revisar clase"
        back={{ to: "/drafts", label: "Borradores" }}
        action={confirmButton}
      />
      {draft.questions.length > 0 && (
        <div className="flex flex-col items-start gap-4 rounded-3xl bg-surface p-5">
          <h2 className="text-title">Preguntas del coach</h2>
          <ul className="flex list-disc flex-col gap-2 pl-5">
            {draft.questions.map((q, i) => (
              <li key={i}>{q}</li>
            ))}
          </ul>
          <Button variant="outline" disabled={busy} onClick={goToCoach}>
            Responder al coach
          </Button>
        </div>
      )}
      <FieldGroup>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="draft-date">Fecha</FieldLabel>
            <Input
              id="draft-date"
              type="date"
              value={draft.data.date ?? ""}
              onChange={(e) => patch({ date: e.target.value || null })}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="draft-duration">Duración (min)</FieldLabel>
            <Input
              id="draft-duration"
              type="number"
              min={0}
              max={1440}
              value={draft.data.durationMin ?? ""}
              onChange={(e) =>
                patch({ durationMin: numberOrNull(e.target.value) })
              }
            />
          </Field>
        </div>
        <div className="flex flex-col gap-5 sm:flex-row">
          <Field>
            <FieldLabel>Modalidad</FieldLabel>
            <ToggleGroup
              value={draft.data.style ? [draft.data.style] : []}
              onValueChange={(v) =>
                patch({ style: (v[0] as DraftData["style"]) ?? null })
              }
            >
              <ToggleGroupItem value="gi">Gi</ToggleGroupItem>
              <ToggleGroupItem value="nogi">No-gi</ToggleGroupItem>
            </ToggleGroup>
          </Field>
          <Field>
            <FieldLabel>Energía</FieldLabel>
            <ToggleGroup
              value={draft.data.energy ? [String(draft.data.energy)] : []}
              onValueChange={(v) =>
                patch({
                  energy: v[0] ? (Number(v[0]) as DraftData["energy"]) : null,
                })
              }
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <ToggleGroupItem key={n} value={String(n)}>
                  {n}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </Field>
        </div>
        <Field>
          <FieldLabel htmlFor="classTopic">Tema de la clase</FieldLabel>
          <Textarea
            id="classTopic"
            value={draft.data.classTopic}
            onChange={(e) => patch({ classTopic: e.target.value })}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="nextFocus">Foco para la próxima clase</FieldLabel>
          <Textarea
            id="nextFocus"
            value={draft.data.nextFocus}
            onChange={(e) => patch({ nextFocus: e.target.value })}
          />
        </Field>
        <Disclosure summary="Más detalles" defaultOpen={hasMoreDetails}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="whatWorked">Qué funcionó</FieldLabel>
              <Textarea
                id="whatWorked"
                value={draft.data.whatWorked}
                onChange={(e) => patch({ whatWorked: e.target.value })}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="whatFailed">Qué te costó</FieldLabel>
              <Textarea
                id="whatFailed"
                value={draft.data.whatFailed}
                onChange={(e) => patch({ whatFailed: e.target.value })}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="goalNotes">
                Qué pasó con tu objetivo
              </FieldLabel>
              <Textarea
                id="goalNotes"
                value={draft.data.goalNotes}
                onChange={(e) => patch({ goalNotes: e.target.value })}
              />
            </Field>
          </FieldGroup>
        </Disclosure>
      </FieldGroup>
      <div className="flex flex-col gap-4">
        <h2 className="text-title">Técnicas</h2>
        {draft.data.techniques.map((t, i) => (
          <Disclosure
            key={i}
            className="rounded-2xl bg-surface px-4 py-0.5 open:pb-4"
            defaultOpen={openTechIndex === i}
            summary={
              <span className="flex flex-1 flex-wrap items-center gap-x-2 gap-y-0.5">
                <span className="font-medium text-foreground">
                  {t.name || "Técnica"}
                </span>
                <span>
                  · {STAGE_LABELS[t.stage]} · {POSITION_LABELS[t.position]}
                </span>
              </span>
            }
          >
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor={`tech-${i}`}>Nombre</FieldLabel>
                <Input
                  id={`tech-${i}`}
                  value={t.name}
                  onChange={(e) =>
                    patchTechnique(i, {
                      name: e.target.value,
                      catalogId: null,
                    })
                  }
                />
              </Field>
              <Field>
                <FieldLabel htmlFor={`pos-${i}`}>Posición</FieldLabel>
                <select
                  className="training-select"
                  id={`pos-${i}`}
                  value={t.position}
                  onChange={(e) =>
                    patchTechnique(i, {
                      position: e.target.value as typeof t.position,
                    })
                  }
                >
                  {POSITIONS.map((p) => (
                    <option key={p} value={p}>
                      {POSITION_LABELS[p]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field>
                <FieldLabel htmlFor={`type-${i}`}>Tipo</FieldLabel>
                <select
                  className="training-select"
                  id={`type-${i}`}
                  value={t.type}
                  onChange={(e) =>
                    patchTechnique(i, {
                      type: e.target.value as typeof t.type,
                    })
                  }
                >
                  {TECHNIQUE_TYPES.map((p) => (
                    <option key={p} value={p}>
                      {TECHNIQUE_TYPE_LABELS[p]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field>
                <FieldLabel>Experiencia</FieldLabel>
                <ToggleGroup
                  className="flex-wrap"
                  value={[t.stage]}
                  onValueChange={(v) =>
                    v[0] &&
                    patchTechnique(i, { stage: v[0] as typeof t.stage })
                  }
                >
                  {Object.entries(STAGE_LABELS).map(([value, label]) => (
                    <ToggleGroupItem key={value} value={value}>
                      {label}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </Field>
              <Field>
                <FieldLabel>Identificación</FieldLabel>
                <ToggleGroup
                  value={[t.identification]}
                  onValueChange={(v) =>
                    v[0] &&
                    patchTechnique(i, {
                      identification: v[0] as typeof t.identification,
                    })
                  }
                >
                  <ToggleGroupItem value="tentative">
                    Provisional
                  </ToggleGroupItem>
                  <ToggleGroupItem value="confirmed">
                    Confirmada
                  </ToggleGroupItem>
                </ToggleGroup>
              </Field>
              <Field>
                <FieldLabel htmlFor={`notes-${i}`}>Notas</FieldLabel>
                <Textarea
                  id={`notes-${i}`}
                  value={t.notes}
                  onChange={(e) =>
                    patchTechnique(i, { notes: e.target.value })
                  }
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                {(["attempts", "successes"] as const).map((k) => (
                  <Field key={k}>
                    <FieldLabel htmlFor={`${k}-${i}`}>
                      {k === "attempts" ? "Intentos" : "Éxitos"}
                    </FieldLabel>
                    <Input
                      id={`${k}-${i}`}
                      type="number"
                      min={0}
                      value={t[k] ?? ""}
                      onChange={(e) =>
                        patchTechnique(i, {
                          [k]: numberOrNull(e.target.value),
                        })
                      }
                    />
                  </Field>
                ))}
              </div>
              <Button
                variant="ghost"
                className="self-start"
                onClick={() =>
                  patch({
                    techniques: draft.data.techniques.filter(
                      (_, j) => j !== i,
                    ),
                  })
                }
              >
                Quitar técnica
              </Button>
            </FieldGroup>
          </Disclosure>
        ))}
        <Button
          variant="outline"
          className="self-start"
          onClick={() => {
            const newIndex = draft.data.techniques.length;
            patch({
              techniques: [
                ...draft.data.techniques,
                {
                  name: "Técnica sin identificar",
                  position: "Other",
                  type: "concept",
                  stage: "seen",
                  notes: "",
                  identification: "tentative",
                  catalogId: null,
                  attempts: null,
                  successes: null,
                },
              ],
            });
            setOpenTechIndex(newIndex);
          }}
        >
          Agregar técnica
        </Button>
      </div>
      <div className="flex flex-col gap-4">
        <h2 className="text-title">Rolls</h2>
        {draft.data.rolls.map((r, i) => (
          <Disclosure
            key={i}
            className="rounded-2xl bg-surface px-4 py-0.5 open:pb-4"
            summary={`Roll ${i + 1} · ${r.partnerName || "Sin nombre"} · ${label(OUTCOME_LABELS, r.outcome)}`}
          >
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor={`partner-${i}`}>Compañero</FieldLabel>
                <Input
                  id={`partner-${i}`}
                  value={r.partnerName ?? ""}
                  onChange={(e) =>
                    patch({
                      rolls: draft.data.rolls.map((x, j) =>
                        i === j ? { ...x, partnerName: e.target.value } : x,
                      ),
                    })
                  }
                />
              </Field>
              <Field>
                <FieldLabel htmlFor={`roll-notes-${i}`}>Notas</FieldLabel>
                <Textarea
                  id={`roll-notes-${i}`}
                  value={r.notes ?? ""}
                  onChange={(e) =>
                    patch({
                      rolls: draft.data.rolls.map((x, j) =>
                        i === j ? { ...x, notes: e.target.value } : x,
                      ),
                    })
                  }
                />
              </Field>
              <p className="text-sm text-muted-foreground">
                Resultado: {label(OUTCOME_LABELS, r.outcome)}
                {r.stuckIn
                  ? ` · Te costó: ${label(POSITION_LABELS, r.stuckIn)}`
                  : ""}
              </p>
              <Button
                variant="ghost"
                className="self-start"
                onClick={() =>
                  patch({ rolls: draft.data.rolls.filter((_, j) => i !== j) })
                }
              >
                Quitar roll
              </Button>
            </FieldGroup>
          </Disclosure>
        ))}
        {!draft.data.rolls.length && (
          <p className="text-muted-foreground">Sin rolls.</p>
        )}
      </div>
      <Disclosure summary="Relato original">
        <p className="whitespace-pre-wrap text-sm">{draft.sourceText}</p>
      </Disclosure>
      <ErrorNotice error={error} />
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          {confirmButton}
          <Button variant="outline" disabled={busy} onClick={() => save()}>
            Guardar borrador
          </Button>
          {!draft.questions.length && (
            <Button variant="ghost" disabled={busy} onClick={goToCoach}>
              Seguir con el coach
            </Button>
          )}
        </div>
        {!draft.data.date && (
          <p className="text-sm text-muted-foreground">
            Completá la fecha para confirmar.
          </p>
        )}
      </div>
      <div className="mt-6 flex flex-col items-start gap-2">
        <ConfirmDelete
          label="Eliminar borrador"
          description="El chat original se conserva."
          onConfirm={async () => {
            await actions.removeDraft.mutateAsync(draft.id);
            toast("Borrador eliminado");
            navigate("/drafts");
          }}
        />
      </div>
    </div>
  );
}
