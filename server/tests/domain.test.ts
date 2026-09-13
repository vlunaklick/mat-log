import { test } from "node:test";
import assert from "node:assert/strict";
import {
  EMPTY_PROFILE,
  trainingDays,
  practiceTotals,
} from "../../src/lib/training.ts";
import {
  dateSchema,
  draftDataSchema,
  gameplanSchema,
} from "../src/training/validation.ts";
import { searchCatalog, catalog } from "../src/training/catalog.ts";
test("overlapping and ongoing pauses counted once within training interval", () => {
  assert.deepEqual(
    trainingDays(
      {
        ...EMPTY_PROFILE,
        startedOn: "2026-01-01",
        breaks: [
          { start: "2025-12-01", end: "2026-01-04", reason: "" },
          { start: "2026-01-03", end: "2026-01-06", reason: "" },
          { start: "2026-01-09", end: null, reason: "" },
        ],
      },
      "2026-01-11",
    ),
    { elapsed: 10, paused: 7, active: 3 },
  );
  assert.equal(trainingDays(EMPTY_PROFILE, "2026-01-11"), null);
});
test("unknown attempts never fabricate a success rate", () => {
  assert.equal(
    practiceTotals([
      {
        techniqueId: 1,
        stage: "applied",
        attempts: null,
        successes: 1,
        notes: "",
      },
    ]).rate,
    null,
  );
  assert.equal(
    practiceTotals([
      {
        techniqueId: 1,
        stage: "practiced",
        attempts: 4,
        successes: 1,
        notes: "",
      },
    ]).rate,
    0.25,
  );
});
test("calendar dates and graph references are validated", () => {
  assert.equal(dateSchema.safeParse("2026-02-30").success, false);
  assert.equal(
    gameplanSchema.safeParse({
      style: "gi",
      title: "",
      intention: "",
      assessment: "",
      nodes: [
        {
          id: "a",
          position: "Mount",
          action: "",
          opponentResponse: "",
          next: ["missing"],
          status: "suggested",
          techniqueId: null,
          caution: "",
        },
      ],
    }).success,
    false,
  );
});
test("partial draft explicitly preserves unknown values", () => {
  const d = {
    date: null,
    style: null,
    durationMin: null,
    energy: null,
    classTopic: "",
    whatWorked: "",
    whatFailed: "",
    nextFocus: "",
    goalNotes: "",
    rolls: [],
    techniques: [],
  };
  assert.deepEqual(draftDataSchema.parse(d), d);
});
test("catalog contains sourced records and supports aliases and gi filtering", () => {
  assert.ok(catalog.length > 1700);
  assert.ok(
    searchCatalog("shrimp").entries.some((e) => e.name.includes("camarón")),
  );
  assert.ok(
    searchCatalog("", "gi", "all", 0, 2000).entries.every(
      (e) => e.style !== "nogi",
    ),
  );
  assert.ok(catalog.every((e) => e.sourceUrl.startsWith("https://")));
});
