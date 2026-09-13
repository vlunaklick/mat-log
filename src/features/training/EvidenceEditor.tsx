import type { TechniqueEvidence } from "@/lib/training";
import { STAGE_LABELS } from "@/lib/training";
import type { Technique } from "@/lib/types";
import { Field, FieldLabel, FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Disclosure } from "@/components/app/disclosure";
export function EvidenceEditor({
  value,
  onChange,
  techniques,
}: {
  value: TechniqueEvidence[];
  onChange: (v: TechniqueEvidence[]) => void;
  techniques: Technique[];
}) {
  if (!value.length) return null;
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-title">Detalle por técnica</h2>
      {value.map((e, i) => {
        const patch = (p: Partial<TechniqueEvidence>) =>
          onChange(value.map((x, j) => (i === j ? { ...x, ...p } : x)));
        const name =
          techniques.find((t) => t.id === e.techniqueId)?.name ?? "Técnica";
        return (
          <Disclosure
            key={i}
            className="rounded-2xl bg-surface px-4 py-0.5 open:pb-4"
            summary={
              <span className="flex flex-1 flex-wrap items-center gap-x-2 gap-y-0.5">
                <span className="font-medium text-foreground">{name}</span>
                <span>· {STAGE_LABELS[e.stage]}</span>
              </span>
            }
          >
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor={`evidence-stage-${i}`}>
                  Experiencia
                </FieldLabel>
                <select
                  className="training-select"
                  id={`evidence-stage-${i}`}
                  value={e.stage}
                  onChange={(v) =>
                    patch({
                      stage: v.target.value as TechniqueEvidence["stage"],
                    })
                  }
                >
                  {Object.entries(STAGE_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                {(["attempts", "successes"] as const).map((k) => (
                  <Field key={k}>
                    <FieldLabel htmlFor={`evidence-${i}-${k}`}>
                      {k === "attempts" ? "Intentos" : "Éxitos"}
                    </FieldLabel>
                    <Input
                      type="number"
                      min={0}
                      id={`evidence-${i}-${k}`}
                      value={e[k] ?? ""}
                      onChange={(v) =>
                        patch({
                          [k]:
                            v.target.value === ""
                              ? null
                              : Number(v.target.value),
                        })
                      }
                    />
                  </Field>
                ))}
              </div>
              <Field>
                <FieldLabel htmlFor={`evidence-notes-${i}`}>Notas</FieldLabel>
                <Textarea
                  id={`evidence-notes-${i}`}
                  value={e.notes}
                  onChange={(v) => patch({ notes: v.target.value })}
                />
              </Field>
            </FieldGroup>
          </Disclosure>
        );
      })}
    </div>
  );
}
