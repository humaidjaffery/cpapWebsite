import assert from "node:assert/strict";
import { test } from "node:test";

import {
  COMPARISON_PROMPT_VERSION,
  COMPARISON_RULES_VERSION,
  ComparisonCacheRecord,
  ComparisonSummary,
  getComparisonSummary,
  MaskSourceRecord,
} from "./comparison-summary";

function mask(slug: string, revision: string, score: number): MaskSourceRecord {
  return {
    revision,
    profile: {
      slug,
      name: slug === "mask-a" ? "Mask A" : "Mask B",
      search: { maskTypes: [slug === "mask-a" ? "Nasal" : "Full Face"] },
      coverage: { processedReviews: 100 },
      dimensions: [
        {
          id: "comfort",
          label: "Comfort",
          score,
          grade: score >= 80 ? "A-" : "B",
          reviewCount: 20,
          evidenceStrength: "moderate",
        },
      ],
      contexts: [],
      bodySites: [],
      parts:
        slug === "mask-a"
          ? [
              {
                id: "cushion",
                label: "Cushion",
                score: 85,
                grade: "A-",
                reviewCount: 20,
                evidenceStrength: "moderate",
                positiveShare: 0.8,
                reviewShare: 0.2,
              },
            ]
          : [],
      evidence: {
        positive: [{ text: "raw excerpt must not leave the server" }],
        negative: [],
      },
    },
    prices: {
      generatedAt: revision,
      offers: [],
    },
  };
}

const GENERATED_SUMMARY: ComparisonSummary = {
  decisionTakeaway: "Mask A has stronger comfort evidence, while Mask B has another fit style.",
  reasonsToPreferMask1: ["Higher comfort score"],
  reasonsToPreferMask2: ["Full-face coverage"],
  similarities: [],
  importantUncertainties: [],
};

function dependencies(records = new Map([
  ["mask-a", mask("mask-a", "revision-a", 85)],
  ["mask-b", mask("mask-b", "revision-b", 75)],
])) {
  const cache = new Map<string, ComparisonCacheRecord>();
  const generatedInputs: unknown[] = [];
  return {
    cache,
    generatedInputs,
    dependencies: {
      data: {
        getMask: async (slug: string) => {
          const record = records.get(slug);
          if (!record) throw new Error("not found");
          return record;
        },
      },
      cache: {
        get: async (key: string) => cache.get(key) ?? null,
        set: async (key: string, record: ComparisonCacheRecord) => {
          cache.set(key, record);
        },
      },
      openai: {
        generate: async (input: unknown) => {
          generatedInputs.push(input);
          return { summary: GENERATED_SUMMARY, responseId: "response-1" };
        },
      },
      now: () => "2026-08-28T12:00:00.000Z",
    },
  };
}

test("generates and caches a curated order-independent comparison", async () => {
  const harness = dependencies();

  const result = await getComparisonSummary(
    { mask1: "mask-a", mask2: "mask-b", comparisonRevision: COMPARISON_RULES_VERSION },
    harness.dependencies,
  );

  assert.equal(result.source, "generated");
  assert.deepEqual(result.summary, GENERATED_SUMMARY);
  assert.equal(harness.generatedInputs.length, 1);
  assert.equal(JSON.stringify(harness.generatedInputs[0]).includes("raw excerpt"), false);
  assert.equal(JSON.stringify(harness.generatedInputs[0]).includes("Cushion"), true);
  const cached = harness.cache.get("mask-a__mask-b");
  assert.deepEqual(cached?.canonicalMaskOrder, ["mask-a", "mask-b"]);
  assert.equal(cached?.promptVersion, COMPARISON_PROMPT_VERSION);
  assert.equal(cached?.rulesVersion, COMPARISON_RULES_VERSION);
  assert.equal(cached?.openaiResponseId, "response-1");
});

test("returns a valid cache hit without calling OpenAI", async () => {
  const harness = dependencies();
  await getComparisonSummary(
    { mask1: "mask-a", mask2: "mask-b", comparisonRevision: COMPARISON_RULES_VERSION },
    harness.dependencies,
  );

  const second = await getComparisonSummary(
    { mask1: "mask-a", mask2: "mask-b", comparisonRevision: COMPARISON_RULES_VERSION },
    harness.dependencies,
  );

  assert.equal(second.source, "cache");
  assert.equal(harness.generatedInputs.length, 1);
});

test("reuses the canonical cache for a reversed pair and preserves display order", async () => {
  const harness = dependencies();
  await getComparisonSummary(
    { mask1: "mask-a", mask2: "mask-b", comparisonRevision: COMPARISON_RULES_VERSION },
    harness.dependencies,
  );

  const reversed = await getComparisonSummary(
    { mask1: "mask-b", mask2: "mask-a", comparisonRevision: COMPARISON_RULES_VERSION },
    harness.dependencies,
  );

  assert.equal(reversed.source, "cache");
  assert.deepEqual(reversed.summary.reasonsToPreferMask1, GENERATED_SUMMARY.reasonsToPreferMask2);
  assert.deepEqual(reversed.summary.reasonsToPreferMask2, GENERATED_SUMMARY.reasonsToPreferMask1);
  assert.equal(harness.cache.size, 1);
});

