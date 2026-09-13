import { ProfileForm } from "../training/ProfileForm";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { authClient } from "@/lib/auth-client";
import { useSettings, useUpdateSettings } from "@/lib/queries";
import type { Settings } from "@/lib/types";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

function SettingsForm({ initial }: { initial: Settings }) {
  const queryClient = useQueryClient();
  const updateSettings = useUpdateSettings();

  const beltStartDate = initial.beltStartDate ?? "";
  const [weeklyGoalSessions, setWeeklyGoalSessions] = useState(initial.weeklyGoalSessions);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [pendingImportFile, setPendingImportFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Saves on pick; reverts the toggle if the request fails.
  async function handleGoalChange(value: string[]) {
    const goal = Number(value[0]);
    if (!goal) return;
    setWeeklyGoalSessions(goal);
    try {
      await updateSettings.mutateAsync({
        beltStartDate: beltStartDate || undefined,
        weeklyGoalSessions: Math.min(7, Math.max(1, goal)),
      });
      toast("Meta semanal guardada");
    } catch {
      setWeeklyGoalSessions(initial.weeklyGoalSessions);
    }
  }

  async function handleExport() {
    let data: unknown;
    try {
      data = await api.get<unknown>("/api/export");
    } catch {
      toast.error("No se pudo exportar el backup");
      return;
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const date = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `matlog-backup-${date}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImportClick() {
    fileInputRef.current?.click();
  }

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setImportError(null);
    setPendingImportFile(file);
  }

  async function confirmImport() {
    const file = pendingImportFile;
    setPendingImportFile(null);
    if (!file) return;
    setImportError(null);
    setImporting(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      await api.post<void>("/api/import", data);
      await queryClient.invalidateQueries();
      toast("Backup importado");
    } catch (err) {
      setImportError(err instanceof Error ? err.message : String(err));
    } finally {
      setImporting(false);
    }
  }

  async function handleSignOut() {
    await authClient.signOut();
    queryClient.clear();
  }

  return (
    <div className="mx-auto flex w-full max-w-[720px] flex-col gap-6">
      <PageHeader title="Perfil" />

      <ProfileForm />

      <Card>
        <CardHeader>
          <CardTitle>Clases por semana</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <ToggleGroup
            aria-label="Meta semanal"
            variant="outline"
            spacing={1}
            className="w-full"
            value={[String(weeklyGoalSessions)]}
            onValueChange={handleGoalChange}
            disabled={updateSettings.isPending}
          >
            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
              <ToggleGroupItem key={n} value={String(n)} className="min-w-0 flex-1">
                {n}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          {updateSettings.isError && (
            <Alert variant="destructive">
              <AlertDescription>
                {updateSettings.error instanceof Error ? updateSettings.error.message : "No se pudo guardar la meta."}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Datos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={handleExport}>
                Exportar backup
              </Button>
              <Button variant="outline" onClick={handleImportClick} disabled={importing}>
                {importing ? "Importando…" : "Importar backup"}
              </Button>
              <input ref={fileInputRef} type="file" accept="application/json" className="hidden" onChange={handleFileSelected} />
            </div>

            {importError && (
              <Alert variant="destructive">
                <AlertDescription>{importError}</AlertDescription>
              </Alert>
            )}

            <AlertDialog
              open={pendingImportFile !== null}
              onOpenChange={(open) => {
                if (!open) setPendingImportFile(null);
              }}
            >
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Reemplazar tus datos?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Reemplaza todos tus datos actuales por los del archivo. Exportá una copia antes.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction variant="destructive" onClick={confirmImport}>
                    Importar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>

      <Button variant="outline" className="sm:self-start" onClick={handleSignOut}>
        Cerrar sesión
      </Button>
    </div>
  );
}

export default function SettingsPage() {
  const { data: settings, isPending } = useSettings();

  if (isPending || !settings) {
    return (
      <div className="mx-auto flex w-full max-w-[720px] flex-col gap-6">
        <PageHeader title="Perfil" />
        <Skeleton className="h-48 rounded-3xl" />
        <Skeleton className="h-32 rounded-3xl" />
      </div>
    );
  }

  const formKey = `${settings.beltStartDate ?? ""}|${settings.weeklyGoalSessions}`;

  return <SettingsForm key={formKey} initial={settings} />;
}
