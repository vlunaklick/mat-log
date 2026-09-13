import { APICallError, RetryError, type LanguageModel } from "ai";
import { createOpenRouter, type OpenRouterProviderSettings } from "@openrouter/ai-sdk-provider";

export function createFreeCoachFallback(
  apiKey?: string,
  fetch?: OpenRouterProviderSettings["fetch"],
): LanguageModel | undefined {
  if (!apiKey?.trim()) return undefined;
  return createOpenRouter({ apiKey: apiKey.trim(), fetch }).chat("openrouter/free", {
    provider: { require_parameters: true },
    structuredOutputs: { strict: false },
  });
}

function isTransientProviderError(error: unknown): boolean {
  if (RetryError.isInstance(error)) return isTransientProviderError(error.lastError);
  if (APICallError.isInstance(error)) {
    return error.statusCode === 408 || error.statusCode === 429 ||
      (error.statusCode != null && error.statusCode >= 500) ||
      (error.statusCode == null && error.isRetryable);
  }
  return error instanceof Error && error.name === "TimeoutError";
}

// Only generation may be replayed. Callers must keep writes outside this callback.
export async function withCoachFallback<T>(
  generate: (model: LanguageModel, signal: AbortSignal) => Promise<T>,
  primary: LanguageModel,
  fallback?: LanguageModel,
): Promise<T> {
  try {
    return await generate(primary, AbortSignal.timeout(fallback ? 60000 : 120000));
  } catch (error) {
    if (!fallback || !isTransientProviderError(error)) throw error;
    console.warn("Coach primary provider unavailable; trying free fallback.");
    return generate(fallback, AbortSignal.timeout(60000));
  }
}