test("rejects positional summary wording that would become stale when order reverses", async () => {
  const harness = dependencies();
  harness.dependencies.openai.generate = async () => ({
    summary: {
      ...GENERATED_SUMMARY,
      importantUncertainties: ["Mask 1 has limited evidence"],
    },
    responseId: "response-positional",
  });

  await assert.rejects(
    getComparisonSummary(
      { mask1: "mask-a", mask2: "mask-b", comparisonRevision: COMPARISON_RULES_VERSION },
      harness.dependencies,
    ),
    /structured comparison summary/,
  );
});

test("invalidates cache when curated data, prompt, or comparison rules change", async () => {
  const harness = dependencies();
  await getComparisonSummary(
    { mask1: "mask-a", mask2: "mask-b", comparisonRevision: COMPARISON_RULES_VERSION },
    harness.dependencies,
  );
  const original = harness.cache.get("mask-a__mask-b")!;

  harness.cache.set("mask-a__mask-b", { ...original, promptVersion: "old-prompt" });
  await getComparisonSummary(
    { mask1: "mask-a", mask2: "mask-b", comparisonRevision: COMPARISON_RULES_VERSION },
    harness.dependencies,
  );
  harness.cache.set("mask-a__mask-b", { ...original, rulesVersion: "old-rules" });
  await getComparisonSummary(
    { mask1: "mask-a", mask2: "mask-b", comparisonRevision: COMPARISON_RULES_VERSION },
    harness.dependencies,
  );

  const changedRecords = new Map([
    ["mask-a", mask("mask-a", "revision-a-2", 86)],
    ["mask-b", mask("mask-b", "revision-b", 75)],
  ]);
  const changed = dependencies(changedRecords);
  changed.cache.set("mask-a__mask-b", original);
  await getComparisonSummary(
    { mask1: "mask-a", mask2: "mask-b", comparisonRevision: COMPARISON_RULES_VERSION },
    changed.dependencies,
  );

  assert.equal(harness.generatedInputs.length, 3);
  assert.equal(changed.generatedInputs.length, 1);
});

test("invalidates cache when component review share changes without a source revision change", async () => {
  const harness = dependencies();
  await getComparisonSummary(
    { mask1: "mask-a", mask2: "mask-b", comparisonRevision: COMPARISON_RULES_VERSION },
    harness.dependencies,
  );
  const original = harness.cache.get("mask-a__mask-b")!;
  const changedMask = mask("mask-a", "revision-a", 85);
  changedMask.profile.parts[0].reviewShare = 0.9;
  const changed = dependencies(new Map([
    ["mask-a", changedMask],
    ["mask-b", mask("mask-b", "revision-b", 75)],
  ]));
  changed.cache.set("mask-a__mask-b", original);

  await getComparisonSummary(
    { mask1: "mask-a", mask2: "mask-b", comparisonRevision: COMPARISON_RULES_VERSION },
    changed.dependencies,
  );

  assert.equal(changed.generatedInputs.length, 1);
});

test("rejects malformed structured OpenAI output", async () => {
  const harness = dependencies();
  harness.dependencies.openai.generate = async () => ({
    summary: { ...GENERATED_SUMMARY, decisionTakeaway: "" },
    responseId: "response-2",
  });

  await assert.rejects(
    getComparisonSummary(
      { mask1: "mask-a", mask2: "mask-b", comparisonRevision: COMPARISON_RULES_VERSION },
      harness.dependencies,
    ),
    /structured comparison summary/,
  );
  assert.equal(harness.cache.size, 0);
});

test("propagates OpenAI failure without writing a cache record", async () => {
  const harness = dependencies();
  harness.dependencies.openai.generate = async () => {
    throw new Error("OpenAI unavailable");
  };

  await assert.rejects(
    getComparisonSummary(
      { mask1: "mask-a", mask2: "mask-b", comparisonRevision: COMPARISON_RULES_VERSION },
      harness.dependencies,
    ),
    /OpenAI unavailable/,
  );
  assert.equal(harness.cache.size, 0);
});

test("validates distinct stable mask slugs and the server-owned rules revision", async () => {
  const harness = dependencies();
  for (const request of [
    { mask1: "../mask", mask2: "mask-b", comparisonRevision: COMPARISON_RULES_VERSION },
    { mask1: "mask-a", mask2: "mask-a", comparisonRevision: COMPARISON_RULES_VERSION },
    { mask1: "mask-a", mask2: "mask-b", comparisonRevision: "client-rules" },
  ]) {
    await assert.rejects(getComparisonSummary(request, harness.dependencies), /Invalid comparison request/);
  }
});
