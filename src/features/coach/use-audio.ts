import { useEffect, useRef, useState } from "react";
const MAX_BYTES = 15 * 1024 * 1024;

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event & { error?: string }) => void) | null;
  onend: (() => void) | null;
};

/** Chrome/Edge/Safari ship dictation under vendor prefixes; TypeScript only knows the DOM stub. */
function getDictation(): (new () => SpeechRecognitionLike) | null {
  const w = window as unknown as Record<string, unknown>;
  const ctor = (w.SpeechRecognition ?? w.webkitSpeechRecognition) as
    | (new () => SpeechRecognitionLike)
    | undefined;
  return ctor ?? null;
}

/** Own the browser microphone lifecycle, including navigation, permission errors and recording limits. */
export function useAudio(onText: (text: string) => void) {
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recognition = useRef<SpeechRecognitionLike | null>(null);
  const dictationBase = useRef("");
  const mounted = useRef(true);
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audio, setAudio] = useState<Blob | null>(null);
  const [live, setLive] = useState<string | null>(null);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      try {
        recognition.current?.stop();
      } catch {
        /* already stopped */
      }
      if (recorder.current?.state === "recording") recorder.current.stop();
      stream.current?.getTracks().forEach((t) => t.stop());
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);
  async function transcribe(blob: Blob) {
    setError(null);
    setAudio(blob);
    if (!blob.size || blob.size > MAX_BYTES) {
      setError("Usá un audio de hasta 15 MB.");
      return;
    }
    setBusy(true);
    try {
      const form = new FormData();
      form.append("audio", blob, "training-audio");
      const response = await fetch("/api/audio", {
        method: "POST",
        credentials: "include",
        body: form,
        signal: AbortSignal.timeout(100000),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error ?? "No pudimos transcribir el audio.");
      if (mounted.current) onText(data.text);
    } catch (e) {
      if (mounted.current) setError(e instanceof Error ? e.message : String(e));
    } finally {
      if (mounted.current) setBusy(false);
    }
  }
  async function start() {
    setError(null);
    setBusy(true);
    try {
      if (
        !navigator.mediaDevices?.getUserMedia ||
        typeof MediaRecorder === "undefined"
      )
        throw new Error(
          "Este navegador no permite grabar. Podés adjuntar un audio o escribir.",
        );
      const Dictation = getDictation();
      if (Dictation) {
        const rec = new Dictation();
        rec.lang = navigator.language || "es-AR";
        rec.continuous = true;
        rec.interimResults = true;
        dictationBase.current = "";
        rec.onresult = (event) => {
          let final = "",
            interim = "";
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const chunk = event.results[i][0].transcript;
            if (event.results[i].isFinal) final += chunk;
            else interim += chunk;
          }
          if (final) dictationBase.current = `${dictationBase.current}${final} `;
          if (mounted.current)
            setLive(
              `${dictationBase.current}${interim}`.trimStart() || null,
            );
        };
        rec.onerror = (event) => {
          if (event.error === "no-speech" || event.error === "aborted") return;
          setError(
            event.error === "not-allowed"
              ? "No dimos permiso al micrófono. Activalo para el sitio."
              : "El dictado se interrumpió. Probá de nuevo.",
          );
          setRecording(false);
          setLive(null);
        };
        rec.onend = () => {
          if (mounted.current && recognition.current === rec) {
            setRecording(false);
            setLive(null);
            const text = dictationBase.current.trim();
            dictationBase.current = "";
            if (text) onText(text);
          }
        };
        recognition.current = rec;
        rec.start();
        setRecording(true);
        return;
      }
      const media = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!mounted.current) {
        media.getTracks().forEach((t) => t.stop());
        return;
      }
      stream.current = media;
      const mimeType = [
        "audio/webm;codecs=opus",
        "audio/mp4",
        "audio/ogg;codecs=opus",
      ].find((t) => MediaRecorder.isTypeSupported(t));
      const rec = new MediaRecorder(media, mimeType ? { mimeType } : undefined);
      recorder.current = rec;
      const chunks: Blob[] = [];
      let bytes = 0;
      rec.ondataavailable = (e) => {
        if (e.data.size) {
          chunks.push(e.data);
          bytes += e.data.size;
          if (bytes > MAX_BYTES && rec.state === "recording") rec.stop();
        }
      };
      rec.onstop = () => {
        media.getTracks().forEach((t) => t.stop());
        if (timer.current) clearTimeout(timer.current);
        if (mounted.current) {
          setRecording(false);
          void transcribe(new Blob(chunks, { type: rec.mimeType }));
        }
      };
      rec.onerror = () => {
        media.getTracks().forEach((t) => t.stop());
        setError("La grabación se interrumpió.");
        setRecording(false);
      };
      rec.start(1000);
      setRecording(true);
      timer.current = setTimeout(
        () => {
          if (rec.state === "recording") rec.stop();
        },
        5 * 60 * 1000,
      );
    } catch (e) {
      stream.current?.getTracks().forEach((t) => t.stop());
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      if (mounted.current) setBusy(false);
    }
  }
  function stop() {
    if (recognition.current) {
      try {
        recognition.current.stop();
      } catch {
        /* already stopped */
      }
      return;
    }
    recorder.current?.stop();
  }
  return {
    recording,
    busy,
    error,
    live,
    dictation: !!getDictation(),
    start,
    stop,
    transcribe,
    retry: audio ? () => transcribe(audio) : null,
  };
}
