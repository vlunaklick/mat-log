import { z } from "zod";
import { jsonSchema } from "ai";
import { draftDataSchema, payloadSchema } from "./validation.ts";

export const coachOutputSchema = z.object({
  reply: z.string().min(1).max(16000),
  draft: z
    .object({
      targetId: z.string().nullable(),
      data: draftDataSchema,
      questions: z.array(z.string().max(1000)).max(5),
    })
    .nullable(),
  proposal: z
    .object({
      title: z.string().max(300),
      reason: z.string().max(4000),
      payload: payloadSchema,
    })
    .nullable(),
});

// Gemini rejects the nested bounded collections with INVALID_ARGUMENT.
// Keep size limits in local validation instead of Gemini's generation
// schema. Every response still passes all original limits and refinements.
const generationJsonSchema = z.toJSONSchema(coachOutputSchema, {
  override: ({ jsonSchema }) => {
    delete jsonSchema.maxItems;
    delete jsonSchema.minItems;
    delete jsonSchema.maxLength;
    delete jsonSchema.minLength;
  },
});
export const coachGenerationSchema = jsonSchema<z.infer<typeof coachOutputSchema>>(
  generationJsonSchema,
  {
    validate: (value) => {
      const result = coachOutputSchema.safeParse(value);
      return result.success
        ? { success: true, value: result.data }
        : { success: false, error: result.error };
    },
  },
);
