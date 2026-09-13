import { test } from "node:test";
import assert from "node:assert/strict";
import { APICallError, RetryError, generateText, Output, tool, stepCountIs } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { z } from "zod";
import { createFreeCoachFallback, withCoachFallback } from "../src/training/coach-fallback.ts";
import { coachGenerationSchema } from "../src/training/coach-output.ts";

const primary = createGoogleGenerativeAI({ apiKey: "test" })("gemini-3.5-flash");
const fallback = createFreeCoachFallback("test")!;
const reply = { reply: "Probá recuperar la guardia.", draft: null, proposal: null };
const apiError = (statusCode?: number) => new APICallError({
  message: "Provider failed", url: "https://example.com", requestBodyValues: {},
  statusCode, isRetryable: statusCode == null || statusCode === 429 || statusCode >= 500,
});

test("primary success never invokes fallback; empty key disables it", async () => {
  assert.equal(createFreeCoachFallback("  "), undefined);
  let calls = 0;
  assert.deepEqual(await withCoachFallback(async (model) => {
    calls++;
    assert.equal(model, primary);
    return reply;
  }, primary, fallback), reply);
  assert.equal(calls, 1);
});

for (const error of [apiError(429), apiError(503), apiError(), new DOMException("Timed out", "TimeoutError"),
  new RetryError({ message: "Retries failed", reason: "maxRetriesExceeded", errors: [apiError(429)] })]) {
  test(`fallback after ${error.name} ${"statusCode" in error ? error.statusCode : ""}`, async () => {
    const calls: unknown[] = [];
    const result = await withCoachFallback(async (model, signal) => {
      calls.push(model);
      assert.equal(signal.aborted, false);
      if (model === primary) throw error;
      return reply;
    }, primary, fallback);
    assert.deepEqual(result, reply);
    assert.deepEqual(calls, [primary, fallback]);
  });
}

for (const error of [apiError(400), apiError(401), new Error("Database failed"), new DOMException("Cancelled", "AbortError")]) {
  test(`does not hide non-transient failure: ${error.message} ${"statusCode" in error ? error.statusCode : error.name}`, async () => {
    let calls = 0;
    await assert.rejects(withCoachFallback(async () => { calls++; throw error; }, primary, fallback), (e) => e === error);
    assert.equal(calls, 1);
  });
}

test("absent or exhausted fallback propagates failure", async () => {
  const error = apiError(429);
  await assert.rejects(withCoachFallback(async () => { throw error; }, primary), (e) => e === error);
  let calls = 0;
  await assert.rejects(withCoachFallback(async () => { calls++; throw error; }, primary, fallback), (e) => e === error);
  assert.equal(calls, 2);
});

test("keeps the original timeout without fallback and budgets both attempts when enabled", async (t) => {
  const deadlines: number[] = [];
  t.mock.method(AbortSignal, "timeout", (ms: number) => {
    deadlines.push(ms);
    return new AbortController().signal;
  });
  await withCoachFallback(async () => reply, primary);
  await withCoachFallback(async (model) => {
    if (model === primary) throw apiError(429);
    return reply;
  }, primary, fallback);
  assert.deepEqual(deadlines, [120000, 60000, 60000]);
});

test("invalid fallback output is rejected by the real Coach schema", async () => {
  const router = createFreeCoachFallback("test", async () => Response.json({
    id: "test", object: "chat.completion", created: 1, model: "free-model",
    choices: [{ index: 0, finish_reason: "stop", message: { role: "assistant", content: JSON.stringify({ ...reply, reply: "" }) } }],
    usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
  }));
  await assert.rejects(withCoachFallback(async (model, abortSignal) => {
    if (model === primary) throw apiError(429);
    const result = await generateText({ model, abortSignal, maxRetries: 0,
      output: Output.object({ schema: coachGenerationSchema }), prompt: "Un objetivo para gi",
    });
    return result.output;
  }, primary, router), /response did not match schema/);
});

test("actual Gemini 429 falls back to free OpenRouter with tools and validated output", async () => {
  let googleCalls = 0, routerCalls = 0, toolCalls = 0;
  const google = createGoogleGenerativeAI({ apiKey: "test", fetch: async () => {
    googleCalls++;
    return Response.json({ error: { code: 429, message: "Quota exceeded", status: "RESOURCE_EXHAUSTED" } }, { status: 429 });
  } })("gemini-3.5-flash");
  const router = createFreeCoachFallback("test", async (_url, init) => {
    routerCalls++;
    const body = JSON.parse(String(init?.body));
    assert.equal(body.model, "openrouter/free");
    assert.equal(body.provider.require_parameters, true);
    assert.equal(body.response_format.type, "json_schema");
    assert.equal(body.tools[0].function.name, "searchHistory");
    if (routerCalls === 2) assert.ok(JSON.stringify(body.messages).includes("confirmed history"));
    return Response.json({ id: "test", object: "chat.completion", created: 1, model: "free-model",
      choices: [{ index: 0, finish_reason: routerCalls === 1 ? "tool_calls" : "stop", message: routerCalls === 1
        ? { role: "assistant", content: null, tool_calls: [{ id: "call-1", type: "function", function: { name: "searchHistory", arguments: "{}" } }] }
        : { role: "assistant", content: JSON.stringify(reply) } }],
      usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
    });
  });
  const result = await withCoachFallback(async (model, abortSignal) => {
    const result = await generateText({ model, abortSignal, maxRetries: 0,
      output: Output.object({ schema: coachGenerationSchema }), prompt: "Un objetivo para gi",
      stopWhen: stepCountIs(3), tools: { searchHistory: tool({ inputSchema: z.object({}), execute: async () => { toolCalls++; return "confirmed history"; } }) },
    });
    return result.output;
  }, google, router);
  assert.deepEqual(result, reply);
  assert.equal(googleCalls, 1);
  assert.equal(routerCalls, 2);
  assert.equal(toolCalls, 1);
});
