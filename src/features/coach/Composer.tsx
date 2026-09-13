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
  label = "Mensaje para el coach",
  placeholder = "Hoy practicamos… Me costó… Quiero trabajar…",
}: {
  value: string;
  onChange: (text: string) => void;
  onSend: () => void;
  busy: boolean;
  label?: string;
  placeholder?: string;
}) {
  const audio = useAudio((text) =>
    onChange(value ? `${value}\n${text}` : text),
  );
  const canSend = !!value.trim() && !busy && !audio.busy && !audio.recording;
  return (
    <div className="flex flex-col gap-3 rounded-3xl bg-surface p-4">
      <Field>
        <FieldLabel htmlFor="coach-entry" className="sr-only">
          {label}
        </FieldLabel>
        <Textarea
          id="coach-entry"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={4}
          disabled={busy || audio.busy || audio.recording}
          maxLength={20000}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && canSend) {
              e.preventDefault();
              onSend();
            }
          }}
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
          disabled={busy || audio.busy || audio.recording}
        >
          <Paperclip data-icon="inline-start" />
          <span>Subir audio</span>
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
          disabled={!canSend}
          onClick={onSend}
        >
          <ArrowUp data-icon="inline-start" />
          {busy ? "Pensando…" : "Enviar"}
        </Button>
      </div>
      <p
        className={
          audio.recording || audio.busy
            ? "text-xs text-muted-foreground"
            : "sr-only"
        }
        aria-live="polite"
      >
        {audio.recording
          ? "Grabando. Se detiene a los 5 minutos."
          : audio.busy
            ? "Transcribiendo el audio…"
            : null}
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
