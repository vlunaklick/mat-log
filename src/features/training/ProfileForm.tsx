import { useState } from "react";
import { Link } from "react-router-dom";
import type { Profile, TrainingState } from "@/lib/training";
import { trainingDays } from "@/lib/training";
import { todayISO } from "@/lib/date";
import { useTraining, useTrainingActions } from "./queries";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
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
        <CardDescription>
          Todo es opcional. El coach usa estos datos confirmados para
          contextualizar sus propuestas.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <Button
            variant="outline"
            nativeButton={false}
            render={
              <Link to="/coach?mode=profile&prompt=Ayudame%20a%20completar%20mi%20perfil%20de%20entrenamiento.%20Preguntame%20de%20a%20una%20cosa." />
            }
          >
            Completar conversando con el coach
          </Button>
          <Field>
            <FieldLabel htmlFor="profile-start">
              Día que empezaste a entrenar
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
              ["ambitions", "Qué querés conseguir o competir"],
              ["limitations", "Limitaciones que quieras contar"],
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
                  {[
                    ["white", "Blanco"],
                    ["blue", "Azul"],
                    ["purple", "Violeta"],
                    ["brown", "Marrón"],
                    ["black", "Negro"],
                  ].map(([v, l]) => (
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
                onClick={() =>
                  patch({ belts: profile.belts.filter((_, j) => j !== i) })
                }
              >
                Quitar
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
          <h3 className="text-title">Parones</h3>
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
                    Regreso, vacío si sigue
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
              <Field>
                <FieldLabel htmlFor={`break-reason-${i}`}>
                  Motivo, opcional
                </FieldLabel>
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
                onClick={() =>
                  patch({ breaks: profile.breaks.filter((_, j) => j !== i) })
                }
              >
                Quitar parón
              </Button>
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
            Agregar parón
          </Button>
          {days && (
            <p className="text-sm text-muted-foreground">
              {days.elapsed} días desde el inicio · {days.paused} de parón ·{" "}
              {days.active} descontando pausas. Esto no equivale a días
              asistidos.
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
