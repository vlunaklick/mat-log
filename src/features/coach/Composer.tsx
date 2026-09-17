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
  placeholder = "Hoy practicamos… Me costó…",
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
  // Typing stays available while the coach thinks so a follow-up can be queued;
  // only recording and transcribing lock the field.
  const audioLocked = audio.busy || audio.recording;
  const locked = busy || audioLocked;
  const canSend = !!value.trim() && !locked;
  const status =
    audio.recording
      ? audio.dictation ? "Dictando…" : "Grabando…"
      : audio.busy
        ? "Transcribiendo…"
        : busy
          ? "Pensando…"
          : null;
  const micHint = !audio.dictation
    ? "Graba y transcribe al terminar"
    : "Dictado en vivo";
  return (
    <div className="flex flex-col gap-2 rounded-3xl bg-surface p-2">
      <Field>
        <FieldLabel htmlFor="coach-entry" className="sr-only">
          {label}
        </FieldLabel>
        <Textarea
          id="coach-entry"
          value={audio.live ? [value, audio.live].filter(Boolean).join("\n") : value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="max-h-72 min-h-14 resize-none bg-background"
          disabled={audioLocked}
          maxLength={20000}
          title="Cmd o Ctrl + Enter para enviar"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && canSend) {
              e.preventDefault();
              onSend();
            }
          }}
        />
      </Field>
      <div className="flex items-center gap-1">
        <Button
          variant={audio.recording ? "default" : "ghost"}
          size={audio.recording ? "default" : "icon"}
          aria-label={audio.recording ? "Terminar audio" : micHint}
          onClick={audio.recording ? audio.stop : audio.start}
          disabled={busy || audio.busy}
        >
          {audio.recording ? <Square data-icon="inline-start" /> : <Mic />}
          {audio.recording && "Terminar"}
        </Button>
        {!audio.recording && (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Subir audio"
            nativeButton={false}
            render={<label />}
            disabled={locked}
          >
            <Paperclip />
            <input
              type="file"
              accept="audio/*"
              className="sr-only"
              disabled={locked}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void audio.transcribe(f);
                e.target.value = "";
              }}
            />
          </Button>
        )}
        <p
          title={micHint}
          className={
            status
              ? "min-w-0 flex-1 truncate px-2 text-xs text-muted-foreground"
              : "sr-only"
          }
          aria-live="polite"
        >
          {status}
        </p>
        <Button
          className="ml-auto"
          size="icon"
          aria-label="Enviar"
          disabled={!canSend}
          onClick={onSend}
        >
          <ArrowUp />
        </Button>
      </div>
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
