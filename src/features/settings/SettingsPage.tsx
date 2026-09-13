import { useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { toast } from "sonner";
import { db, DEFAULT_SETTINGS, exportAll, importAll, saveSettings } from "@/lib/db";
import type { Settings } from "@/lib/types";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
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

function SettingsForm({ initial }: { initial: Settings }) {
  const [apiKey, setApiKey] = useState(initial.geminiApiKey ?? "");
  const [beltStartDate, setBeltStartDate] = useState(initial.beltStartDate ?? "");
  const [weeklyGoalSessions, setWeeklyGoalSessions] = useState(initial.weeklyGoalSessions);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [pendingImportFile, setPendingImportFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleSave() {
    await saveSettings({
      geminiApiKey: apiKey || undefined,
      beltStartDate: beltStartDate || undefined,
      weeklyGoalSessions: Math.min(7, Math.max(1, weeklyGoalSessions)),
    });
    toast("Saved");
  }

  async function handleExport() {
    const json = await exportAll();
    const blob = new Blob([json], { type: "application/json" });
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
      await importAll(text);
      toast("Backup imported");
    } catch (err) {
      setImportError(err instanceof Error ? err.message : String(err));
    } finally {
      setImporting(false);
    }
  }

  async function handleDeleteAll() {
    await db.delete();
    location.reload();
  }

  return (
    <div className="mx-auto flex w-full max-w-[720px] flex-col gap-6">
      <PageHeader title="Settings." lead="Configure the coach, your training goals, and your data." />

      <Card>
        <CardHeader>
          <CardTitle>Coach</CardTitle>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="gemini-api-key">Google AI Studio API key</FieldLabel>
              <Input
                id="gemini-api-key"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIza..."
                autoComplete="off"
              />
              <FieldDescription>
                Stored only in this browser and sent only to Google when you use the Coach. Get a key at{" "}
                <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">
                  aistudio.google.com/apikey
                </a>
                .
              </FieldDescription>
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Training</CardTitle>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="belt-start-date">Belt start date</FieldLabel>
              <Input id="belt-start-date" type="date" value={beltStartDate} onChange={(e) => setBeltStartDate(e.target.value)} />
            </Field>
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
        <Button onClick={handleSave}>Save</Button>
      </div>

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
                    Importing a backup replaces all current sessions and techniques. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={confirmImport}>Import</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <div className="flex flex-col gap-2 border-t border-border-soft pt-4">
              <p className="text-label text-muted-foreground">Danger zone</p>
              <AlertDialog>
                <AlertDialogTrigger render={<Button variant="destructive" className="w-fit" />}>
                  Delete all data
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete all data?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This permanently deletes every session, technique, and setting. This cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction variant="destructive" onClick={handleDeleteAll}>
                      Delete everything
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </CardContent>
      </Card>

      <p className="text-center text-xs text-text-faint">Mat Log · local-only · v0.1</p>
    </div>
  );
}

export default function SettingsPage() {
  const initial =
    useLiveQuery(() => db.settings.get("settings").then((s) => s ?? DEFAULT_SETTINGS), []) ?? DEFAULT_SETTINGS;
  const formKey = `${initial.geminiApiKey ?? ""}|${initial.beltStartDate ?? ""}|${initial.weeklyGoalSessions}`;

  return <SettingsForm key={formKey} initial={initial} />;
}
