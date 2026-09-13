import type { TechniqueEvidence } from "@/lib/training";
import { STAGE_LABELS } from "@/lib/training";
import type { Technique } from "@/lib/types";
import { Field, FieldLabel, FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
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
    <Card>
      <CardHeader>
        <CardTitle>Detalle por técnica</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {value.map((e, i) => {
          const patch = (p: Partial<TechniqueEvidence>) =>
            onChange(value.map((x, j) => (i === j ? { ...x, ...p } : x)));
          return (
            <FieldGroup key={i}>
              <p className="text-title">
                {techniques.find((t) => t.id === e.techniqueId)?.name ??
                  "Técnica"}
              </p>
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
          );
        })}
      </CardContent>
    </Card>
  );
}
