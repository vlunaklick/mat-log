import { useState } from "react";
import { Link } from "react-router-dom";
import type { Profile, TrainingState } from "@/lib/training";
import { trainingDays } from "@/lib/training";
import { todayISO } from "@/lib/date";
import { BELT_LABELS } from "@/lib/labels";
import { X } from "lucide-react";
import { useTraining, useTrainingActions } from "./queries";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardAction,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Loading, ErrorNotice } from "./shared";
import { toast } from "sonner";
export function ProfileForm() {
  const state = useTraining();
  if (state.isPending) return <Loading />;
  if (!state.data) return <ErrorNotice error={state.error} />;
  return <ProfileEditor key={state.data.revision} initial={state.data} />;
}
function ProfileEditor({ initial }: { initial: TrainingState }) {
  const [profile, setProfile] = useState(initial.profile);
  const { update } = useTrainingActions();
  const patch = (p: Partial<Profile>) => setProfile((v) => ({ ...v, ...p }));
  const days = trainingDays(profile, todayISO());
  return (
    <Card>
      <CardHeader>
        <CardTitle>Tu recorrido</CardTitle>
        <CardAction>
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={
              <Link to="/coach?mode=profile&prompt=Ayudame%20a%20completar%20mi%20perfil%20de%20entrenamiento.%20Preguntame%20de%20a%20una%20cosa." />
            }
          >
            Completar con el coach
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="profile-start">
              Empezaste a entrenar
            </FieldLabel>
            <Input
              id="profile-start"
              type="date"
              value={profile.startedOn ?? ""}
              onChange={(e) => patch({ startedOn: e.target.value || null })}
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-3">
            {(
              [
                ["birthYear", "Año de nacimiento"],
                ["heightCm", "Altura, cm"],
                ["weightKg", "Peso, kg"],
              ] as const
            ).map(([key, label]) => (
              <Field key={key}>
                <FieldLabel htmlFor={key}>{label}</FieldLabel>
                <Input
                  id={key}
                  type="number"
                  step={key === "birthYear" ? 1 : 0.1}
                  value={profile[key] ?? ""}
                  onChange={(e) =>
                    patch({
                      [key]:
                        e.target.value === "" ? null : Number(e.target.value),
                    })
                  }
                />
              </Field>
            ))}
          </div>
          {(
            [
              ["preferences", "Cómo te gusta pelear"],
              ["ambitions", "Objetivos y competencias"],
              ["limitations", "Lesiones o limitaciones"],
            ] as const
          ).map(([key, label]) => (
            <Field key={key}>
              <FieldLabel htmlFor={`profile-${key}`}>{label}</FieldLabel>
              <Textarea
                id={`profile-${key}`}
                value={profile[key]}
                onChange={(e) => patch({ [key]: e.target.value })}
              />
            </Field>
          ))}
          <h3 className="text-title">Cinturones</h3>
          {profile.belts.map((b, i) => (
            <div className="flex flex-wrap items-end gap-2" key={i}>
              <Field className="min-w-32 flex-1">
                <FieldLabel htmlFor={`belt-${i}`}>Cinturón</FieldLabel>
                <select
                  className="training-select"
                  id={`belt-${i}`}
                  value={b.belt}
                  onChange={(e) =>
                    patch({
                      belts: profile.belts.map((x, j) =>
                        i === j
                          ? { ...x, belt: e.target.value as typeof b.belt }
                          : x,
                      ),
                    })
                  }
                >
                  {Object.entries(BELT_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </Field>
              <Field className="min-w-40 flex-1">
                <FieldLabel htmlFor={`belt-date-${i}`}>Desde</FieldLabel>
                <Input
                  id={`belt-date-${i}`}
                  type="date"
                  value={b.date}
                  onChange={(e) =>
                    patch({
                      belts: profile.belts.map((x, j) =>
                        i === j ? { ...x, date: e.target.value } : x,
                      ),
                    })
                  }
                />
              </Field>
              <Button
                variant="ghost"
                size="icon"
                className="size-11"
                aria-label="Quitar cinturón"
                onClick={() =>
                  patch({ belts: profile.belts.filter((_, j) => j !== i) })
                }
              >
                <X />
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            onClick={() =>
              patch({ belts: [...profile.belts, { belt: "white", date: "" }] })
            }
          >
            Agregar cinturón
          </Button>
          <h3 className="text-title">Pausas</h3>
          {profile.breaks.map((b, i) => (
            <FieldGroup key={i}>
              <div className="grid grid-cols-2 gap-3">
                <Field>
                  <FieldLabel htmlFor={`break-start-${i}`}>Inicio</FieldLabel>
                  <Input
                    id={`break-start-${i}`}
                    type="date"
                    value={b.start}
                    onChange={(e) =>
                      patch({
                        breaks: profile.breaks.map((x, j) =>
                          i === j ? { ...x, start: e.target.value } : x,
                        ),
                      })
                    }
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor={`break-end-${i}`}>
                    Vuelta (vacía si sigue)
                  </FieldLabel>
                  <Input
                    id={`break-end-${i}`}
                    type="date"
                    value={b.end ?? ""}
                    onChange={(e) =>
                      patch({
                        breaks: profile.breaks.map((x, j) =>
                          i === j ? { ...x, end: e.target.value || null } : x,
                        ),
                      })
                    }
                  />
                </Field>
              </div>
              <div className="flex items-end gap-2">
                <Field className="flex-1">
                  <FieldLabel htmlFor={`break-reason-${i}`}>Motivo</FieldLabel>
                  <Input
                    id={`break-reason-${i}`}
                    value={b.reason}
                    onChange={(e) =>
                      patch({
                        breaks: profile.breaks.map((x, j) =>
                          i === j ? { ...x, reason: e.target.value } : x,
                        ),
                      })
                    }
                  />
                </Field>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-11"
                  aria-label="Quitar pausa"
                  onClick={() =>
                    patch({ breaks: profile.breaks.filter((_, j) => j !== i) })
                  }
                >
                  <X />
                </Button>
              </div>
            </FieldGroup>
          ))}
          <Button
            variant="outline"
            onClick={() =>
              patch({
                breaks: [
                  ...profile.breaks,
                  { start: "", end: null, reason: "" },
                ],
              })
            }
          >
            Agregar pausa
          </Button>
          {days && (
            <p className="text-sm text-muted-foreground">
              {days.paused > 0
                ? `${days.active.toLocaleString("es")} días activos desde que empezaste (${days.paused.toLocaleString("es")} en pausa)`
                : `${days.elapsed.toLocaleString("es")} días desde que empezaste`}
            </p>
          )}
          <ErrorNotice error={update.error} />
        </FieldGroup>
      </CardContent>
      <CardFooter>
        <Button
          disabled={update.isPending}
          onClick={() =>
            update.mutate(
              {
                payload: { kind: "profile", data: profile },
                revision: initial.revision,
              },
              { onSuccess: () => toast("Perfil guardado") },
            )
          }
        >
          {update.isPending ? "Guardando…" : "Guardar perfil"}
        </Button>
      </CardFooter>
    </Card>
  );
}
