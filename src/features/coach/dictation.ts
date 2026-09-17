export interface DictationResult {
  readonly isFinal: boolean;
  readonly [index: number]: { readonly transcript: string };
}

export interface DictationRecognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: { resultIndex: number; results: ArrayLike<DictationResult> }) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
}

export function bindDictation(
  recognition: DictationRecognition,
  callbacks: {
    preview: (text: string) => void;
    finish: (text: string) => void;
    error: (message: string) => void;
  },
) {
  let text = "";
  let active = true;
  function finish() {
    if (!active) return;
    active = false;
    callbacks.finish(text.trim());
  }
  recognition.onresult = (event) => {
    if (!active) return;
    text = Array.from(event.results, (result) => result[0].transcript.trim())
      .filter(Boolean)
      .join(" ");
    callbacks.preview(text);
  };
  recognition.onend = finish;
  recognition.onerror = (event) => {
    if (!active) return;
    if (event.error !== "no-speech" && event.error !== "aborted") {
      callbacks.error(event.error === "not-allowed"
        ? "Permití el micrófono para este sitio en los ajustes del navegador."
        : "El dictado se interrumpió. Conservamos el texto recibido; podés editarlo o grabar un audio.");
    }
    finish();
  };
  return () => {
    active = false;
    recognition.onresult = null;
    recognition.onerror = null;
    recognition.onend = null;
  };
}
