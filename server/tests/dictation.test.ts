import { test } from "node:test";
import assert from "node:assert/strict";
import { bindDictation, type DictationRecognition } from "../../src/features/coach/dictation.ts";

function fixture() {
  const recognition: DictationRecognition = {
    lang: "es-AR", continuous: true, interimResults: true,
    start() {}, stop() {}, abort() {}, onresult: null, onend: null, onerror: null,
  };
  const previews: string[] = [], finished: string[] = [], errors: string[] = [];
  const dispose = bindDictation(recognition, {
    preview: (text) => previews.push(text),
    finish: (text) => finished.push(text),
    error: (text) => errors.push(text),
  });
  const result = (chunks: Array<[string, boolean]>, resultIndex = 0) => recognition.onresult?.({
    resultIndex,
    results: chunks.map(([transcript, isFinal]) => ({ isFinal, 0: { transcript } })),
  });
  return { recognition, previews, finished, errors, dispose, result };
}

test("replayed final results replace the snapshot instead of appending", () => {
  const f = fixture();
  for (let i = 0; i < 5; i++) f.result([["Hoy entrené", true]]);
  f.result([["Hoy entrené", true], ["media guardia", false]], 1);
  f.result([["Hoy entrené", true], ["media guardia", true]]);
  f.recognition.onend?.();
  assert.deepEqual(f.previews.slice(0, 5), Array(5).fill("Hoy entrené"));
  assert.deepEqual(f.finished, ["Hoy entrené media guardia"]);
});

test("interim revisions replace prior words and removed interim results disappear", () => {
  const f = fixture();
  f.result([["Practiqué", true], ["media", false]]);
  f.result([["Practiqué", true], ["media guardia", false]], 1);
  f.result([["Practiqué", true]], 1);
  assert.deepEqual(f.previews, ["Practiqué media", "Practiqué media guardia", "Practiqué"]);
});

test("stop preserves the latest preview even if the browser never marks it final", () => {
  const f = fixture();
  f.result([["Hoy entrené", false]]);
  f.recognition.onend?.();
  f.recognition.onend?.();
  f.result([["Late text", true]]);
  assert.deepEqual(f.finished, ["Hoy entrené"]);
  assert.deepEqual(f.previews, ["Hoy entrené"]);
});

test("intentional repeated words and separate identical results are preserved", () => {
  const f = fixture();
  f.result([["no no", true], ["no no", true]]);
  f.recognition.onend?.();
  assert.deepEqual(f.finished, ["no no no no"]);
});

test("an error followed by end commits received text only once", () => {
  const f = fixture();
  f.result([["Mi nota", false]]);
  f.recognition.onerror?.({ error: "network" });
  f.recognition.onend?.();
  assert.equal(f.errors.length, 1);
  assert.deepEqual(f.finished, ["Mi nota"]);
});

test("disposing a session ignores queued callbacks and does not affect a new session", () => {
  const f = fixture();
  const lateResult = f.recognition.onresult;
  const lateEnd = f.recognition.onend;
  f.dispose();
  lateResult?.({ resultIndex: 0, results: [{ isFinal: true, 0: { transcript: "old" } }] });
  lateEnd?.();
  assert.deepEqual(f.previews, []);
  assert.deepEqual(f.finished, []);
  const next = fixture();
  next.result([["Nueva nota", true]]);
  next.recognition.onend?.();
  assert.deepEqual(next.finished, ["Nueva nota"]);
});
