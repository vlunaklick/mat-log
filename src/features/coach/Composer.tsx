import { Mic, Square, ArrowUp, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldLabel } from "@/components/ui/field";
import { ErrorNotice } from "../training/shared";
import { useAudio } from "./use-audio";
export function Composer({
  value,
  onChange,
  onSend,
  busy,
  label = "Contame qué pasó",
}: {
  value: string;
  onChange: (text: string) => void;
  onSend: () => void;
  busy: boolean;
  label?: string;
}) {
  const audio = useAudio((text) =>
    onChange(value ? `${value}\n${text}` : text),
  );
  return (
    <div className="flex flex-col gap-3 rounded-3xl bg-surface p-4">
      <Field>
        <FieldLabel htmlFor="coach-entry">{label}</FieldLabel>
        <Textarea
          id="coach-entry"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Hoy practicamos… Me costó… Quiero trabajar…"
          rows={4}
          disabled={busy || audio.busy || audio.recording}
          maxLength={20000}
        />
      </Field>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          onClick={audio.recording ? audio.stop : audio.start}
          disabled={busy || audio.busy}
        >
          {audio.recording ? (
            <Square data-icon="inline-start" />
          ) : (
            <Mic data-icon="inline-start" />
          )}
          {audio.recording ? "Terminar audio" : "Grabar"}
        </Button>
        <Button
          variant="ghost"
          nativeButton={false}
          render={<label />}
          aria-label="Adjuntar audio"
          disabled={busy || audio.busy || audio.recording}
        >
          <Paperclip data-icon="inline-start" />
          <span>Audio</span>
          <input
            type="file"
            accept="audio/*"
            className="sr-only"
            disabled={busy || audio.busy || audio.recording}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void audio.transcribe(f);
              e.target.value = "";
            }}
          />
        </Button>
        <Button
          className="ml-auto"
          disabled={!value.trim() || busy || audio.busy || audio.recording}
          onClick={onSend}
        >
          <ArrowUp data-icon="inline-start" />
          {busy ? "Pensando…" : "Enviar"}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground" aria-live="polite">
        {audio.recording
          ? "Grabando. Se detiene a los 5 minutos."
          : audio.busy
            ? "Transcribiendo el audio…"
            : "Revisá la transcripción antes de enviar. Audio hasta 15 MB; no se conserva en el servidor."}
      </p>
      <ErrorNotice error={audio.error} />
      {audio.error && audio.retry && (
        <Button
          variant="outline"
          disabled={audio.busy || busy}
          onClick={audio.retry}
        >
          Reintentar transcripción
        </Button>
      )}
    </div>
  );
}
