import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { Draft, DraftData } from "@/lib/training";
import { STAGE_LABELS } from "@/lib/training";
import { POSITIONS, TECHNIQUE_TYPES } from "@/lib/types";
import { useDraft, useTrainingActions } from "./queries";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
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
        navigate(`/session/${confirmed.sessionId}`);
      }
    } catch (e) {
      setError(e);
    }
  }
  if (initial.status === "confirmed")
    return (
      <div className="flex flex-col gap-5">
        <PageHeader title="Clase confirmada." lead={initial.data.classTopic} />
        <p>
          Este borrador ya se convirtió en una clase. Las modificaciones se
          hacen en el registro confirmado.
        </p>
        {initial.sessionId ? (
          <Button
            nativeButton={false}
            render={<Link to={`/session/${initial.sessionId}`} />}
          >
            Ver clase
          </Button>
        ) : (
          <p>La clase vinculada fue eliminada.</p>
        )}
        <details>
          <summary>Relato original y preguntas</summary>
          <p className="whitespace-pre-wrap">{initial.sourceText}</p>
          {initial.questions.map((q) => (
            <p key={q}>{q}</p>
          ))}
        </details>
      </div>
    );
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Revisá tu clase."
        lead="Los campos vacíos quedan sin registrar. Podés confirmar con preguntas pendientes."
      />
      <Card>
        <CardHeader>
          <CardTitle>Preguntas pendientes</CardTitle>
          <CardDescription>
            Respondé al coach con texto o audio, o corregí los datos abajo.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {draft.questions.length ? (
            draft.questions.map((q, i) => <p key={i}>{q}</p>)
          ) : (
            <p>No hay preguntas pendientes.</p>
          )}
          <Button
            variant="outline"
            disabled={busy}
            onClick={async () => {
              try {
                await actions.saveDraft.mutateAsync(draft);
                navigate(
                  `/coach${draft.conversationId ? `/${draft.conversationId}` : ""}?draft=${draft.id}`,
                );
              } catch (e) {
                setError(e);
              }
            }}
          >
            Guardar y responder al coach
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Datos de la clase</CardTitle>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="draft-date">Fecha de la clase</FieldLabel>
              <Input
                id="draft-date"
                type="date"
                value={draft.data.date ?? ""}
                onChange={(e) => patch({ date: e.target.value || null })}
              />
            </Field>
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
              <FieldLabel htmlFor="draft-duration">
                Duración en minutos, si la recordás
              </FieldLabel>
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
            <Field>
              <FieldLabel>Energía, opcional</FieldLabel>
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
            {(
              [
                ["classTopic", "Qué trabajaron"],
                ["whatWorked", "Qué funcionó"],
                ["whatFailed", "Qué te costó"],
                ["nextFocus", "Foco para la próxima clase"],
                ["goalNotes", "Qué pasó con tu objetivo"],
              ] as const
            ).map(([key, label]) => (
              <Field key={key}>
                <FieldLabel htmlFor={key}>{label}</FieldLabel>
                <Textarea
                  id={key}
                  value={draft.data[key]}
                  onChange={(e) => patch({ [key]: e.target.value })}
                />
              </Field>
            ))}
          </FieldGroup>
        </CardContent>
      </Card>
      <div className="flex flex-col gap-4">
        <h2 className="text-h2">Técnicas de esta clase.</h2>
        {draft.data.techniques.map((t, i) => (
          <Card key={i}>
            <CardHeader>
              <CardTitle>{t.name}</CardTitle>
              <CardDescription>
                {t.identification === "tentative"
                  ? "Identificación provisional. Conservá un nombre descriptivo si no estás seguro."
                  : "Identificación confirmada"}
              </CardDescription>
            </CardHeader>
            <CardContent>
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
                      <option key={p}>{p}</option>
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
                      <option key={p}>{p}</option>
                    ))}
                  </select>
                </Field>
                <Field>
                  <FieldLabel>Experiencia en esta clase</FieldLabel>
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
                  <FieldLabel htmlFor={`notes-${i}`}>
                    Detalles que recordás
                  </FieldLabel>
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
                        {k === "attempts" ? "Intentos" : "Éxitos"}, opcional
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
                  onClick={() =>
                    patch({
                      techniques: draft.data.techniques.filter(
                        (_, j) => j !== i,
                      ),
                    })
                  }
                >
                  Quitar del borrador
                </Button>
              </FieldGroup>
            </CardContent>
          </Card>
        ))}
        <Button
          variant="outline"
          onClick={() =>
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
            })
          }
        >
          Agregar técnica
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Rolls</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {draft.data.rolls.map((r, i) => (
            <FieldGroup key={i}>
              <Field>
                <FieldLabel htmlFor={`partner-${i}`}>
                  Compañero {i + 1}
                </FieldLabel>
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
                Resultado: {r.outcome} · Dificultad:{" "}
                {r.stuckIn ?? "Sin registrar"}
              </p>
              <Button
                variant="ghost"
                onClick={() =>
                  patch({ rolls: draft.data.rolls.filter((_, j) => i !== j) })
                }
              >
                Quitar roll
              </Button>
            </FieldGroup>
          ))}
          {!draft.data.rolls.length && <p>No registraste rolls.</p>}
        </CardContent>
      </Card>
      <details className="rounded-3xl bg-surface p-4">
        <summary className="cursor-pointer">Tu relato original</summary>
        <p className="mt-3 whitespace-pre-wrap text-sm">{draft.sourceText}</p>
      </details>
      <ErrorNotice error={error} />
      <div className="flex flex-wrap gap-2">
        <Button disabled={busy || !draft.data.date} onClick={() => save(true)}>
          {busy ? "Guardando…" : "Confirmar clase"}
        </Button>
        <Button variant="outline" disabled={busy} onClick={() => save()}>
          Guardar borrador
        </Button>
        <ConfirmDelete
          label="Eliminar borrador"
          description="Se elimina este borrador. El chat original se conserva."
          onConfirm={async () => {
            await actions.removeDraft.mutateAsync(draft.id);
            navigate("/drafts");
          }}
        />
      </div>
    </div>
  );
}
