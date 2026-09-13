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
import { Input } from "@/components/ui/input";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
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

  async function handleSave() {
    await updateSettings.mutateAsync({
      beltStartDate: beltStartDate || undefined,
      weeklyGoalSessions: Math.min(7, Math.max(1, weeklyGoalSessions)),
    });
    toast("Saved");
  }

  async function handleExport() {
    const data = await api.get<unknown>("/api/export");
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
      toast("Backup imported");
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
      <PageHeader title="Settings." lead="Configure your training goals and your data." />

      <ProfileForm />
      <Card>
        <CardHeader>
          <CardTitle>Training</CardTitle>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="weekly-goal">Weekly goal (sessions)</FieldLabel>
              <Input
                id="weekly-goal"
                type="number"
                min={1}
                max={7}
                value={weeklyGoalSessions}
                onChange={(e) => setWeeklyGoalSessions(Number(e.target.value))}
              />
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>

      <div>
        <Button onClick={handleSave} disabled={updateSettings.isPending}>
          {updateSettings.isPending ? "Saving…" : "Save"}
        </Button>
      </div>

      {updateSettings.isError && (
        <Alert variant="destructive">
          <AlertDescription>
            {updateSettings.error instanceof Error ? updateSettings.error.message : "Could not save settings."}
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Data</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={handleExport}>
                Export backup
              </Button>
              <Button variant="outline" onClick={handleImportClick} disabled={importing}>
                {importing ? "Importing..." : "Import backup"}
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
                  <AlertDialogTitle>Replace all current data?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Un backup v3 reemplaza clases, técnicas, perfil, objetivos, gameplans, borradores y chats. Los backups anteriores reemplazan clases y técnicas; conservan los chats y borradores. Exportá una copia antes de continuar.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={confirmImport}>Import</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>

      <Button variant="outline" onClick={handleSignOut}>
        Sign out
      </Button>

      <p className="text-center text-xs text-text-faint">Mat Log · v0.1</p>
    </div>
  );
}

export default function SettingsPage() {
  const { data: settings, isPending } = useSettings();

  if (isPending || !settings) {
    return (
      <div className="mx-auto flex w-full max-w-[720px] flex-col gap-6">
        <PageHeader title="Settings." lead="Configure your training goals and your data." />
        <Skeleton className="h-48 rounded-3xl" />
        <Skeleton className="h-32 rounded-3xl" />
      </div>
    );
  }

  const formKey = `${settings.beltStartDate ?? ""}|${settings.weeklyGoalSessions}`;

  return <SettingsForm key={formKey} initial={settings} />;
}
