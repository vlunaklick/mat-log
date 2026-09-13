import { test } from "node:test";
import assert from "node:assert/strict";
import { generateText, Output } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { coachGenerationSchema } from "../src/training/coach-output.ts";

function modelReturning(output: unknown) {
  return createGoogleGenerativeAI({
    apiKey: "test-key",
    fetch: async (_url, init) => {
      const body = JSON.parse(String(init?.body));
      // Gemini rejects the deeply nested bounded arrays in the coach schema.
      for (const bound of ["maxItems", "minItems", "maxLength", "minLength"]) {
        assert.ok(!JSON.stringify(body.generationConfig.responseSchema).includes(`"${bound}"`));
      }
      return new Response(
        JSON.stringify({
          candidates: [{
            content: { role: "model", parts: [{ text: JSON.stringify(output) }] },
            finishReason: "STOP",
          }],
          usageMetadata: {
            promptTokenCount: 1, candidatesTokenCount: 1, totalTokenCount: 2,
          },
        }),
        { headers: { "content-type": "application/json" } },
      );
    },
  })("gemini-3.5-flash");
}

test("coach provider request avoids nested array bounds and returns a reply", async () => {
  const expected = { reply: "¿Cuándo empezaste BJJ?", draft: null, proposal: null };
  const result = await generateText({
    model: modelReturning(expected),
    output: Output.object({ schema: coachGenerationSchema }),
    prompt: "Ayudame a completar mi perfil",
    maxRetries: 0,
  });
  assert.deepEqual(result.output, expected);
});

test("coach still rejects oversized collections in model output", async () => {
  const invalid = {
    reply: "Clase registrada",
    proposal: null,
    draft: {
      targetId: null,
      questions: Array(6).fill("¿Cuándo?"),
      data: {
        date: null, style: null, durationMin: null, energy: null,
        classTopic: "", whatWorked: "", whatFailed: "", nextFocus: "",
        goalNotes: "", rolls: [], techniques: [],
      },
    },
  };
  await assert.rejects(
    generateText({
      model: modelReturning(invalid),
      output: Output.object({ schema: coachGenerationSchema }),
      prompt: "Hoy entrené",
      maxRetries: 0,
    }),
    /response did not match schema/,
  );
});
